const express = require('express');
const axios = require('axios');
const { intelligentPreprocess } = require('../lib/intelligentPreprocessor');
const { classifyIntent, classifyIntentAndSelectTools } = require('../lib/intentClassifier');
const { selectTools } = require('../lib/toolSelector');
const { executeTools, executeSingleTool } = require('../lib/toolExecutor');
const { generateResponse } = require('../lib/responseGenerator');
const { handleStepFailure, handleToolFailures } = require('../lib/errorHandler');
const { checkForStopRequest } = require('../lib/utils');
const { broadcastStatus, broadcastToolUpdate } = require('./status');

const router = express.Router();

// LLM-based screenshot analysis for intelligent context extraction
const OpenAI = require('openai');

// Initialize OpenAI for screenshot analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeScreenshotWithLLM(screenshotData, userMessage) {
  console.log('🧠 Analyzing screenshot with LLM for intelligent context extraction...');
  const startTime = Date.now();
  
  try {
    // Prepare the screenshot for LLM analysis
    const imageUrl = `data:image/png;base64,${screenshotData}`;
    
    // Create intelligent analysis prompt based on user message
    const analysisPrompt = `You are an intelligent screenshot analyzer. Analyze this screenshot and extract the most relevant information for the user's request: "${userMessage}"

ANALYSIS GOALS:
1. **Context-Aware Extraction**: Focus on information that relates to the user's request
2. **Structured Information**: Organize content logically (events, data, UI elements, etc.)
3. **Actionable Details**: Extract specific details that can be used for actions (dates, times, names, etc.)
4. **Layout Understanding**: Understand the visual layout and relationships between elements

EXTRACTION PRIORITIES:
- If user mentions "events", focus on event titles, dates, times, locations
- If user mentions "contacts", focus on names, emails, phone numbers  
- If user mentions "data/information", focus on structured data, tables, lists
- If user mentions "text", provide clean, organized text content
- Always include UI context (what app/website, navigation elements, etc.)

FORMATTING RULES:
- Use clear headers and sections
- Preserve important relationships and hierarchy
- Include specific details (dates, times, numbers, names)
- Mention the source/context (what application, webpage, etc.)
- Focus on actionable information over decorative elements

Provide a comprehensive but focused analysis of what you see in the screenshot.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 with vision capabilities
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: analysisPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high' // High detail for better analysis
            }
          }
        ]
      }],
      max_tokens: 1500,
      temperature: 0.1 // Low temperature for consistent, factual analysis
    });

    const analysis = completion.choices[0]?.message?.content;
    
    if (!analysis || analysis.trim().length === 0) {
      throw new Error('LLM analysis returned no content');
    }

    const duration = Date.now() - startTime;
    console.log(`🧠 LLM analysis completed in ${duration}ms, extracted content length:`, analysis.length);
    console.log('🧠 Analysis sample:', analysis.substring(0, 300) + '...');
    
    return `INTELLIGENT SCREENSHOT ANALYSIS:\n${analysis}`;
    
  } catch (error) {
    console.error('❌ Failed to analyze screenshot with LLM:', error);
    
    // Fallback: provide basic screenshot confirmation
    return 'Screenshot was captured but intelligent analysis failed. The image contains visual content that could not be processed.';
  }
}

// No cleanup needed for LLM-based analysis

// Handle retry requests from failure point
async function handleRetryRequest(req, res, clarificationMessage, retryContext) {
  console.log('🔄 Processing retry request...');
  console.log('📋 Retry context:', retryContext);
  
  try {
    const { type = 'text', model = 'gpt-3.5-turbo' } = req.body;
    
    // Extract original context
    const { 
      originalMessage, 
      toolSelection, 
      context, 
      failedTools, 
      completedTools = [],
      retryFromPoint 
    } = retryContext;

    if (retryFromPoint === 'tool_execution') {
      console.log('🔄 Retrying from tool execution point...');
      console.log(`📋 Original message: ${originalMessage}`);
      console.log(`📋 Clarification: ${clarificationMessage}`);
      console.log(`🔧 Failed tools: ${failedTools.join(', ')}`);
      
      // Combine original message with clarification
      const enhancedMessage = `${originalMessage}\n\nClarification: ${clarificationMessage}`;
      
      // Retry tool execution with enhanced message
      const toolResults = await executeTools(
        toolSelection.tools, 
        enhancedMessage, 
        toolSelection, 
        context
      );
      
      // Handle results same as normal execution
      const confirmationTools = toolResults.filter(result => result.requiresConfirmation);
      const newFailedTools = toolResults.filter(result => !result.success && !result.requiresConfirmation);
      
      // Handle confirmation requests
      if (confirmationTools.length > 0) {
        const firstConfirmationTool = confirmationTools[0];
        
        const response = {
          success: true,
          response: "Please review and confirm the following action:",
          model: model,
          analysis: {
            intent: toolSelection.intent,
            toolsUsed: true,
            tools: toolSelection.tools,
            toolResults: [firstConfirmationTool],
            pendingConfirmations: confirmationTools.length - 1,
            allTools: toolResults,
            retryAttempt: true
          }
        };

        console.log('✅ Retry confirmation request prepared\n');
        return res.status(200).json(response);
      }
      
      // Handle new failures
      if (newFailedTools.length > 0) {
        return await handleToolFailures(res, newFailedTools, enhancedMessage, context, toolSelection);
      }
      
      // Success - generate response
      console.log('✅ Retry successful, generating response...');
      const finalResponse = await generateResponse(enhancedMessage, toolSelection.intent, toolResults, originalMessage, toolSelection);

      const response = {
        success: true,
        response: finalResponse,
        model: model,
        analysis: {
          intent: toolSelection.intent,
          toolsUsed: true,
          tools: toolSelection.tools,
          toolResults: toolResults,
          retryAttempt: true,
          preprocessing: {
            originalMessage: originalMessage,
            clarification: clarificationMessage,
            context: context ? 'Context available' : 'No context'
          }
        }
      };

      console.log('✅ Retry processing complete\n');
      return res.status(200).json(response);
    }
    
    // Other retry points can be added here
    throw new Error(`Unsupported retry point: ${retryFromPoint}`);
    
  } catch (error) {
    console.error('❌ Retry processing failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Retry processing failed: ' + error.message,
      retryFailed: true
    });
  }
}

// Simple request deduplication to prevent multiple processing of same request
const activeRequests = new Map(); // messageHash -> timestamp
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Main intelligent chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, type, model = 'gpt-3.5-turbo', retryContext } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Skip deduplication for retry requests
    if (!retryContext) {
      // Create a hash of the message to detect duplicates
      const crypto = require('crypto');
      const messageHash = crypto.createHash('md5').update(message).digest('hex');
      
      // Check if this request is already being processed
      if (activeRequests.has(messageHash)) {
        const startTime = activeRequests.get(messageHash);
        const elapsed = Date.now() - startTime;
        
        if (elapsed < REQUEST_TIMEOUT) {
          console.log(`🚫 Duplicate request detected, ignoring: ${messageHash} (${elapsed}ms ago)`);
          return res.status(429).json({
            success: false,
            error: 'Request already in progress, please wait',
            duplicate: true
          });
        } else {
          // Request timed out, remove it
          activeRequests.delete(messageHash);
        }
      }
      
      // Mark this request as active
      activeRequests.set(messageHash, Date.now());
      console.log(`🔒 Processing new request: ${messageHash}`);
      
      // Clean up old requests periodically
      if (activeRequests.size > 100) {
        const now = Date.now();
        for (const [hash, timestamp] of activeRequests.entries()) {
          if (now - timestamp > REQUEST_TIMEOUT) {
            activeRequests.delete(hash);
          }
        }
      }
    }

    // Handle retry requests
    if (retryContext) {
      console.log('🔄 Retry request detected, resuming from failure point...');
      return await handleRetryRequest(req, res, message, retryContext);
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Clean up active request
      if (!retryContext) {
        const crypto = require('crypto');
        const messageHash = crypto.createHash('md5').update(message).digest('hex');
        activeRequests.delete(messageHash);
      }
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.'
      });
    }

    let messageHash;
    if (!retryContext) {
      const crypto = require('crypto');
      messageHash = crypto.createHash('md5').update(message).digest('hex');
    }

    try {

    // Handle audio input (placeholder for future implementation)
    if (type === 'audio') {
      return res.status(501).json({
        success: false,
        error: 'Audio processing not implemented yet. This will be added in a future update.',
        message: 'Audio processing feature coming soon!'
      });
    }

    // Handle text input with pure LLM-driven intelligent processing
    if (type === 'text') {
      console.log('\n🧠 Starting pure LLM-driven intelligent processing for:', message);

      // STEP 0: CONTEXT CAPTURE - CRITICAL FIRST STEP
      let contextFromUser = '';
      try {
              console.log('📋 Step 0: Context capture - checking for selected text...');
      broadcastStatus('analyzing_context', 'Analyzing context...');
      console.log('🚨 IMMEDIATE: Just broadcasted analyzing_context at', new Date().toISOString());
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        // First try to get selected text
        const clipboardResponse = await axios.post(`${frontendUrl}/api/tools`, {
          tool: 'copy_selected_text_to_clipboard',
          inputs: {}
        }, {
          validateStatus: function (status) {
            return true; // Don't throw errors for any status code
          }
        });

        let hasValidTextContext = false;
        
        
        
        // If no valid text context, try screenshot
        if (!hasValidTextContext) {
          console.log('📷 No valid selected text found - taking screenshot for visual context...');
          broadcastStatus('analyzing_context', 'Analyzing context...');
          
          // Take screenshot when no text is selected
          const screenshotResponse = await axios.post(`${frontendUrl}/api/tools`, {
            tool: 'take_screenshot',
            inputs: {}
          }, {
            validateStatus: function (status) {
              return true;
            }
          });

          if (screenshotResponse.data.success && screenshotResponse.data.result) {
            console.log('📷 Screenshot captured, analyzing with LLM...');
            
            // Process screenshot with LLM to extract intelligent context
            contextFromUser = await analyzeScreenshotWithLLM(screenshotResponse.data.result, message);
            console.log('✅ Intelligent context extracted from screenshot');
          } else {
            console.log('❌ Screenshot capture failed, proceeding without visual context');
            contextFromUser = '';
          }
        }
      } catch (error) {
        console.log('⚠️ Context capture failed:', error.message);
        contextFromUser = '';
      }

      // Limit context length to stay under 1 cent per request
              if (contextFromUser && contextFromUser.length > 15000) {
          console.log(`📏 Context too long (${contextFromUser.length} chars), truncating to 15000 chars`);
          contextFromUser = contextFromUser.substring(0, 15000) + '...[truncated]';
      }

      // Step 1: Dynamic LLM-driven preprocessing with context
      let processedMessage = message;
      broadcastStatus('analyzing_prompt', 'Analyzing prompt...');
      try {
        processedMessage = await intelligentPreprocess(message, contextFromUser);
        console.log('🚀 Dynamic preprocessing completed with context:', processedMessage);
      } catch (preprocessError) {
        console.log('⚠️ Preprocessing failed, using original message:', preprocessError.message);
        processedMessage = message;
      }
      
      let context = {
        originalMessage: message,
        processedMessage: processedMessage,
        contextFromUser: contextFromUser,
        step: 2,
        attempts: {}
      };

      try {
        let intent, toolSelection, toolResults = [];

        // FAST PATH: Single Tool Workflow Detection (with OCR if needed)
        // Use the refactored message which already has context embedded for consistency
        const singleToolResult = await tryFastSingleToolWorkflow(message, processedMessage, contextFromUser);
        if (singleToolResult.handled) {
          console.log('🚀 Used fast single-tool workflow:', singleToolResult.toolName);
          
          if (singleToolResult.requiresConfirmation) {
            return res.json({
              success: true,
              response: singleToolResult.response,
              requiresConfirmation: true,
              confirmationData: singleToolResult.confirmationData,
              toolResults: [singleToolResult]
            });
          } else {
            return res.json({
              success: true,
              response: singleToolResult.response,
              toolResults: [singleToolResult],
              intent: 'system_action',
              executionPlan: { type: 'single', tool: singleToolResult.toolName }
            });
          }
        }

        // Step 2: Pure LLM-driven intent classification and tool selection
        if (!context.intent || !context.toolSelection) {
          console.log('Step 2: Pure LLM-driven intent classification and tool selection...');
          try {
            const combined = await classifyIntentAndSelectTools(processedMessage, contextFromUser);
            intent = combined.intent;
            toolSelection = combined;
            console.log('🧠 LLM Intent Analysis:', intent);
            console.log('🧠 LLM Tool Selection:', toolSelection);
            context.intent = intent;
            context.toolSelection = toolSelection;
      
            // Log execution plan details
            if (toolSelection.executionPlan && toolSelection.executionPlan.type !== 'single') {
              console.log(`🔀 LLM detected ${toolSelection.executionPlan.type} execution pattern`);
              if (toolSelection.multipleTasks) {
                console.log('📋 Tasks identified:');
                toolSelection.multipleTasks.forEach((task, i) => {
                  console.log(`   ${i + 1}. ${task}`);
                });
              }
            }
          } catch (error) {
            return await handleStepFailure(res, error, 'classify_intent_and_select_tools', processedMessage, context, 2);
          }
        } else {
          intent = context.intent;
          toolSelection = context.toolSelection;
          console.log('Using cached intent and tool selection:', intent, toolSelection);
        }

        // Step 3: Execute tools with pure LLM-driven variable extraction
        console.log('Step 3: Executing tools with pure LLM-driven variable extraction...');
        broadcastStatus('executing_tools', 'Executing tools...');
        
        toolResults = await executeTools(
          toolSelection.tools, 
          processedMessage, // Pass refined message with embedded context
          toolSelection, 
          contextFromUser
        );

        // Separate confirmation requests from actual failures
        const confirmationTools = toolResults.filter(result => result.requiresConfirmation);
        const failedTools = toolResults.filter(result => !result.success && !result.requiresConfirmation);
        
        // Handle confirmation requests (prioritize over failures)
        if (confirmationTools.length > 0) {
          console.log('🔒 Tools require confirmation:', confirmationTools.map(t => t.tool));
          
          // Only show the FIRST confirmation tool (sequential confirmations)
          const firstConfirmationTool = confirmationTools[0];
          console.log(`🔒 Showing confirmation for: ${firstConfirmationTool.tool}`);
          
          const response = {
            success: true,
            response: "Please review and confirm the following action:",
            model: model,
            analysis: {
              intent: intent,
              toolsUsed: true,
              tools: toolSelection.tools,
              toolResults: [firstConfirmationTool], // Only send the first confirmation
              pendingConfirmations: confirmationTools.length - 1, // How many more after this one
              allTools: toolResults // Keep all results for context
            }
          };

          console.log('✅ Sequential confirmation request prepared\n');
          return res.status(200).json(response);
        }
        
        // Check for actual tool failures (after handling confirmations)
        if (failedTools.length > 0) {
          return await handleToolFailures(res, failedTools, message, context, toolSelection);
        }
        
      } catch (error) {
        console.error('General error in LLM-driven processing:', error);
        return await handleStepFailure(res, error, 'general_processing', processedMessage, context, 0);
      }
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid request type. Supported types: text, audio'
    });

    } finally {
      // Clean up active request
      if (!retryContext && messageHash) {
        activeRequests.delete(messageHash);
        console.log(`🔓 Request completed: ${messageHash}`);
      }
    }
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Clean up active request on error
    if (!retryContext && messageHash) {
      activeRequests.delete(messageHash);
      console.log(`🔓 Request failed, cleaned up: ${messageHash}`);
    }
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid OpenAI API key. Please check your API key configuration.'
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again in a moment.'
      });
    }
    
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Bad request to OpenAI API'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing your request'
    });
  }
});

// Clarification handler endpoint
router.post('/chat/clarify', async (req, res) => {
  try {
    const { clarification, conversationId, context, originalMessage } = req.body;
    
    if (!clarification || !context) {
      return res.status(400).json({
        success: false,
        error: 'Clarification and context are required'
      });
    }
    
    console.log(`🔄 Handling clarification for conversation ${conversationId}:`);
    console.log(`User clarification: "${clarification}"`);
    console.log(`Original message: "${originalMessage}"`);
    
    // Check if user wants to stop
    const wantsToStop = checkForStopRequest(clarification);
    
    if (wantsToStop) {
      return res.status(200).json({
        success: true,
        response: "Understood! I've stopped processing your request. Let me know if you'd like to try something else.",
        stopped: true
      });
    }
    
    // Combine original message with clarification for retry
    const enhancedMessage = `${originalMessage}\n\nAdditional clarification: ${clarification}`;
    
    // Retry the process with the enhanced message and existing context
    const retryResponse = await axios.post('http://localhost:5001/api/chat', {
      message: enhancedMessage,
      type: 'text',
      isRetry: true,
      originalContext: context,
      conversationId: conversationId
    });
    
    const retryResult = retryResponse.data;
    
    // Add retry metadata to the response
    return res.status(200).json({
      ...retryResult,
      isRetry: true,
      originalMessage: originalMessage,
      clarificationUsed: clarification
    });
    
  } catch (error) {
    console.error('Clarification handling error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process clarification',
      needsClarification: false
    });
  }
});

// New route to handle sequential confirmation workflow
router.post('/chat/confirm-and-continue', async (req, res) => {
  const { toolName, parameters, originalMessage, context, allToolResults } = req.body;
  
  console.log(`🔒 Executing confirmed tool: ${toolName}`);
  console.log(`📋 Request body:`, req.body);
  
  try {
    // Execute the confirmed tool
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log(`📞 Calling frontend tool API: ${frontendUrl}/api/tools`);
    
    const response = await axios.post(`${frontendUrl}/api/tools`, {
      tool: toolName,
      inputs: parameters
    }, {
      validateStatus: function (status) {
        return true; // Don't throw errors for any status code
      }
    });
    
    let executionResult;
    if (response.data.success) {
      executionResult = {
        tool: toolName,
        success: true,
        result: response.data.result
      };
      console.log(`✅ Tool ${toolName} executed successfully`);
    } else {
      executionResult = {
        tool: toolName,
        success: false,
        error: response.data.error
      };
      console.log(`❌ Tool ${toolName} failed:`, response.data.error);
    }
    
    // Check for remaining confirmation tools
    const remainingConfirmations = allToolResults.filter(result => 
      result.requiresConfirmation && result.tool !== toolName
    );
    
    // Mark the current tool as completed in the allToolResults array
    const updatedAllToolResults = allToolResults.map(result => {
      if (result.tool === toolName) {
        return {
          ...result,
          requiresConfirmation: false, // Mark as completed
          executed: true,
          executionResult: executionResult
        };
      }
      return result;
    });
    
    if (remainingConfirmations.length > 0) {
      console.log(`🔒 ${remainingConfirmations.length} more confirmations pending`);
      const nextConfirmation = remainingConfirmations[0];
      
      return res.status(200).json({
        success: true,
        response: `✅ ${toolName} completed. Please confirm the next action:`,
        executionResult: executionResult,
        analysis: {
          toolResults: [nextConfirmation],
          pendingConfirmations: remainingConfirmations.length - 1,
          allTools: updatedAllToolResults // Use updated results
        }
      });
    } else {
      // No more confirmations needed - check for failures
      console.log('✅ All confirmations completed');
      
      // Check if any tools failed after confirmation
      const failedToolsAfterConfirmation = updatedAllToolResults
        .filter(result => result.executed && result.executionResult && !result.executionResult.success)
        .map(result => ({
          tool: result.tool,
          success: false,
          error: result.executionResult.error,
          errorDetails: result.executionResult.errorDetails,
          variables: result.confirmationData?.parameters || result.variables || {},
          originalError: result.executionResult.error
        }));
      
      if (failedToolsAfterConfirmation.length > 0) {
        console.log('❌ Tools failed after confirmation, calling error handler');
        console.log('🔍 Failed tools structure:', failedToolsAfterConfirmation);
        // Use the same error handling as during initial execution
        return await handleToolFailures(res, failedToolsAfterConfirmation, originalMessage, {}, {
          tools: updatedAllToolResults.map(r => r.tool),
          intent: 'system_action'
        });
      }
      
      return res.status(200).json({
        success: true,
        response: `✅ All actions completed successfully. ${executionResult.success ? executionResult.result : 'All tools executed.'}`,
        executionResult: executionResult,
        analysis: {
          allCompleted: true,
          allTools: updatedAllToolResults
        }
      });
    }
    
  } catch (error) {
    console.error('Error in confirm-and-continue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute confirmed tool'
    });
  }
});

// Fast Single-Tool Workflow Function
async function tryFastSingleToolWorkflow(originalMessage, refactoredMessage, contextFromUser = '') {
  const startTime = Date.now();
  console.log('🚀 Attempting fast single-tool workflow for:', originalMessage);
  
  // Quick pattern matching for common single-tool requests
  const singleToolPatterns = [
    // Screenshot tools
    { pattern: /^(take|capture|get)\s+(a\s+)?(screenshot|screen\s*shot)$/i, tool: 'take_screenshot', variables: {} },
    
    // Time/Date tools
    { pattern: /^(what|get|tell me)(\s+the)?\s+(time|current time|date)$/i, tool: 'get_current_time', variables: {} },
    
    // Simple browser actions
    { pattern: /^(get|what|show)\s+(current|active|front)\s+(tab|window|url)$/i, tool: 'browser_get_active_tab_url', variables: {} },
    { pattern: /^(get|what|show)\s+(current|active|front)\s+(tab|window|page)\s+(title|name)$/i, tool: 'browser_get_active_tab_title', variables: {} },
    
    // Text typing (no complex content)
    { pattern: /^type\s+["']?([^"']+)["']?$/i, tool: 'type_text', extract: (match) => ({ text: match[1] }) },
    
    // Google search (simple queries)
    { pattern: /^(search|google)\s+(for\s+)?["']?([^"']+)["']?$/i, tool: 'browser_search_google', extract: (match) => ({ query: match[3] }) },
    
    // Simple application launches  
    { pattern: /^(open|launch|start)\s+(calculator|calc|calendar|notes|mail|safari|finder)$/i, tool: 'open_application', extract: (match) => ({ application: match[2] }) },
    
    // Microphone controls
    { pattern: /^(start|begin)\s+(microphone|mic|recording)$/i, tool: 'start_microphone', variables: {} },
    { pattern: /^(stop|end)\s+(microphone|mic|recording)$/i, tool: 'stop_microphone', variables: {} },
    { pattern: /^(get|check)\s+(microphone|mic)\s+status$/i, tool: 'get_microphone_status', variables: {} },
    
    // Simple clipboard operations
    { pattern: /^(copy|get)\s+(selected|clipboard)\s+(text|content)$/i, tool: 'copy_selected_text_to_clipboard', variables: {} },
    
    // Simple window operations
    { pattern: /^(get|show|read)\s+(front|active|current)\s+(window|app)\s+(content|text)$/i, tool: 'get_front_window_contents', variables: {} },
    
    // Simple media control
    { pattern: /^(play|pause|stop|next|previous)\s+(music|media|song)$/i, tool: 'control_media_playback', extract: (match) => ({ action: match[1].toLowerCase() }) },
    
    // Context-aware single tools (these can use OCR context)
    { pattern: /^type\s+(this|that)$/i, tool: 'type_text', needsContext: true },
    { pattern: /^(search|google)\s+(this|that|for this|for that)$/i, tool: 'browser_search_google', needsContext: true },
    { pattern: /^(copy|paste)\s+(this|that)$/i, tool: 'paste_text_into_front_app', needsContext: true },
    { pattern: /^(summarize|explain|analyze)\s+(this|that)$/i, tool: 'call_llm', needsContext: true },
    
    // Solve questions pattern - use call_llm to solve questions directly  
    { pattern: /^solve\s+(all\s+|these\s+)?(questions?|problems?)(\s+for\s+me)?$/i, tool: 'call_llm', needsContext: true },
    { pattern: /^(help\s+(me\s+)?(with\s+)?|answer\s+|work\s+through\s+)(these\s+|the\s+|all\s+)?(questions?|problems?)(\s+for\s+me)?$/i, tool: 'call_llm', needsContext: true },
    
    // Email patterns (single-tool communication)
    { pattern: /^email\s+(\w+)\s+about\s+(.+)/i, tool: 'gmail_send_email', needsContext: true },
    { pattern: /^send\s+email\s+to\s+(\w+)\s*:?\s*(.+)/i, tool: 'gmail_send_email', needsContext: true },
    { pattern: /^(email|send email to)\s+(\w+)[\s:]+(.+)/i, tool: 'gmail_send_email', needsContext: true },
    { pattern: /^message\s+(\w+)\s+about\s+(.+)/i, tool: 'send_imessage', needsContext: true },
  ];

  // Skip fast path if message contains sequential indicators
  const sequentialIndicators = /\b(and then|then|and also|also|after|followed by|next)\b/i;
  if (sequentialIndicators.test(originalMessage)) {
    console.log('🔄 Message contains sequential indicators, skipping fast path');
    return { handled: false };
  }

  // Single tools can reference context - that's fine for fast path
  // Only skip if there are multiple steps or complex workflows

  // Try to match against patterns
  for (const { pattern, tool, variables, extract, needsContext } of singleToolPatterns) {
    const match = originalMessage.match(pattern);
    if (match) {
      console.log(`✅ Fast path matched tool: ${tool}`);
      
      // Extract variables
      let toolVariables = variables || {};
      if (extract) {
        toolVariables = { ...toolVariables, ...extract(match) };
      }
      
      // Handle context-aware tools with LLM refactoring
      if (needsContext && contextFromUser) {
        console.log(`🔍 Context-aware tool ${tool} needs refactored message with embedded context`);
        
        try {
          // For call_llm, use the refactored message which already has context embedded
          // This avoids redundant context passing and maintains consistency
          const messageToUse = tool === 'call_llm' ? refactoredMessage : originalMessage;
          const contextToPass = tool === 'call_llm' ? '' : contextFromUser; // No separate context for call_llm
          
          console.log(`🧠 Fast path using ${tool === 'call_llm' ? 'refactored' : 'original'} message: ${messageToUse}`);
          
          // Execute with the appropriate message and context
          const result = await executeSingleTool(tool, messageToUse, { tools: [tool] }, contextToPass);
          
          if (result.success) {
            const duration = Date.now() - startTime;
            console.log(`✅ Fast context-aware tool execution successful: ${tool} (${duration}ms total)`);
            return {
              handled: true,
              toolName: tool,
              success: true,
              result: result.result,
              response: await generateResponse(messageToUse, 'system_action', [result], messageToUse, { tools: [tool] }),
              requiresConfirmation: false
            };
          } else if (result.requiresConfirmation) {
            console.log(`🔒 Fast context-aware tool requires confirmation: ${tool}`);
            return {
              handled: true,
              toolName: tool,
              success: false,
              requiresConfirmation: true,
              confirmationData: result.confirmationData,
              response: `Ready to execute ${tool}. Please confirm to proceed.`
            };
          } else {
            console.log(`❌ Fast context-aware tool execution failed: ${tool}`);
            // Continue to try next pattern or fall back
            continue;
          }
        } catch (error) {
          console.log(`❌ Fast context-aware tool preprocessing error for ${tool}:`, error);
          continue; // Try next pattern or fall back
        }
      } else if (needsContext && !contextFromUser) {
        console.log(`⚠️ Context-aware tool ${tool} has no context, skipping fast path`);
        continue; // Skip this pattern, try next
      }
      
      console.log(`🔧 Fast path variables:`, toolVariables);
      
      try {
        // Execute the tool directly with fast-path variables
        const result = await executeSingleTool(tool, originalMessage, { tools: [tool] }, '', toolVariables);
        
        if (result.success) {
          const duration = Date.now() - startTime;
          console.log(`✅ Fast single-tool execution successful: ${tool} (${duration}ms total)`);
          return {
            handled: true,
            toolName: tool,
            success: true,
            result: result.result,
            response: await generateResponse(originalMessage, 'system_action', [result], originalMessage, { tools: [tool] }),
            requiresConfirmation: false
          };
        } else if (result.requiresConfirmation) {
          console.log(`🔒 Fast single-tool requires confirmation: ${tool}`);
          return {
            handled: true,
            toolName: tool,
            success: false,
            requiresConfirmation: true,
            confirmationData: result.confirmationData,
            response: `Ready to execute ${tool}. Please confirm to proceed.`
          };
        } else {
          console.log(`❌ Fast single-tool execution failed: ${tool}`);
          // Fall back to normal workflow
          return { handled: false };
        }
      } catch (error) {
        console.log(`❌ Fast single-tool execution error for ${tool}:`, error);
        // Fall back to normal workflow
        return { handled: false };
      }
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`🔄 No fast path pattern matched after ${duration}ms, using normal workflow`);
  return { handled: false };
}

module.exports = router;