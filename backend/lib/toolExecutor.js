const axios = require('axios');
const { extractVariables, extractVariablesForTool } = require('./variableExtractor');
const { selectToolsForSingleTask } = require('./toolSelector');
const { broadcastToolUpdate } = require('../routes/status');

// Simple execution tracking to prevent immediate duplicates
const recentExecutions = new Map(); // requestKey -> timestamp
const EXECUTION_COOLDOWN = 5000; // 5 seconds cooldown for same request


// Enhanced error parsing for tool execution
function parseToolError(toolName, error, variables) {
  const errorMessage = error.message || error.toString();
  let enhancedError = {
    originalError: errorMessage,
    toolName: toolName,
    variables: variables,
    errorType: 'execution_error',
    specificDetails: null
  };

  // Parse common error patterns and enhance with specific details
  
  // Network/connection errors
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('network')) {
    enhancedError.errorType = 'network_error';
    enhancedError.specificDetails = 'Network connection failed - check your internet connection';
  }
  
  // Authentication errors  
  else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('authentication')) {
    enhancedError.errorType = 'authentication_error';
    enhancedError.specificDetails = 'Authentication failed - you may need to reconnect your account';
  }
  
  // Permission errors
  else if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('permission')) {
    enhancedError.errorType = 'permission_error';
    enhancedError.specificDetails = 'Permission denied - check account permissions for this service';
  }
  
  // Missing/invalid parameter errors
  else if (errorMessage.includes('missing') || errorMessage.includes('required')) {
    enhancedError.errorType = 'missing_parameter';
    enhancedError.specificDetails = `Missing required parameter for ${toolName}`;
    
    // Tool-specific missing parameter detection
    if (toolName === 'gmail_send_email') {
      if (!variables.to || variables.to === null) {
        enhancedError.specificDetails = 'Missing email recipient (to field)';
      } else if (!variables.subject || variables.subject === null) {
        enhancedError.specificDetails = 'Missing email subject';  
      } else if (!variables.body || variables.body === null) {
        enhancedError.specificDetails = 'Missing email body/content';
      }
    } else if (toolName === 'calendar_create_event') {
      if (!variables.summary || variables.summary === null) {
        enhancedError.specificDetails = 'Missing calendar event title/summary';
      } else if (!variables.start || variables.start === null) {
        enhancedError.specificDetails = 'Missing event start time';
      }
    } else if (toolName === 'open_browser_tab') {
      if (!variables.url || variables.url === null) {
        enhancedError.specificDetails = 'Missing website URL to open';
      }
    } else if (toolName === 'search_web' || toolName === 'search_youtube') {
      if (!variables.query || variables.query === null) {
        enhancedError.specificDetails = 'Missing search query';
      }
    } else if (toolName === 'send_imessage') {
      if (!variables.contact_name || variables.contact_name === null) {
        enhancedError.specificDetails = 'Missing contact name for message';
      } else if (!variables.message || variables.message === null) {
        enhancedError.specificDetails = 'Missing message content';
      }
    } else if (toolName === 'open_app') {
      if (!variables.app_name || variables.app_name === null) {
        enhancedError.specificDetails = 'Missing app name to open';
      }
    }
  }
  
  // Invalid format errors
  else if (errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
    enhancedError.errorType = 'invalid_format';
    if (toolName === 'gmail_send_email' && errorMessage.includes('email')) {
      enhancedError.specificDetails = 'Invalid email address format';
    } else if (toolName === 'calendar_create_event' && errorMessage.includes('date')) {
      enhancedError.specificDetails = 'Invalid date/time format';
    } else if (toolName === 'open_browser_tab') {
      enhancedError.specificDetails = 'Invalid URL format';
    } else {
      enhancedError.specificDetails = `Invalid format for ${toolName} parameters`;
    }
  }
  
  // Not found errors
  else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    enhancedError.errorType = 'not_found';
    if (toolName === 'find_contact' || toolName === 'send_imessage' || toolName === 'start_facetime_call') {
      enhancedError.specificDetails = 'Contact not found in your contacts or call history';
    } else if (toolName === 'open_app') {
      enhancedError.specificDetails = 'Application not found or not installed on your system';
    } else {
      enhancedError.specificDetails = `Requested resource not found for ${toolName}`;
    }
  }
  
  // Service unavailable
  else if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('timeout')) {
    enhancedError.errorType = 'service_unavailable';
    enhancedError.specificDetails = 'Service is temporarily unavailable - please try again later';
  }

  return enhancedError;
}

