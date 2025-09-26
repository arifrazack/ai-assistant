const OpenAI = require('openai');
const axios = require('axios');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Step 2: Dynamic LLM-driven prompt refactoring with context
async function refactorPromptWithContext(originalPrompt, selectedTextContext) {
  console.log('🔄 Step 2: LLM-driven prompt refactoring with context...');
  console.log('📝 Original prompt:', originalPrompt);
  
  // Limit context length to prevent token overflow
  let limitedContext = selectedTextContext || '';
  if (limitedContext.length > 15000) {
    console.log(`📏 Context too long for preprocessing (${limitedContext.length} chars), truncating to 15000 chars`);
    limitedContext = limitedContext.substring(0, 15000) + '...[truncated]';
  }
  
  console.log('📋 Selected text context:', limitedContext ? limitedContext.substring(0, 200) + '...' : 'None');

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `You are a prompt refactoring expert. Your job is to take a user's original request and enhance it using available context to create a clear, actionable prompt that determines the optimal tool execution strategy.

CRITICAL RULE: When the user says "this" and there is context available, you MUST embed the actual context content in the refactored prompt. DO NOT just refer to it generically.

REFACTORING GOALS:
1. **Context Integration**: Use the selected text context to enhance the user's request
2. **Execution Pattern Detection**: Identify if this needs sequential ("and then") or parallel ("and also") execution
3. **Tool Chain Planning**: Break down complex requests into logical tool sequences
4. **Clarity Enhancement**: Make the prompt more specific and actionable
5. **MULTIPLE ITEM DETECTION**: Detect when context contains multiple items that need separate tool calls

MANDATORY CONTEXT EMBEDDING RULES:
- If user says "summarize this" + context → MUST include: "Summarize this: [ACTUAL CONTEXT CONTENT] and then [next action]"
- If user says "email this" + context → MUST include: "Email this content: [ACTUAL CONTEXT CONTENT] to [recipient]"
- If user says "send this" + context → MUST include: "Send this content: [ACTUAL CONTEXT CONTENT] via [method]"
- NEVER use generic phrases like "the extracted text" or "the document" - ALWAYS embed the actual content

CRITICAL MULTIPLE ITEM DETECTION:
When context contains MULTIPLE distinct items (like multiple events, multiple contacts, multiple files), you MUST:
1. **DETECT** each separate item in the context
2. **SPLIT** the request into separate tool calls using "and also"
3. **SPECIFY** each item clearly in separate commands

MULTIPLE CALENDAR EVENTS EXAMPLE:
- User: "add these events to my calendar"
- Context: "Film Screening: 3 Women - AUG 3, 6:30 p.m. | International Symposium - AUG 6, All Day | Film Screening: The Player - AUG 6, 7 p.m."  
- CORRECT: "Add event 'Film Screening: 3 Women' on Aug 3 at 6:30 PM to calendar and also add event 'International Symposium' on Aug 6 all day to calendar and also add event 'Film Screening: The Player' on Aug 6 at 7 PM to calendar"

MULTIPLE EMAIL CONTACTS EXAMPLE:
- User: "email these people about the meeting"
- Context: "john@email.com, sarah@email.com, mike@email.com"
- CORRECT: "Email john@email.com about the meeting and also email sarah@email.com about the meeting and also email mike@email.com about the meeting"

EXECUTION PATTERN ANALYSIS:
- Look for **sequential dependencies**: Where one action needs the output of another
- Look for **parallel opportunities**: Where multiple independent actions can run simultaneously  
- Look for **multiple parallel items**: When context contains multiple items that need the SAME action performed on each
- Consider **single actions**: Simple requests that need only one tool

CRITICAL SEQUENTIAL PATTERNS:
- "do X and message/email/tell someone about it" → SEQUENTIAL (need X results for communication)
- "create/do tasks and communicate/share/tell about them" → SEQUENTIAL (communication needs task results)
- Any pattern where the context of one task is dependent on the output of another task before it → SEQUENTIAL

EXAMPLES OF CORRECT EMBEDDING:
- "summarize this code" + "function foo() { return 42; }" → "Summarize this code: function foo() { return 42; } and then email it to arif"
- "email this document" + "Meeting notes: Project X..." → "Email this document: Meeting notes: Project X... to john"

EXECUTION PATTERN RULES:
- **"single"**: One action needed (default for simple requests)
- **"sequential"**: Multiple actions where second needs output from first (use "and then")
- **"parallel"**: Multiple INDEPENDENT actions OR multiple items needing same action (use "and also")

CRITICAL: If you detect multiple distinct items in context that need the same action performed on each, ALWAYS use "parallel" execution pattern.

RESPONSE FORMAT:
{
  "refactoredPrompt": "The enhanced, context-aware prompt WITH ACTUAL CONTEXT EMBEDDED (use 'and also' for multiple items)",
  "executionPattern": "single|sequential|parallel",
  "reasoning": "Brief explanation of your refactoring decisions and item detection",
  "contextUsed": true/false,
  "originalIntent": "What the user originally wanted to do"
}

Return ONLY valid JSON.`
    }, {
      role: 'user',
      content: `Original prompt: "${originalPrompt}"
Selected text context: "${limitedContext || 'No context available'}"

CRITICAL ANALYSIS NEEDED:
1. Does the context contain MULTIPLE distinct items (events, contacts, files, etc.)?
2. If YES, split into separate "and also" commands for EACH item
3. If user says "these", "them", or "all", they likely mean multiple items
4. Embed actual content from context, don't use generic references

Please refactor this prompt to be more actionable and context-aware with proper multiple item detection.`
    }],
    max_tokens: 600,
    temperature: 0.3
  });

  try {
    const response = completion.choices[0]?.message?.content || '{}';
    
    let result;
    try {
      // Try direct JSON parsing first
      result = JSON.parse(response);
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON using regex
      console.log('🔄 Direct JSON parsing failed, trying regex extraction...');
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch (regexError) {
          // Try cleaning the JSON
          let cleanedJson = jsonMatch[0]
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\\/g, '\\\\') // Escape backslashes
            .replace(/"/g, '\\"') // Escape quotes in content
            .replace(/\\"/g, '"') // But restore proper JSON quotes
            .replace(/"([^"]+)"\s*:/g, '"$1":'); // Fix key formatting
          
          try {
            result = JSON.parse(cleanedJson);
          } catch (cleanError) {
            throw parseError; // Give up and throw original error
          }
        }
      } else {
        throw parseError;
      }
    }
    
    console.log('🔄 LLM prompt refactoring result:', result);
    
    return {
      refactoredPrompt: result.refactoredPrompt || originalPrompt,
      executionPattern: result.executionPattern || 'single',
      reasoning: result.reasoning || 'No reasoning provided',
      contextUsed: result.contextUsed || false,
      originalIntent: result.originalIntent || originalPrompt
    };
  } catch (e) {
    console.error('❌ Failed to parse prompt refactoring response:', e);
    console.log('❌ Raw response that failed to parse:', completion.choices[0]?.message?.content?.substring(0, 500) + '...');
    
    // Fallback: manually construct the refactored prompt if we have context
    if (limitedContext && limitedContext.trim() && originalPrompt.toLowerCase().includes('this')) {
      const fallbackPrompt = `${originalPrompt.replace(/this/i, `this: ${limitedContext.substring(0, 1000)}`)}`;
      console.log('🔄 Using fallback context embedding:', fallbackPrompt.substring(0, 200) + '...');
      return {
        refactoredPrompt: fallbackPrompt,
        executionPattern: 'sequential',
        reasoning: 'Fallback context embedding due to JSON parsing failure',
        contextUsed: true,
        originalIntent: originalPrompt
      };
    }
    
    return {
      refactoredPrompt: originalPrompt,
      executionPattern: 'single',
      reasoning: 'Failed to refactor prompt',
      contextUsed: false,
      originalIntent: originalPrompt
    };
  }
}

