const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate final response based on results with multi-task support
async function generateResponse(message, intent, toolResults, originalMessage, toolSelection) {
  let systemPrompt = `You are a helpful AI assistant. Be direct and efficient.`;

  // Handle multiple tasks
  const isMultiTask = toolSelection?.multipleTasks && toolSelection.multipleTasks.length > 1;
  const isChained = toolSelection?.executionPlan?.type === 'sequential_chained';

  if (toolResults && toolResults.length > 0) {
    const resultsText = toolResults.map(result => {
      if (result.success) {
        // Special handling for call_llm tool
        if (result.tool === 'call_llm' && result.result?.llm_response) {
          // For chained executions, don't show intermediate call_llm results
          if (isChained) {
            return null; // Filter this out later
          }
          return `✅ ${result.tool}: ${result.result.llm_response}`;
        }
        return `✅ ${result.tool}: ${result.result}`;
    } else {
        return `❌ ${result.tool}: ${result.error}`;
    }
    }).filter(Boolean).join('\n'); // Filter out null values

    systemPrompt += `\n\nActions completed:\n${resultsText}\n\nSummarize what was accomplished.`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: systemPrompt
    }, {
      role: 'user',
      content: originalMessage
    }],
    max_tokens: 150,
    temperature: 0.3
  });

  return completion.choices[0]?.message?.content || "I've processed your request.";
}

module.exports = { generateResponse }; 