// Execute tools with support for conditional logic and sequential execution
async function executeTools(tools, message, toolSelection, context = '') {
  const executionPlan = toolSelection?.executionPlan;
  const multipleTasks = toolSelection?.multipleTasks || tools;
  const taskCount = multipleTasks.length;
  
  // Smart execution routing based on task count and execution plan
  if (!executionPlan) {
    // Fallback: single task → single execution, multiple tasks → parallel
    if (taskCount === 1) {
      return await executeSingleTaskDirectly(multipleTasks[0], message, toolSelection, context);
    } else {
      return await executeToolsInParallel(tools, message, toolSelection, context);
    }
  }

  switch (executionPlan.type) {
    case 'conditional':
      return await executeConditionalLogic(executionPlan, message, toolSelection, context);
    case 'sequential':
      return await executeToolsSequentially(executionPlan, message, toolSelection, context);
    case 'sequential_chained':
      return await executeToolsSequentiallyChained(tools, message, toolSelection, context);
    case 'parallel':
      return await executeToolsInParallel(tools, message, toolSelection, context);
    case 'single':
      // For single tasks, use direct execution instead of parallel wrapper
      if (taskCount === 1) {
        return await executeSingleTaskDirectly(multipleTasks[0], message, toolSelection, context);
      } else {
        // Multiple tasks marked as single - treat as parallel
        return await executeToolsInParallel(tools, message, toolSelection, context);
      }
    default:
      // Default routing based on task count
      if (taskCount === 1) {
        return await executeSingleTaskDirectly(multipleTasks[0], message, toolSelection, context);
      } else {
        return await executeToolsInParallel(tools, message, toolSelection, context);
      }
  }
}

// Execute a single task directly without parallel overhead
async function executeSingleTaskDirectly(toolName, message, toolSelection, context = '') {
  console.log(`🎯 Executing single task directly: ${toolName}`);
  
  try {
    const result = await executeSingleTool(toolName, message, toolSelection, context);
    return [result]; // Return as array to match other execution functions
  } catch (error) {
    console.error(`❌ Single task execution failed for ${toolName}:`, error);
    const enhancedError = parseToolError(toolName, error, {});
    return [{
      tool: toolName,
      success: false,
      error: enhancedError.specificDetails || error.message,
      errorDetails: enhancedError
    }];
  }
}