// Enhanced intelligent preprocessing with dynamic prompt refactoring
async function intelligentPreprocess(message, selectedTextContext = '') {
  console.log('🧠 Starting intelligent preprocessing with dynamic refactoring...');
  
  // Step 1: Auto-correct and enhance the message
  const correctedMessage = await autoCorrectAndEnhance(message);
  
  // Step 2: Refactor prompt with context (NEW DYNAMIC STEP)
  const refactoredData = await refactorPromptWithContext(correctedMessage, selectedTextContext);
  
  console.log('✅ Intelligent preprocessing completed');
  console.log('📤 Final refactored prompt:', refactoredData.refactoredPrompt);
  
  return refactoredData.refactoredPrompt;
}

// Auto-correct and enhance message
async function autoCorrectAndEnhance(message) {
  console.log('🔍 Auto-correcting and enhancing message...');
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `You are a message enhancement system. Your job is to:

1. **Fix typos and grammar errors**
2. **Expand abbreviations** (e.g., "ft" → "FaceTime", "msg" → "message")
3. **Clarify ambiguous terms**
4. **Maintain original intent** - don't change the meaning
5. **Keep it concise** - don't add unnecessary words

ENHANCEMENT RULES:
- Fix obvious typos and spelling mistakes
- Expand common abbreviations in context
- Correct grammar while preserving casual tone
- Don't change technical terms or proper names
- Maintain the user's original voice and intent

RESPONSE FORMAT:
Return ONLY the corrected and enhanced message text, nothing else.`
    }, {
      role: 'user',
      content: `Original message: "${message}"

Please correct and enhance this message.`
    }],
    max_tokens: 150,
    temperature: 0.1
  });

  const corrected = completion.choices[0]?.message?.content?.trim() || message;
  console.log('✅ Message corrected:', corrected);
  return corrected;
}

module.exports = {
  intelligentPreprocess,
  refactorPromptWithContext,
  autoCorrectAndEnhance
}; 