const OpenAI = require('openai');
const { TOOL_REGISTRY } = require('./toolRegistry');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Dynamic LLM-based intent classification and tool selection
async function classifyIntentAndSelectTools(message, context = '') {
  console.log('🧠 Starting pure LLM-driven intent classification and tool selection...');
  console.log('📋 Context available:', context ? 'Yes' : 'No');

  // Limit context length to prevent token overflow
  let limitedContext = context;
  if (limitedContext && limitedContext.length > 15000) {
    console.log(`📏 Context too long for intent classification (${limitedContext.length} chars), truncating to 15000 chars`);
    limitedContext = limitedContext.substring(0, 15000) + '...[truncated]';
  }

  const systemPrompt = `You are an intelligent assistant that analyzes user requests and determines the best execution strategy.

AVAILABLE TOOLS:
${TOOL_REGISTRY.map(tool => 
    `- ${tool.name}: ${tool.description}`
  ).join('\n')}

YOUR TASK:
Analyze the user's message and determine:
1. What they want to achieve
2. Whether it needs tools or just conversation
3. If tools are needed, which ones and in what execution pattern

⚠️ CRITICAL ANTI-TYPING RULE:
If the user's message contains ANY of these keywords: "solve", "answer", "help with", "work through" combined with "questions" or "problems":
→ ALWAYS use ["call_llm"] for analysis and problem-solving
→ NEVER use ["type_text"] - this is not a typing task
→ Even if the message mentions "code", "tables", "define", "create" - it's still analysis, not typing
→ The user wants YOU to solve/analyze, not type instructions for them

${limitedContext ? `IMPORTANT CONTEXT INFORMATION:
The user has provided context: "${limitedContext.substring(0, 300)}${limitedContext.length > 300 ? '...' : ''}"

USE THIS CONTEXT to understand what the user is referring to when they say "this", "it", or similar references.` : ''}

EXECUTION PATTERNS:
- **SINGLE**: One tool needed
- **PARALLEL**: Multiple independent tasks that can run simultaneously (use when user says "and also")
- **SEQUENTIAL_CHAINED**: Multiple tasks where second task uses output from first task (use when user says "and then")

CRITICAL PATTERN DETECTION:
- If message contains "and then" → MUST use "sequential_chained" execution
- If message contains "and also" → MUST use "parallel" execution  
- NEVER override these patterns - they indicate user intent for execution order

SMART SEQUENTIAL DETECTION:
Even without explicit "and then", use SEQUENTIAL_CHAINED when:
- Communication mentions "details", "results", "what happened" about other tasks
- Pattern: "do X and message/email/tell someone about it" 
- Pattern: "add/create things and communicate/share/tell about them"
- The communication task needs information from the other tasks to be meaningful

MIXED PATTERN DETECTION:
For messages with BOTH "and also" AND "and then", carefully analyze the structure:
- "A and also B and then C" → Tasks: [A, B, C] with sequential_chained execution
- "A and then B and also C" → Tasks: [A, B, C] with mixed execution
- Count each distinct action/tool mentioned and include ALL in the tasks array

DYNAMIC ANALYSIS RULES:
1. **CONTEXT ALREADY AVAILABLE**: If context is provided and contains relevant information, DO NOT use content extraction tools (get_clipboard, etc.)
2. **SUMMARIZATION/ANALYSIS TASKS**: If user wants to "summarize", "analyze", "explain", or "process" content AND context is available → use ["call_llm"] directly, or ["call_llm", "other_tool"] if chained
3. **SEQUENTIAL PATTERNS**: 
   - "summarize this and email it to X" + context available → ["call_llm", "gmail_send_email"] (sequential_chained)
   - "analyze this and then send it to Y" + context available → ["call_llm", "send_imessage"] (sequential_chained)
   - "summarize my costs and email to arif" + context available → ["call_llm", "gmail_send_email"] (sequential_chained)
4. **CALENDAR PATTERNS**:
   - "Add event A and also add event B" → ["calendar_create_event", "calendar_create_event"] (parallel)
   - "Add event A and also add event B and then message John" → ["calendar_create_event", "calendar_create_event", "send_imessage"] (sequential_chained)
   - "Add events and message Mario the details" → ["calendar_create_event", "send_imessage"] (sequential_chained - message needs event details)
   - Count EACH "add event" or "create event" mention as a separate calendar_create_event task
5. **ANALYSIS/SOLVING PATTERNS**:
   - "solve all questions" → ["call_llm"] (analyze and solve, don't type)
   - "solve the problems" → ["call_llm"] (analyze and solve, don't type)
   - "answer the questions" → ["call_llm"] (analyze and provide answers, don't type)
   - "work through this" → ["call_llm"] (analyze and work through, don't type)
   - CRITICAL: Solving/answering tasks should use call_llm for analysis, NOT type_text for typing
6. **COMMUNICATION**: send_imessage, gmail_send_email, start_facetime_call
7. **SYSTEM ACTIONS**: open_app, type_text, click_position, etc.
   - IMPORTANT: type_text is for typing specific text, NOT for solving problems
8. **PURE CONVERSATION**: If just chatting/asking questions without context AND no action requested → ["call_llm"] (single)
9. **DATA MANIPULATION**: get_clipboard, set_clipboard, create_note, etc.

CRITICAL RECOGNITION PATTERNS:
- User says "summarize this" + context available → ["call_llm"] (skip content extraction tools)
- User says "analyze this" + context available → ["call_llm"] (skip content extraction tools)  
- User says "explain this" + context available → ["call_llm"] (skip content extraction tools)
- User says "solve all questions" + context available → ["call_llm"] (analyze and solve, don't type)
- User says "solve these questions" + context available → ["call_llm"] (analyze and solve, don't type)
- User says "solve the problems" + context available → ["call_llm"] (analyze and solve, don't type)  
- User says "answer the questions" + context available → ["call_llm"] (analyze and answer, don't type)
- User says "help with questions" + context available → ["call_llm"] (analyze and help, don't type)
- User says "work through problems" + context available → ["call_llm"] (analyze and work through, don't type)
- User says "summarize X and email/message to Y" + context available → ["call_llm", "gmail_send_email"/"send_imessage"] (sequential_chained)
- User just wants to chat without specific context AND no action → ["call_llm"]
- User wants to perform system actions (NOT solving/analyzing) → appropriate system tools

CRITICAL OVERRIDE RULES:
- ANY message containing "solve", "answer", "help with", "work through" + "questions"/"problems" → ALWAYS use ["call_llm"] NOT type_text
- Even if message mentions "code", "tables", "snippets" - if it's about solving/answering questions → use ["call_llm"] for analysis
- type_text is ONLY for typing specific predetermined text, NOT for solving academic problems

AVOID REDUNDANT CONTENT EXTRACTION:
- If context contains text content, DO NOT use get_clipboard  
- If context has the information needed, go directly to processing tools (call_llm, etc.)
- Content extraction tools are only needed when NO relevant context is available

IMPORTANT: If user requests an action (like "email", "message", "send") even with poor context, still use the appropriate tools. Don't classify as conversation just because context seems insufficient.

IMPORTANT GUIDELINES:
- ALWAYS use call_llm when user needs content analysis, summarization, or explanation
- If context is available, trust it and skip redundant content extraction
- Be flexible and dynamic - analyze the actual intent
- For any communication tool (email/message), always set needsTools: true  
- Choose tools based on INTENT and CONTEXT, not just keywords
- Break down complex requests into logical tool sequences

RESPONSE FORMAT:
{
  "intent": "conversation|question|system_action|information|other",
  "needsTools": true/false,
  "tools": ["tool1", "tool2"],
  "executionPlan": {
    "type": "single|parallel|sequential_chained",
    "tasks": ["task1", "task2"] // only for sequential_chained
  },
  "reasoning": "Brief explanation of your analysis and why these tools were chosen"
}

Respond with ONLY valid JSON.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: systemPrompt
    }, {
      role: 'user',
      content: `Message: "${message}"

CRITICAL ANALYSIS NEEDED:
1. If this message contains multiple calendar events, count EACH one as a separate calendar_create_event in tasks
2. If communication mentions "details", "results", or refers to information from other tasks → use SEQUENTIAL_CHAINED
3. Pattern "do X and message/email someone about it" → SEQUENTIAL_CHAINED (communication needs X results)

Examples:
- "Add event A and also add event B and then message John" → sequential_chained, tasks: [calendar_create_event, calendar_create_event, send_imessage]  
- "Add events and message Mario the details" → sequential_chained, tasks: [calendar_create_event, send_imessage] (message needs event details)
- "Add events and also send reminder to John" → parallel (independent tasks)

⚠️ CRITICAL SOLVING EXAMPLES:
- "solve these questions for me" → ["call_llm"] (analysis task, NOT typing)
- "help with the following questions: define null hypothesis, create table drought" → ["call_llm"] (analysis task, NOT typing)  
- "answer the questions about creating tables and code" → ["call_llm"] (analysis task, NOT typing)
- "work through these problems step by step" → ["call_llm"] (analysis task, NOT typing)

Analyze this message and provide the appropriate tool selection.`
    }],
    max_tokens: 400,
    temperature: 0.1
  });

  try {
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log('🧠 LLM Intent Analysis:', result);
    
    const finalResult = {
      intent: result.intent || 'other',
      needsTools: result.needsTools || false,
      tools: result.tools || [],
      executionPlan: result.executionPlan || { type: result.tools?.length > 1 ? 'parallel' : 'single' },
      multipleTasks: result.executionPlan?.tasks || null,
      reasoning: result.reasoning || 'No reasoning provided'
    };
    
    console.log('📤 Final dynamic intent classification result:', finalResult);
    return finalResult;
  } catch (e) {
    console.error('Failed to parse LLM intent response:', e);
    return {
      intent: 'other',
      needsTools: false, 
      tools: [],
      executionPlan: { type: 'none' },
      reasoning: 'Failed to parse LLM response'
    };
  }
}

// Legacy function for backward compatibility
async function classifyIntent(message, context = '') {
  const result = await classifyIntentAndSelectTools(message, context);
  return result.intent;
}

module.exports = { classifyIntent, classifyIntentAndSelectTools }; 