// Execute conditional if/then/else logic
async function executeConditionalLogic(plan, message, toolSelection) {
  console.log('🔀 Executing conditional logic:', plan);
  
  // Step 1: Execute condition check tools
  const conditionResults = [];
  for (const toolName of plan.condition.tools) {
    const result = await executeSingleTool(toolName, plan.condition.text, toolSelection);
    conditionResults.push(result);
  }
  
  // Step 2: Evaluate condition using LLM
  const conditionData = conditionResults.map(r => r.success ? r.result : r.error).join('\n');
  
  // Enhanced evaluation prompt based on condition type
  let evaluationPrompt = `Based on this data, determine if the following condition is true or false: "${plan.condition.text}"\n\nData: ${conditionData}\n\nRespond with only "TRUE" or "FALSE".`;
  
  // Special handling for music-related conditions
  if (plan.condition.text.toLowerCase().includes('music') && plan.condition.text.toLowerCase().includes('playing')) {
    evaluationPrompt = `Based on this data, determine if music is currently playing:
    
Condition: "${plan.condition.text}"
Data: ${conditionData}

Rules:
- If the data shows "playing" or mentions a specific track/artist, respond "TRUE"
- If the data shows "paused", "stopped", or "Toggled music playback" (which indicates it was toggled from stopped to playing), respond "FALSE"
- If uncertain, respond "FALSE"

Respond with only "TRUE" or "FALSE".`;
  }
  
  const evaluationResult = await executeSingleTool('call_llm', evaluationPrompt, toolSelection);
  
  const isConditionTrue = evaluationResult.success && 
    evaluationResult.result.llm_response?.toUpperCase().includes('TRUE');
  
  console.log(`🔀 Condition "${plan.condition.text}" evaluated as:`, isConditionTrue ? 'TRUE' : 'FALSE');
  
  // Step 3: Execute then or else branch
  const branchToExecute = isConditionTrue ? plan.then : plan.else;
  const branchResults = [];
  
  if (branchToExecute && branchToExecute.tools.length > 0) {
    console.log(`🔀 Executing ${isConditionTrue ? 'THEN' : 'ELSE'} branch: "${branchToExecute.text}"`);
    
    for (const toolName of branchToExecute.tools) {
      const result = await executeSingleTool(toolName, branchToExecute.text, toolSelection);
      branchResults.push(result);
    }
  } else if (!isConditionTrue && !plan.else) {
    console.log('🔀 Condition was false and no ELSE branch provided - no action taken');
  }
  
  // Return combined results
  return [
    ...conditionResults.map(r => ({ ...r, phase: 'condition' })),
    { 
      tool: 'conditional_evaluation', 
      success: true, 
      result: `Condition "${plan.condition.text}" was ${isConditionTrue ? 'TRUE' : 'FALSE'}`,
      phase: 'evaluation' 
    },
    ...branchResults.map(r => ({ ...r, phase: isConditionTrue ? 'then' : 'else' }))
  ];
}

// Execute tools in sequential order (respecting dependencies)
async function executeToolsSequentially(plan, message, toolSelection) {
  console.log('⛓️ Executing tools sequentially:', plan.order);
  
  const results = [];
  const toolOutputs = {}; // Store outputs for dependent tools
  
  // Execute tools in dependency order
  for (const toolName of plan.order) {
    try {
      // Check if this tool depends on previous outputs
      const contextFromDeps = buildContextFromDependencies(toolName, plan.sequential, toolOutputs);
      const messageWithContext = contextFromDeps ? `${message}\n\nContext: ${contextFromDeps}` : message;
      
      const result = await executeSingleTool(toolName, messageWithContext, toolSelection);
      results.push(result);
      
      // Store output for dependent tools
      if (result.success) {
        toolOutputs[toolName] = result.result;
      }
      
    } catch (error) {
      console.error(`Error in sequential execution of ${toolName}:`, error);
      const enhancedError = parseToolError(toolName, error, {});
      results.push({
        tool: toolName,
        success: false,
        error: enhancedError.specificDetails || error.message,
        errorDetails: enhancedError
      });
    }
  }
  
  return results;
}

