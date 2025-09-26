const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// LLM-based error analysis for tool failures
async function analyzeToolFailureWithLLM(toolName, error, variables, originalMessage) {
  console.log(`🔍 LLM analyzing tool failure for ${toolName}...`);
  console.log(`❌ Error details:`, error);
  console.log(`📋 Variables used:`, variables);

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `You are an expert error analyst for AI tool execution. Analyze tool failures and provide clear, actionable solutions to users.

YOUR ROLE:
1. **Understand the Error**: Analyze the technical error details
2. **Identify Root Cause**: Determine what went wrong and why
3. **Provide Solutions**: Give clear, specific steps to fix the issue
4. **User-Friendly Explanation**: Translate technical errors into plain English

ANALYSIS APPROACH:
- Look at the specific error message and status codes
- Consider the tool being used and its requirements
- Examine the variables that were provided
- Think about common failure patterns for this type of tool

COMMON ERROR PATTERNS:
- **Authentication Errors**: User needs to connect/reconnect accounts
- **Invalid Parameters**: Missing or malformed required fields
- **Permission Issues**: User lacks necessary permissions
- **Network Problems**: Connectivity or service unavailability
- **Data Format Issues**: Wrong format for emails, numbers, etc.

RESPONSE FORMAT:
{
  "errorSummary": "Brief, user-friendly explanation of what went wrong",
  "rootCause": "Technical explanation of the underlying issue",
  "solution": "Clear steps the user can take to fix this",
  "requiredFields": ["field1", "field2"] // if parameters are missing/invalid,
  "needsReauthentication": true/false,
  "retryable": true/false
}

Return ONLY valid JSON.`
    }, {
      role: 'user',
      content: `Tool: ${toolName}
Original Message: "${originalMessage}"
Variables Used: ${JSON.stringify(variables)}
Error Details: ${JSON.stringify(error)}

Please analyze this failure and provide a solution.`
    }],
    max_tokens: 400,
    temperature: 0.1
  });

  try {
    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log('🔍 LLM error analysis result:', analysis);
    
    return {
      errorSummary: analysis.errorSummary || 'An error occurred with the tool execution',
      rootCause: analysis.rootCause || 'Unable to determine root cause',
      solution: analysis.solution || 'Please try again or contact support',
      requiredFields: analysis.requiredFields || [],
      needsReauthentication: analysis.needsReauthentication || false,
      retryable: analysis.retryable || true
    };
  } catch (e) {
    console.error('❌ Failed to parse LLM error analysis:', e);
    return {
      errorSummary: 'Tool execution failed',
      rootCause: 'Error analysis failed',
      solution: 'Please check your inputs and try again',
      requiredFields: [],
      needsReauthentication: false,
      retryable: true
    };
  }
}

// Enhanced error handling with LLM analysis
async function handleToolFailures(res, failedTools, processedMessage, context, toolSelection) {
  console.log('🚨 Handling tool failures with LLM analysis...');
  
  // Analyze each failed tool with LLM
  const analysisPromises = failedTools.map(async (toolResult) => {
    const analysis = await analyzeToolFailureWithLLM(
      toolResult.tool,
      toolResult.error || toolResult.errorDetails,
      toolResult.variables || {},
      processedMessage
    );
    
    return {
      tool: toolResult.tool,
      analysis: analysis,
      originalError: toolResult.error
    };
  });
  
  const toolAnalyses = await Promise.all(analysisPromises);
  
  // Create comprehensive error response
  const errorSummaries = toolAnalyses.map(ta => 
    `**${ta.tool}**: ${ta.analysis.errorSummary}`
  ).join('\n\n');
  
  const solutions = toolAnalyses.map(ta => 
    `**${ta.tool}**: ${ta.analysis.solution}`
  ).join('\n\n');
  
  const response = {
    success: false,
    error: 'Some tools failed to execute. Here\'s what went wrong and how to fix it:',
    analysis: {
      toolFailures: toolAnalyses,
      errorSummary: errorSummaries,
      solutions: solutions,
      needsReauthentication: toolAnalyses.some(ta => ta.analysis.needsReauthentication),
      retryable: toolAnalyses.every(ta => ta.analysis.retryable)
    },
    needsClarification: toolAnalyses.some(ta => ta.analysis.requiredFields.length > 0),
    retryContext: {
      originalMessage: processedMessage,
      toolSelection: toolSelection,
      context: context,
      failedTools: failedTools.map(ft => ft.tool),
      completedTools: [], // Will be populated with successful tools
      retryFromPoint: 'tool_execution'
    }
  };
  
  console.log('📤 Comprehensive error analysis response prepared');
  return res.status(400).json(response);
}

