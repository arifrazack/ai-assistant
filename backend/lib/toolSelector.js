const OpenAI = require('openai');
const { TOOL_REGISTRY } = require('./toolRegistry');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Pure LLM-driven tool selection for single tasks
async function selectToolsForSingleTask(task) {
  console.log(`🧠 LLM selecting tools for single task: "${task}"`);

  const toolsDescription = TOOL_REGISTRY.map(tool => 
    `- ${tool.name}: ${tool.description}`
  ).join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `You are a dynamic tool selector. Analyze the task and select the most appropriate tools.

AVAILABLE TOOLS:
${toolsDescription}

SELECTION GUIDELINES:
- Choose tools based on the task's requirements
- Be flexible and context-aware
- Consider tool capabilities and limitations
- Select the minimum number of tools needed
- Prefer specialized tools over generic ones when appropriate

RESPONSE FORMAT:
{
  "needsTools": true/false,
  "tools": ["tool1", "tool2"],
  "reasoning": "Brief explanation of tool selection"
}

Return ONLY valid JSON.`
    }, {
      role: 'user',
      content: `Task: "${task}"

Select the appropriate tools for this task.`
    }],
    max_tokens: 200,
    temperature: 0.1
  });

  try {
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log(`🧠 LLM selected tools for "${task}":`, result.tools);
    
    return {
      needsTools: result.needsTools || false,
      tools: result.tools || [],
      reasoning: result.reasoning || 'No reasoning provided'
    };
  } catch (e) {
    console.error('Failed to parse LLM tool selection:', e);
    return {
      needsTools: false,
      tools: [],
      reasoning: 'Failed to parse LLM response'
    };
  }
}

// Legacy function - now just forwards to LLM-driven selection
async function selectTools(message, intent) {
  console.log(`🔄 Legacy selectTools called, forwarding to LLM-driven selection...`);
  return await selectToolsForSingleTask(message);
}

module.exports = {
  selectTools,
  selectToolsForSingleTask
}; 