// Validate parameters required for confirmation
function validateConfirmationParameters(toolName, variables) {
  const requiredParams = {
    'gmail_send_email': ['to', 'subject', 'body'],
    'send_imessage': ['contact_name', 'message'],
    'start_facetime_call': ['contact_name']
  };
  
  const required = requiredParams[toolName] || [];
  const missing = [];
  
  for (const param of required) {
    if (!variables[param] || variables[param] === null || variables[param] === '') {
      missing.push(param);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing: missing
  };
}

// Execute tools sequentially with chained dependencies
async function executeToolsSequentiallyChained(tools, message, toolSelection, context = '') {
  const executionPlan = toolSelection?.executionPlan;
  const originalUserMessage = message; // Store the original user message
  const communicationTools = ['send_imessage', 'gmail_send_email', 'start_facetime_call'];
  const results = [];

  // Enhanced context with original user message for sequential chains
  let enhancedContext = context;
  if (executionPlan.type === 'sequential_chained' && context) {
    enhancedContext = `${context}\n\nUSER'S ORIGINAL MESSAGE: ${originalUserMessage}`;
  }

  // CRITICAL FIX: Use multipleTasks to handle multiple instances of same tool
  const tasksToExecute = toolSelection?.multipleTasks || tools;
  console.log(`🔗 Executing tools sequentially chained: ${JSON.stringify(tasksToExecute)}`);
  
  let accumulatedOutput = '';
  let stepNumber = 1;
  let processedMessage = message; // Start with the refactored message from preprocessor
  const originalRefactoredMessage = message; // Store the original refactored message for step extraction
  
  // Track processed communication tools to prevent duplicate confirmations
  const processedConfirmations = new Set();
  
  for (let taskIndex = 0; taskIndex < tasksToExecute.length; taskIndex++) {
    const toolName = tasksToExecute[taskIndex];
    const isLastStep = taskIndex === tasksToExecute.length - 1;
    console.log(`🔗 Step ${stepNumber}: Executing ${stepNumber === 1 ? 'first' : (isLastStep ? 'final' : 'middle')} task: "${toolName}" (${taskIndex + 1}/${tasksToExecute.length})`);
    
    // For first step, use original context
    // For subsequent steps, use accumulated output + original context
    let stepContext = stepNumber === 1 ? enhancedContext : `${enhancedContext}\n\nData from previous step: ${accumulatedOutput}`;
    
    // For subsequent steps, replace the completed portion of the message
    if (stepNumber > 1 && accumulatedOutput) {
      // Transform the message: "summarize this and email it to arif" 
      // becomes: "(summary output) email it to arif"
      processedMessage = `${accumulatedOutput} ${extractRemainingSteps(originalRefactoredMessage, stepNumber)}`;
      console.log(`🔄 Updated message for step ${stepNumber}: "${processedMessage}"`);
    }
    
    // For multiple instances of same tool, extract specific task message
    let messageForExtraction = processedMessage;
    if (tasksToExecute.filter(t => t === toolName).length > 1) {
      // Count how many instances of this tool we've processed so far
      const toolTaskIndex = tasksToExecute.slice(0, taskIndex + 1).filter(t => t === toolName).length - 1;
      messageForExtraction = await getSpecificTaskMessage(toolName, toolTaskIndex, originalRefactoredMessage, tasksToExecute);
      console.log(`🎯 Extracted specific task message for ${toolName} instance ${toolTaskIndex + 1}: "${messageForExtraction}"`);
    }
    
    console.log(`🧠 Pure LLM variable extraction for ${toolName}:`);
    console.log(`📝 Refined message: "${messageForExtraction}"`);
    
    // Variable extraction from refined message
    const variables = await extractVariables(toolName, messageForExtraction);
    
    if (!variables) {
      console.log(`❌ Variable extraction failed for ${toolName}`);
      return {
        success: false,
        error: `Variable extraction failed for ${toolName}`,
        toolResults: []
      };
    }

    console.log(`Executing tool: ${toolName} with variables:`, variables);

    try {
      // Simple duplicate detection for calendar events in sequential chains
      if (toolName === 'calendar_create_event' && variables.summary) {
        const eventKey = `${variables.summary}-${variables.start}-${variables.end}`;
        
        // Check if we've already created this exact event in this session
        if (!global.createdEventsInSession) {
          global.createdEventsInSession = new Set();
        }
        
        if (global.createdEventsInSession.has(eventKey)) {
          console.log(`🚫 Skipping duplicate calendar event: ${variables.summary}`);
          
          // Create a mock successful result to maintain the flow
          results.push({
            tool: toolName,
            success: true,
            result: {
              success: true,
              message: `✅ Calendar event already created: ${variables.summary}`,
              eventId: 'duplicate-skipped',
              duplicate: true
            }
          });
          stepNumber++;
          continue;
        }
        
        // Mark this event as created
        global.createdEventsInSession.add(eventKey);
      }

      let stepMessage = processedMessage; // Use the processed message for tool execution
      
      // Enhanced context passing for sequential chains
      let enhancedContextForTool = stepContext;
      if (stepNumber > 1 && !accumulatedOutput && context) {
        // If previous steps failed but we have original context, emphasize it
        enhancedContextForTool = `IMPORTANT: Previous tool steps returned empty results. Use this original context instead: ${context}`;
        console.log(`🔗 Enhanced context for ${toolName} due to previous step failures`);
      }

      // Handle communication tools with confirmation
      if (communicationTools.includes(toolName)) {
        // Check if we've already processed a confirmation for this tool type
        const confirmationKey = `${toolName}-${stepNumber}`;
        if (processedConfirmations.has(confirmationKey)) {
          console.log(`🔒 Skipping duplicate confirmation for ${toolName} at step ${stepNumber}`);
          stepNumber++;
          continue;
        }
        processedConfirmations.add(confirmationKey);
        
        console.log(`🔒 Communication tool detected: ${toolName} - preparing confirmation`);
        console.log(`🔗 Message being passed to variable extraction: "${stepMessage}"`);
        
        // Use the already extracted variables for confirmation display
        let confirmationVariables = variables;
        
        // If variable extraction failed or returned empty, create manual fallback
        if (!confirmationVariables || Object.keys(confirmationVariables).length === 0) {
          console.log(`🔒 Variable extraction returned empty, creating manual fallback for ${toolName}`);
          
          if (toolName === 'send_imessage') {
            // Extract contact name from original message
            const contactMatch = originalUserMessage.match(/(?:imessage|message|send).*?(?:to|it to)\s+(\w+)/i);
            const contactName = contactMatch ? contactMatch[1] : 'Contact Name';
            
            // Use the actual content from processed message (which includes the output)
            const messageContent = processedMessage.includes('email it') || processedMessage.includes('message it') || processedMessage.includes('send it') 
              ? processedMessage.split(/(?:email|message|send)\s+it/)[0].trim()
              : processedMessage;
            
            confirmationVariables = {
              contact_name: contactName,
              message: messageContent
            };
          } else if (toolName === 'gmail_send_email') {
            // Extract recipient from original message
            const recipientMatch = originalUserMessage.match(/(?:email|send).*?(?:to|it to)\s+(\w+)/i);
            const recipient = recipientMatch ? recipientMatch[1] : 'recipient@example.com';
            
            // Use the actual content from processed message (which includes the output)
            const bodyContent = processedMessage.includes('email it') 
              ? processedMessage.split('email it')[0].trim()
              : processedMessage;
            
            // Import the mapping function
            const { mapContactNameToEmail } = require('./variableExtractor');
            
            confirmationVariables = {
              to: mapContactNameToEmail(recipient), // Apply contact mapping
              subject: 'Summary',
              body: bodyContent
            };
          }
        }
        
        console.log(`📋 Variables for ${toolName} confirmation:`, confirmationVariables);

        // Return confirmation request instead of executing
        results.push({
          tool: toolName,
          success: false, // Not executed yet
          requiresConfirmation: true,
          confirmationData: {
            tool: toolName,
            message: `Ready to ${toolName === 'gmail_send_email' ? 'send email' : toolName === 'send_imessage' ? 'send message' : 'make call'} with the following details:`,
            parameters: confirmationVariables,
            context: `This action was triggered by: "${stepMessage}"`
          }
        });
        console.log(`🔒 Confirmation required for ${toolName} in sequential chain`);
        continue;
      }

      // Pass pre-extracted variables to prevent re-extraction
      const result = await executeSingleTool(toolName, stepMessage, toolSelection, enhancedContextForTool, variables);
      results.push(result);

      // Enhanced output accumulation logic
      if (result.success && result.result) {
        let stepOutput = '';
        
        if (typeof result.result === 'string') {
          stepOutput = result.result;
        } else if (result.result.llm_response) {
          stepOutput = result.result.llm_response;
        } else if (result.result.content) {
          stepOutput = result.result.content;
        } else if (typeof result.result === 'object') {
          stepOutput = JSON.stringify(result.result);
        }

        // Only accumulate if we got meaningful output
        if (stepOutput && stepOutput.trim() && stepOutput.trim() !== '{}' && stepOutput.length > 5) {
          // For multiple instances of the same tool followed by communication - accumulate all data
          const isRepeatedTool = tasksToExecute.filter(t => t === toolName).length > 1;
          const hasSubsequentCommunication = tasksToExecute.some(t => communicationTools.includes(t));
          const isNotCommunicationTool = !communicationTools.includes(toolName);
          
          if (isRepeatedTool && hasSubsequentCommunication && isNotCommunicationTool) {
            // Accumulate all data from repeated tools for communication tools
            if (accumulatedOutput) {
              accumulatedOutput = `${accumulatedOutput}\n\n${stepOutput}`;
              console.log(`🔗 Step ${stepNumber} accumulated with previous ${toolName} results (${accumulatedOutput.length} chars total)`);
            } else {
              accumulatedOutput = stepOutput;
              console.log(`🔗 Step ${stepNumber} started ${toolName} accumulation (${stepOutput.length} chars)`);
            }
          } else if (communicationTools.includes(toolName) && accumulatedOutput) {
            // Communication tools should preserve accumulated data, not overwrite it
            console.log(`🔗 Step ${stepNumber} (communication) preserving accumulated data (${accumulatedOutput.length} chars)`);
            // Don't update accumulatedOutput - keep the accumulated event data
          } else {
            // For non-calendar tools or single instances, replace as before
            accumulatedOutput = stepOutput;
            console.log(`🔗 Step ${stepNumber} produced valid output (${stepOutput.length} chars)`);
          }
        } else {
          console.log(`🔗 Step ${stepNumber} produced empty or invalid output, will use original context for next step`);
        }
      } else {
        console.log(`🔗 Step ${stepNumber} failed or returned no result`);
      }

      console.log(`🔗 ${stepNumber === 1 ? 'First' : 'Intermediate'} task outputs to pass to ${stepNumber < tasksToExecute.length ? 'next' : 'completion'} task: ${accumulatedOutput ? accumulatedOutput.substring(0, 100) + '...' : 'No valid output'}`);
      stepNumber++;

    } catch (error) {
      console.error(`❌ Sequential chain step ${stepNumber - 1} (${toolName}) failed:`, error);
      results.push({
        tool: toolName,
        success: false,
        error: error.message
      });
    }
  }

  console.log('�� Sequential chained execution completed');
  return results;
}

// Execute tools in parallel (original behavior)
async function executeToolsInParallel(tools, message, toolSelection, context = '') {
  const results = [];
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const multipleTasks = toolSelection?.multipleTasks || tools;

  // Communication tools that require confirmation
  const communicationTools = ['send_imessage', 'gmail_send_email', 'start_facetime_call'];
  
  
  // CRITICAL FIX: Iterate through multipleTasks to handle multiple instances of same tool
  for (let taskIndex = 0; taskIndex < multipleTasks.length; taskIndex++) {
    const toolName = multipleTasks[taskIndex];
    console.log(`🔧 Executing task ${taskIndex + 1}/${multipleTasks.length}: ${toolName}`);
    try {
      // Check if this tool needs confirmation
      if (communicationTools.includes(toolName)) {
        console.log(`🔒 Tool ${toolName} requires confirmation - preparing confirmation request`);
        
        // Extract variables for confirmation display - use specific task portion
        const taskMessage = await getSpecificTaskMessage(toolName, taskIndex, message, multipleTasks);
        const variables = await extractVariables(toolName, taskMessage);
        console.log(`📋 Parameters for confirmation:`, variables);
        
        // Validate parameters
        const validation = validateConfirmationParameters(toolName, variables);
        
        if (!validation.valid) {
          console.log(`❌ Missing required parameters for ${toolName}:`, validation.missing);
          // Return error asking for missing parameters using existing error handler
          const missingFields = validation.missing.join(', ');
          results.push({
            tool: toolName,
            success: false,
            error: `Missing required fields: ${missingFields}. Please provide all required information.`,
            errorDetails: {
              type: 'missing_parameters',
              missing: validation.missing,
              tool: toolName
            }
          });
          continue;
        }
        
        // Return confirmation request instead of executing
        results.push({
          tool: toolName,
          success: false, // Not executed yet
          requiresConfirmation: true,
          confirmationData: {
            tool: toolName,
            parameters: variables,
            message: `Ready to ${toolName === 'gmail_send_email' ? 'send email' : toolName === 'send_imessage' ? 'send message' : toolName === 'start_facetime_call' ? 'make call' : 'execute action'} with the following details:`
          },
          error: null // No error - just pending confirmation
        });
        continue;
      }

      // Execute non-communication tools normally using executeSingleTool - use specific task portion
      const taskMessage = await getSpecificTaskMessage(toolName, taskIndex, message, multipleTasks);
      
      // Extract variables once and pass them to executeSingleTool to prevent re-extraction
      const variables = await extractVariables(toolName, taskMessage);
      const result = await executeSingleTool(toolName, taskMessage, toolSelection, context, variables);
      results.push(result);
      
      // DYNAMIC SOLUTION: Collect successful task results for communication tasks
      const lastResult = results[results.length - 1];
      if (lastResult && lastResult.success && lastResult.result) {
        console.log(`✅ Task ${taskIndex + 1} (${toolName}) completed successfully - result available for communication tasks`);
      }
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error.message);
      const enhancedError = parseToolError(toolName, error, {});
      
      results.push({
        tool: toolName,
        success: false,
        error: enhancedError.specificDetails || error.message,
        errorDetails: enhancedError,
        originalError: error.message
      });
    }
  }

  return results;
}