// Handle step failures with LLM analysis
async function handleStepFailure(res, error, stepName, processedMessage, context, stepNumber) {
  console.log(`🚨 Step ${stepNumber} (${stepName}) failed with LLM analysis...`);
  
  // Analyze the step failure with LLM
  const stepAnalysis = await analyzeStepFailureWithLLM(stepName, error, processedMessage, stepNumber);
  
  const response = {
    success: false,
    error: `Step ${stepNumber} (${stepName}) failed: ${stepAnalysis.errorSummary}`,
    analysis: {
      step: stepName,
      stepNumber: stepNumber,
      analysis: stepAnalysis,
      context: context
    },
    needsClarification: true
  };
  
  console.log('📤 Step failure analysis response prepared');
  return res.status(500).json(response);
}

// LLM-based step failure analysis
async function analyzeStepFailureWithLLM(stepName, error, originalMessage, stepNumber) {
  console.log(`🔍 LLM analyzing step failure: ${stepName}`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `You are an expert at analyzing AI workflow step failures. Analyze why a specific step in the processing pipeline failed.

STEP ANALYSIS:
- **Intent Classification**: Failed to understand user intent
- **Tool Selection**: Failed to choose appropriate tools
- **Variable Extraction**: Failed to extract required parameters
- **Tool Execution**: Failed to execute the selected tools
- **Response Generation**: Failed to generate final response

COMMON CAUSES:
- Malformed user input
- Missing required information
- System errors or API issues
- Configuration problems
- Network connectivity issues

RESPONSE FORMAT:
{
  "errorSummary": "User-friendly explanation of what went wrong in this step",
  "rootCause": "Technical reason for the failure",
  "solution": "What the user can do to resolve this",
  "retryable": true/false
}

Return ONLY valid JSON.`
    }, {
      role: 'user',
      content: `Step: ${stepName} (Step ${stepNumber})
Original Message: "${originalMessage}"
Error: ${error.message || error.toString()}

Analyze this step failure.`
    }],
    max_tokens: 300,
    temperature: 0.1
  });

  try {
    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      errorSummary: analysis.errorSummary || `Step ${stepNumber} failed`,
      rootCause: analysis.rootCause || 'Unknown error',
      solution: analysis.solution || 'Please try again',
      retryable: analysis.retryable || true
    };
  } catch (e) {
    console.error('❌ Failed to parse step failure analysis:', e);
    return {
      errorSummary: `Step ${stepNumber} (${stepName}) encountered an error`,
      rootCause: 'Analysis failed',
      solution: 'Please try rephrasing your request',
      retryable: true
    };
  }
}

// Generate intelligent clarification requests using LLM
async function generateClarificationRequest(error, stepName, originalMessage, stepNumber) {
  const stepDescriptions = {
    classify_intent: "understanding what you want to do",
    select_tools: "choosing the right tools for your request",
    execute_tools: "running the selected tools",
    generate_response: "creating a response"
  };
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `You are an AI assistant that helps recover from processing errors by asking users for clarification in a natural, conversational way.

A processing step failed:
- Step: ${stepName} (${stepDescriptions[stepName] || stepName})
- Original user message: "${originalMessage}"
- Error: ${error.message}

Generate a helpful clarification request that:
1. Briefly explains what went wrong in simple terms
2. Asks the user for specific clarification to help resolve the issue
3. Keeps it conversational and natural - no mention of stopping or technical details
4. Acts like a normal conversation where you're just asking for more info

Examples:
- If intent classification failed: "I'm having trouble understanding what you'd like me to do. Could you rephrase your request more specifically?"
- If tool selection failed: "I'm not sure which tools to use for your request. Could you be more specific about what action you want me to take?"
- If tool execution failed: "I ran into an issue trying to execute your request. Can you provide more details or try a different approach?"

Keep it brief, friendly, and conversational. Just ask for clarification like a normal conversation.`
    }],
    max_tokens: 150,
    temperature: 0.7
  });

  return completion.choices[0]?.message?.content || `I encountered an issue with ${stepDescriptions[stepName] || stepName}. Could you please clarify your request?`;
}



// Generate unique conversation IDs for tracking retry attempts
function generateConversationId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
  handleToolFailures,
  handleStepFailure,
  analyzeToolFailureWithLLM,
  analyzeStepFailureWithLLM,
  generateClarificationRequest,
  generateConversationId
}; 