// Execute a single tool
async function executeSingleTool(toolName, message, toolSelection, context = '', preExtractedVariables = null) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Communication tools that require confirmation
    const communicationTools = ['send_imessage', 'gmail_send_email', 'start_facetime_call'];
    
    // Use pre-extracted variables if provided (fast path), otherwise extract from message
    let variables;
    if (preExtractedVariables) {
      console.log(`📦 Using pre-extracted variables for ${toolName}:`, preExtractedVariables);
      variables = preExtractedVariables;
    } else {
      // Extract variables from the refined message 
      // Only pass context for call_llm tool to avoid redundant costs
      const shouldPassContext = toolName === 'call_llm' && context;
      variables = await extractVariables(toolName, message, shouldPassContext ? context : '');
    }
    
    console.log(`Executing tool: ${toolName} with variables:`, variables);
    broadcastToolUpdate(toolName, 'started');

    // Check if this tool needs confirmation before execution
    if (communicationTools.includes(toolName)) {
      console.log(`🔒 Single tool ${toolName} requires confirmation - preparing confirmation request`);
      
      // Return confirmation request instead of executing
      return {
        tool: toolName,
        success: false, // Not executed yet
        requiresConfirmation: true,
        confirmationData: {
          tool: toolName,
          message: `Ready to ${toolName === 'gmail_send_email' ? 'send email' : toolName === 'send_imessage' ? 'send message' : 'make call'} with the following details:`,
          parameters: variables,
          context: `This action was triggered by: "${message}"`
        }
      };
    }

    // Call frontend tools API with validateStatus to prevent axios from throwing on 4xx/5xx
    const response = await axios.post(`${frontendUrl}/api/tools`, {
      tool: toolName,
      inputs: variables
    }, {
      validateStatus: function (status) {
        // Don't throw errors for any status code - we'll handle them manually
        return true;
      }
    });

    if (response.data.success) {
      broadcastToolUpdate(toolName, 'success', response.data.result);
      return {
        tool: toolName,
        success: true,
        result: response.data.result
      };
    } else {
      broadcastToolUpdate(toolName, 'failed', null, response.data.error);
      // 🔴 Log the detailed response for debugging
      console.error(`🔴 Backend SingleTool - Tool ${toolName} failed:`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      // Extract detailed error information from enhanced frontend tools
      let detailedError = response.data.error || 'Unknown tool execution error';
      let errorDetails = response.data.errorDetails || null;
      
      // Enhanced error handling for single tool execution
      const enhancedError = parseToolError(toolName, new Error(detailedError), variables);
      
      // Use the frontend tool's detailed error if available, otherwise use our enhancement
      const finalError = errorDetails?.specificDetails || 
                         enhancedError.specificDetails || 
                         detailedError;
      
      console.log(`❌ Enhanced error for single tool ${toolName}:`, {
        finalError,
        frontendErrorDetails: errorDetails,
        enhancedError
      });
      
      return {
        tool: toolName,
        success: false,
        error: finalError,
        errorDetails: errorDetails || enhancedError,
        originalError: detailedError,
        variables: variables
      };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error.message);
    const enhancedError = parseToolError(toolName, error, {});
    
    return {
      tool: toolName,
      success: false,
      error: enhancedError.specificDetails || error.message,
      errorDetails: enhancedError,
      originalError: error.message
    };
  }
}

// Helper function to extract remaining steps from the refactored message
function extractRemainingSteps(refactoredMessage, currentStep) {
  // Pattern for intelligent preprocessor format: "Summarize this: [content] and then email it to Arif"
  const preprocessorPattern = /^(Summarize|Analyze|Explain|Process)\s+this:\s+(.+?)\s+and\s+then\s+(.+)$/i;
  const match = refactoredMessage.match(preprocessorPattern);
  
  if (match && currentStep === 2) {
    // Return the action part: "email it to Arif"
    return match[3];
  }
  
  // Common patterns for sequential steps
  const patterns = [
    /^(.+?)\s+and\s+then\s+(.+)$/i,
    /^(.+?)\s+then\s+(.+)$/i,
    /^(.+?)\s+and\s+(.+)$/i
  ];
  
  for (const pattern of patterns) {
    const patternMatch = refactoredMessage.match(pattern);
    if (patternMatch) {
      if (currentStep === 2) {
        // Return the second part for step 2
        return patternMatch[2];
      }
      // For more complex multi-step patterns, could be extended
    }
  }
  
  // Fallback: try to remove the first action and keep the rest
  const actionPatterns = [
    /^(summarize|analyze|explain|process)\s+(.+?)\s+(and\s+(?:then\s+)?(?:email|send|message).+)$/i,
    /^(.+?)\s+(and\s+(?:then\s+)?(?:email|send|message).+)$/i
  ];
  
  for (const pattern of actionPatterns) {
    const actionMatch = refactoredMessage.match(pattern);
    if (actionMatch) {
      const remainingPart = actionMatch[actionMatch.length - 1]; // Get the last capture group
      return remainingPart.replace(/^and\s+(?:then\s+)?/i, ''); // Remove "and then" prefix
    }
  }
  
  // Ultimate fallback: return the original message
  return refactoredMessage;
}

// Extract specific task message for individual tool execution in parallel mode
async function getSpecificTaskMessage(toolName, taskIndex, originalMessage, multipleTasks) {
  console.log(`🎯 Extracting specific task message for ${toolName} (task ${taskIndex + 1}/${multipleTasks.length})`);
  
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `You are a task parser. Given a complex message with multiple tasks connected by "and also" or "and then", extract the specific portion that relates to a particular tool at a specific position.

PARSING RULES:
1. Split the message by "and also" and "and then" connectors
2. Identify which portion corresponds to the requested task index
3. Return ONLY the specific task portion, not the entire message
4. Maintain the context and details for that specific task

TASK TYPES:
- calendar_create_event: Look for "add event", "create event", "schedule", etc.
- send_imessage: Look for "message", "text", "imessage", etc.  
- gmail_send_email: Look for "email", "send email", etc.

EXAMPLES:
Message: "Add event 'Film A' at 6pm and also add event 'Film B' at 7pm and also message John about it"
Tasks: ['calendar_create_event', 'calendar_create_event', 'send_imessage']
- Task 0 (calendar_create_event): "Add event 'Film A' at 6pm"
- Task 1 (calendar_create_event): "Add event 'Film B' at 7pm" 
- Task 2 (send_imessage): "message John about it"

Return ONLY the specific task portion for the requested task index.`
    }, {
      role: 'user',
      content: `Message: "${originalMessage}"
All tasks: ${JSON.stringify(multipleTasks)}
Requested tool: ${toolName}
Task index: ${taskIndex}

Extract the specific task portion that corresponds to task index ${taskIndex} (${toolName}).`
    }],
    max_tokens: 200,
    temperature: 0.1
  });

  const specificTask = completion.choices[0]?.message?.content?.trim() || originalMessage;
  console.log(`🎯 Extracted specific task: "${specificTask}"`);
  return specificTask;
}

module.exports = {
  executeTools,
  executeConditionalLogic,
  executeToolsSequentially,
  executeToolsInParallel,
  executeSingleTaskDirectly,
  executeSingleTool,
  parseToolError,
  getSpecificTaskMessage
};