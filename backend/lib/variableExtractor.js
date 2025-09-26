const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { TOOL_REGISTRY } = require('./toolRegistry');

// Load contacts data for email mapping
let contactsData = null;
function loadContacts() {
  if (!contactsData) {
    try {
      const contactsPath = path.join(__dirname, '../data/contacts.json');
      const rawData = fs.readFileSync(contactsPath, 'utf8');
      contactsData = JSON.parse(rawData);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      contactsData = { contacts: [] };
    }
  }
  return contactsData;
}

// Map contact name to email address
function mapContactNameToEmail(contactName) {
  const contacts = loadContacts();
  
  // Clean the contact name for matching
  const cleanName = contactName.toLowerCase().trim();
  
  console.log(`🔍 Looking for contact: "${cleanName}"`);
  
  // Find matching contact with improved logic
  const matchingContact = contacts.contacts.find(contact => {
    const contactNameLower = contact.name.toLowerCase();
    
    // Try exact match first (highest priority)
    if (contactNameLower === cleanName) {
      console.log(`✅ Exact match found: "${contact.name}"`);
      return true;
    }
    
    // Try exact first name or last name match
    const nameParts = cleanName.split(' ');
    const contactParts = contactNameLower.split(' ');
    
    // Check if any part of the search name exactly matches any part of the contact name
    for (const searchPart of nameParts) {
      for (const contactPart of contactParts) {
        if (searchPart === contactPart && searchPart.length >= 3) { // Minimum 3 chars for exact match
          console.log(`✅ Exact name part match: "${searchPart}" in "${contact.name}"`);
          return true;
        }
      }
    }
    
    return false;
  });
  
  if (matchingContact && matchingContact.emails && matchingContact.emails.length > 0) {
    console.log(`📧 Mapped contact "${contactName}" to email: ${matchingContact.emails[0]}`);
    return matchingContact.emails[0];
  }
  
  console.log(`📧 No email found for contact "${contactName}", using as-is`);
  return contactName; // Return original if no email found
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Pure LLM-based Variable Extraction - Works with refined prompts from intelligent preprocessor
async function extractVariables(toolName, message, context = '') {
  console.log(`🔄 LLM extracting variables for ${toolName}...`);
  
  const tool = TOOL_REGISTRY.find(t => t.name === toolName);
  if (!tool) {
    console.error(`Tool ${toolName} not found in registry`);
    return null;
  }

  const systemPrompt = `You are a precise variable extractor that works with refined prompts from the intelligent preprocessor.

CURRENT DATE AND TIME CONTEXT:
Today's date: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
Current timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

AVAILABLE TOOLS:
${TOOL_REGISTRY.map(tool => 
    `- ${tool.name}: ${tool.description}
     Required parameters: ${JSON.stringify(tool.inputs)}`
  ).join('\n')}

CURRENT TOOL: ${toolName}

TOOL-AWARE EXTRACTION AND COMPOSITION RULES:
1. The message has been refined by the intelligent preprocessor with embedded context
2. EXTRACT parameters that match the CURRENT TOOL's required inputs
3. RESPECT the tool's parameter schema - do NOT create parameters that don't exist
4. For dates/times: Use the current date context above to calculate relative dates (tomorrow, next week, etc.) and format them as ISO 8601 strings

TOOL-SPECIFIC EXTRACTION LOGIC:
- FOR COMMUNICATION TOOLS (gmail_send_email, send_imessage): Parse and compose communication content
- FOR CALENDAR TOOLS (calendar_create_event): Extract event details (summary, start, end, description, location) with proper ISO date formatting
- FOR LLM TOOLS (call_llm): Extract prompt and context
- FOR OTHER TOOLS: Extract parameters matching the tool's schema

COMMUNICATION TOOL EXTRACTION (gmail_send_email, send_imessage):
- PARSE the refined message to separate CONTENT vs ACTION INSTRUCTION
- COMPOSE natural email/message body from content information  
- EXTRACT recipient from action instructions
- CREATE appropriate subjects based on content

CALENDAR TOOL EXTRACTION (calendar_create_event):
- EXTRACT event title/summary from the message
- EXTRACT start time from date/time references and convert to ISO 8601 format using current date context
- EXTRACT end time if mentioned, otherwise set to 1 hour after start time, also in ISO 8601 format
- EXTRACT description/details if provided
- EXTRACT location if mentioned
- IMPORTANT: For relative dates like "tomorrow", "next Monday", calculate from today's date provided above
- IMPORTANT: For all-day events, include "all day" in the summary or description so they can be properly converted to 9am-9pm timeframe
- CRITICAL: NEVER create an "events" array - return individual parameters (summary, start, end, description, location) for ONE event only

SPECIAL RULE FOR CALL_LLM:
- For call_llm tool, use the exact message as the prompt parameter
- If context is provided (for fast path workflows), include it in the context parameter
- If NO context is provided, DO NOT create or invent any context - leave it empty
- Most fast path call_llm uses have context already embedded in the message, so context should be empty
- DO NOT modify the message or add summarization instructions unless explicitly requested
- Example: message: "solve all questions", context: "[screenshot analysis]" → {"prompt": "solve all questions", "context": "[screenshot analysis]"}
- Example: message: "[detailed refactored message]", context: "" → {"prompt": "[detailed refactored message]", "context": ""}

SEQUENTIAL CHAIN HANDLING:
If this is part of a sequential workflow, the message may contain:
- Actual output from previous steps (use appropriately based on tool type)
- Remaining instructions (use to extract tool-specific parameters)
Example: "(summary content) email it to arif" → for email: body: summary content, to: "arif"

REFINED MESSAGE: "${message}"

${context ? `\nRELEVANT CONTEXT: ${context}` : ''}

CRITICAL FOR CALENDAR TOOLS:
If the message contains multiple events with "and also", extract parameters for only the FIRST event mentioned.
For example, if message is "Add event A and also add event B", extract only event A parameters.

Extract the exact parameters needed for ${toolName}. Return ONLY valid JSON with no explanations or extra text.
Example: {"param1": "value1", "param2": "value2"}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: systemPrompt
    }, {
      role: 'user',
      content: `Tool: ${toolName}
Specific task message: "${message}"
${context ? `Available context: ${context}` : ''}

CRITICAL: Extract parameters for THIS SPECIFIC ${toolName} task ONLY. Do NOT create parameters for other events or tasks.

Return ONLY valid JSON for this specific task.`
    }],
    max_tokens: 500,
    temperature: 0.1
  });

  try {
    const response = completion.choices[0]?.message?.content?.trim() || '{}';
    console.log(`🔍 LLM raw extraction response: ${JSON.stringify(response)}`);
    
    let extractedVars;
    try {
      extractedVars = JSON.parse(response);
    } catch (parseError) {
      console.log(`🔍 JSON parse failed, attempting to clean response: ${parseError.message}`);
      // Try to clean the response and parse again
      let cleanedResponse = response;
      
      // Remove any truncation markers
      cleanedResponse = cleanedResponse.replace(/\.\.\.\[truncated\].*$/g, '');
      
      // Fix common JSON issues
      cleanedResponse = cleanedResponse.replace(/([^\\])"/g, '$1\\"'); // Escape unescaped quotes
      cleanedResponse = cleanedResponse.replace(/\\"/g, '"'); // Unescape properly escaped quotes
      cleanedResponse = cleanedResponse.replace(/\n/g, '\\n'); // Escape newlines
      cleanedResponse = cleanedResponse.replace(/\r/g, '\\r'); // Escape carriage returns
      
      // Try to find and fix unterminated strings
      const openQuotes = (cleanedResponse.match(/"/g) || []).length;
      if (openQuotes % 2 !== 0) {
        // Add closing quote at the end
        cleanedResponse = cleanedResponse.replace(/([^"])$/, '$1"');
      }
      
      // Ensure proper JSON structure
      if (!cleanedResponse.trim().endsWith('}')) {
        cleanedResponse = cleanedResponse.trim() + '}';
      }
      
      try {
        extractedVars = JSON.parse(cleanedResponse);
      } catch (secondParseError) {
        console.log(`🔍 Second JSON parse failed, using fallback extraction`);
        // Fallback: extract basic variables manually
        extractedVars = await generateFallbackVariablesWithLLM(toolName, message);
      }
    }

    if (!extractedVars || Object.keys(extractedVars).length === 0) {
      console.log(`🔍 Empty extraction result, using fallback`);
      extractedVars = await generateFallbackVariablesWithLLM(toolName, message);
    }

    // Always enhance variables - no skipping enhancement
    console.log(`🔍 LLM enhancing variables for ${toolName}...`);
    const enhancedVariables = await validateAndEnhanceVariablesWithLLM(extractedVars, toolName, message);

    console.log(`✅ LLM enhanced variables:`, enhancedVariables);
    
    // Post-process gmail_send_email to map contact names to email addresses
    if (toolName === 'gmail_send_email' && enhancedVariables.to) {
      const originalTo = enhancedVariables.to;
      const mappedEmail = mapContactNameToEmail(originalTo);
      
      if (mappedEmail !== originalTo) {
        enhancedVariables.to = mappedEmail;
        console.log(`📧 Gmail recipient mapped: "${originalTo}" → "${mappedEmail}"`);
      }
    }
    
    // Post-process calendar_create_event to ensure end time is set
    if (toolName === 'calendar_create_event' && enhancedVariables.start && (!enhancedVariables.end || enhancedVariables.end === '')) {
      // If no end time provided, set it to 1 hour after start time
      try {
        const startTime = enhancedVariables.start;
        let endTime = '';
        
        // Handle common time formats
        if (startTime.toLowerCase().includes('at ')) {
          // "tomorrow at 5pm" -> "tomorrow at 6pm"
          const timeMatch = startTime.match(/(\d{1,2})(\s*)(am|pm)/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const ampm = timeMatch[3].toLowerCase();
            
            // Add 1 hour
            hour += 1;
            
            // Handle 12pm -> 1pm, 12am -> 1am, etc.
            if (hour > 12) {
              hour = 1;
              const newAmpm = ampm === 'am' ? 'pm' : 'am';
              endTime = startTime.replace(/\d{1,2}\s*(am|pm)/i, `${hour}${newAmpm}`);
            } else {
              endTime = startTime.replace(/\d{1,2}\s*(am|pm)/i, `${hour}${timeMatch[2]}${ampm}`);
            }
          } else {
            // Fallback: just append " (1 hour duration)"
            endTime = startTime + ' + 1 hour';
          }
        } else {
          // Fallback for other formats
          endTime = startTime + ' + 1 hour';
        }
        
        enhancedVariables.end = endTime;
        console.log(`📅 Calendar end time auto-set: "${startTime}" → "${endTime}"`);
      } catch (error) {
        console.log(`⚠️ Could not auto-set calendar end time:`, error);
        enhancedVariables.end = enhancedVariables.start + ' + 1 hour';
      }
    }
    
    // CRITICAL FIX: Prevent events array creation for calendar tools in main extraction too
    if (toolName === 'calendar_create_event' && enhancedVariables.events && Array.isArray(enhancedVariables.events)) {
      console.log(`🚨 FIXING MAIN: LLM created events array despite instructions - extracting first event only`);
      if (enhancedVariables.events.length > 0) {
        const firstEvent = enhancedVariables.events[0];
        // Return individual parameters, not an events array
        enhancedVariables = {
          summary: firstEvent.summary || '',
          start: firstEvent.start || '',
          end: firstEvent.end || '',
          description: firstEvent.description || '',
          location: firstEvent.location || ''
        };
        console.log(`✅ Main enhanced variables (fixed):`, enhancedVariables);
      }
    }
    
    // CRITICAL FIX: Normalize calendar date formats and handle all-day events
    if (toolName === 'calendar_create_event') {
      // First, check if this is an all-day event and convert to 9am-9pm
      const isAllDayEvent = enhancedVariables.summary && (
        enhancedVariables.summary.toLowerCase().includes('all day') ||
        enhancedVariables.description && enhancedVariables.description.toLowerCase().includes('all day') ||
        (enhancedVariables.start && enhancedVariables.start.toString().includes('00:00:00')) && 
        (enhancedVariables.end && enhancedVariables.end.toString().includes('23:59:59'))
      );
      
      if (isAllDayEvent) {
        console.log(`🕘 Main: Converting all-day event to 9am-9pm timeframe`);
        
        // Extract the date part from start time
        let dateStr = '';
        if (typeof enhancedVariables.start === 'string' && enhancedVariables.start.includes('T')) {
          dateStr = enhancedVariables.start.split('T')[0]; // Get YYYY-MM-DD part
        } else if (typeof enhancedVariables.start === 'string') {
          dateStr = enhancedVariables.start;
        }
        
        if (dateStr) {
          enhancedVariables.start = `${dateStr}T09:00:00`; // 9am
          enhancedVariables.end = `${dateStr}T21:00:00`;   // 9pm
          console.log(`✅ Main: All-day event converted: ${enhancedVariables.start} to ${enhancedVariables.end}`);
        }
      }
      
      // CRITICAL: ALWAYS convert any complex date objects to simple ISO strings
      ['start', 'end'].forEach(timeField => {
        if (enhancedVariables[timeField]) {
          if (typeof enhancedVariables[timeField] === 'object') {
            // Extract ISO string from any nested structure
            let isoString = null;
            
            if (enhancedVariables[timeField].dateTime) {
              // Handle {dateTime: "...", timeZone: "..."} or nested structures
              if (typeof enhancedVariables[timeField].dateTime === 'object') {
                // Double nested: {dateTime: {dateTime: "...", timeZone: "..."}, timeZone: "..."}
                isoString = enhancedVariables[timeField].dateTime.dateTime || enhancedVariables[timeField].dateTime;
                console.log(`🚨 MAIN: Fixed double-nested dateTime for ${timeField}`);
              } else {
                // Single nested: {dateTime: "...", timeZone: "..."}
                isoString = enhancedVariables[timeField].dateTime;
                console.log(`🚨 MAIN: Fixed single-nested dateTime for ${timeField}`);
              }
            } else {
              // Fallback for other object structures
              isoString = enhancedVariables[timeField].start || enhancedVariables[timeField].end || enhancedVariables[timeField];
            }
            
            // Convert to simple ISO string
            enhancedVariables[timeField] = isoString;
            console.log(`✅ MAIN: Converted ${timeField} to ISO string:`, enhancedVariables[timeField]);
          } else if (typeof enhancedVariables[timeField] === 'string') {
            console.log(`✅ MAIN: Keeping ${timeField} as ISO string:`, enhancedVariables[timeField]);
          }
        }
      });
    }
    
    return enhancedVariables;
  } catch (error) {
    console.error(`❌ Failed to extract variables for ${toolName}:`, error);
    return await generateFallbackVariablesWithLLM(toolName, message);
  }
}

// LLM-based variable validation and enhancement
async function validateAndEnhanceVariablesWithLLM(variables, toolName, originalMessage) {
  console.log(`🔍 LLM validating variables for ${toolName}...`);
  
  const tool = TOOL_REGISTRY.find(t => t.name === toolName);
  if (!tool) return variables;

  const systemPrompt = `You are a smart parameter validator that composes natural communication from refined prompts.

CURRENT DATE AND TIME CONTEXT:
Today's date: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
Current timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

TOOL REQUIREMENTS:
- Name: ${tool.name}
- Required Inputs: ${tool.inputs.join(', ')}
- Description: ${tool.description}

TOOL-SPECIFIC ENHANCEMENT RULES:
1. The message was refined by the intelligent preprocessor with embedded context
2. ONLY enhance parameters that match the tool's required inputs
3. Respect the tool's parameter schema - do NOT create parameters that don't exist
4. Enhance and validate all parameters for completeness and quality
5. For dates/times: Use the current date context above to calculate relative dates and format as ISO 8601 strings

TOOL-SPECIFIC LOGIC:
- FOR COMMUNICATION TOOLS (gmail_send_email, send_imessage): Compose natural communication content
- FOR CALENDAR TOOLS (calendar_create_event): Format dates/times properly using current date context, create clear event details
- FOR CALL_LLM TOOL: Only enhance existing parameters, DO NOT add context if not already present
- FOR OTHER TOOLS: Enhance existing parameters without changing their structure

COMMUNICATION TOOLS ONLY (gmail_send_email, send_imessage):
- COMPOSE natural, friendly email/message body from information in the message
- CREATE appropriate subject lines based on content
- EXTRACT recipient names from action instructions

CALENDAR TOOLS ONLY (calendar_create_event):
- KEEP summary, start, end, description, location parameters
- FORMAT dates/times as proper ISO 8601 strings using current date context (start, end)
- CALCULATE relative dates like "tomorrow", "next week" from today's date provided above
- CREATE clear event titles (summary)
- ADD relevant details (description)
- IMPORTANT: If no end time is provided, set end time to 1 hour after start time
- IMPORTANT: For all-day events, include "all day" in the summary or description so they can be properly converted to 9am-9pm timeframe
- CRITICAL: NEVER create an "events" array - return individual parameters for ONE event only

CALL_LLM TOOLS ONLY (call_llm):
- KEEP only the extracted parameters (usually just "prompt")
- DO NOT add "context" parameter if it wasn't in the original extracted parameters
- DO NOT enhance or modify the prompt parameter
- Fast path call_llm typically has context embedded in the prompt already
- Only include context if it was explicitly extracted in the original parameters

NON-COMMUNICATION TOOLS:
- ENHANCE existing extracted parameters
- DO NOT add communication-specific parameters (to, subject, body)
- RESPECT the tool's required parameter schema

SEQUENTIAL CHAIN VALIDATION:
For sequential workflows:
- Content from previous steps → use appropriately based on tool type
- Instructions → extract tool-specific parameters

REFINED MESSAGE: "${originalMessage}"

CRITICAL: Return ONLY valid JSON with parameters that match the tool's schema.
Example: {"param1": "value1", "param2": "value2"}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: systemPrompt
    }, {
      role: 'user',
      content: `Tool: ${tool.name}
Required parameters: ${tool.inputs.join(', ')}
Specific task message: "${originalMessage}"
Current extracted parameters: ${JSON.stringify(variables)}

CRITICAL: ONLY enhance the specific parameters provided above for THIS SINGLE ${tool.name} task. Do NOT create new events or revert to other events.

Enhancement rules:
- For communication tools (email/message): compose natural content from the message information
- For calendar tools: enhance the specific event details (summary, start, end, description, location). IMPORTANT: If no end time is provided, set end time to 1 hour after start time
- For call_llm tools: ONLY keep extracted parameters, DO NOT add context if not originally extracted (fast path has embedded context)
- For other tools: enhance existing parameters without changing the schema
- ALWAYS keep the same event/task identity as the extracted parameters

Return ONLY valid JSON with parameters matching the tool's requirements and the SAME event identity.`
    }],
    max_tokens: 500,
    temperature: 0.1
  });

  try {
    let responseContent = completion.choices[0]?.message?.content || '{}';
    
    // Try to extract JSON from response if it contains extra text
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseContent = jsonMatch[0];
    }
    
    let enhanced = JSON.parse(responseContent);
    
    // CRITICAL FIX: Prevent events array creation for calendar tools
    if (toolName === 'calendar_create_event' && enhanced.events && Array.isArray(enhanced.events)) {
      console.log(`🚨 FIXING: LLM created events array despite instructions - extracting first event only`);
      if (enhanced.events.length > 0) {
        const firstEvent = enhanced.events[0];
        // Return individual parameters, not an events array
        enhanced = {
          summary: firstEvent.summary || '',
          start: firstEvent.start || '',
          end: firstEvent.end || '',
          description: firstEvent.description || '',
          location: firstEvent.location || ''
        };
        console.log(`✅ LLM enhanced variables (fixed):`, enhanced);
      }
    }
    
    // CRITICAL FIX: Normalize calendar date formats and handle all-day events
    if (toolName === 'calendar_create_event') {
      // First, check if this is an all-day event and convert to 9am-9pm
      const isAllDayEvent = enhanced.summary && (
        enhanced.summary.toLowerCase().includes('all day') ||
        enhanced.description && enhanced.description.toLowerCase().includes('all day') ||
        (enhanced.start && enhanced.start.toString().includes('00:00:00')) && 
        (enhanced.end && enhanced.end.toString().includes('23:59:59'))
      );
      
      if (isAllDayEvent) {
        console.log(`🕘 Converting all-day event to 9am-9pm timeframe`);
        
        // Extract the date part from start time
        let dateStr = '';
        if (typeof enhanced.start === 'string' && enhanced.start.includes('T')) {
          dateStr = enhanced.start.split('T')[0]; // Get YYYY-MM-DD part
        } else if (typeof enhanced.start === 'string') {
          dateStr = enhanced.start;
        }
        
        if (dateStr) {
          enhanced.start = `${dateStr}T09:00:00`; // 9am
          enhanced.end = `${dateStr}T21:00:00`;   // 9pm
          console.log(`✅ All-day event converted: ${enhanced.start} to ${enhanced.end}`);
        }
      }
      
      // CRITICAL: ALWAYS convert any complex date objects to simple ISO strings
      ['start', 'end'].forEach(timeField => {
        if (enhanced[timeField]) {
          if (typeof enhanced[timeField] === 'object') {
            // Extract ISO string from any nested structure
            let isoString = null;
            
            if (enhanced[timeField].dateTime) {
              // Handle {dateTime: "...", timeZone: "..."} or nested structures
              if (typeof enhanced[timeField].dateTime === 'object') {
                // Double nested: {dateTime: {dateTime: "...", timeZone: "..."}, timeZone: "..."}
                isoString = enhanced[timeField].dateTime.dateTime || enhanced[timeField].dateTime;
                console.log(`🚨 ENHANCEMENT: Fixed double-nested dateTime for ${timeField}`);
              } else {
                // Single nested: {dateTime: "...", timeZone: "..."}
                isoString = enhanced[timeField].dateTime;
                console.log(`🚨 ENHANCEMENT: Fixed single-nested dateTime for ${timeField}`);
              }
            } else {
              // Fallback for other object structures
              isoString = enhanced[timeField].start || enhanced[timeField].end || enhanced[timeField];
            }
            
            // Convert to simple ISO string
            enhanced[timeField] = isoString;
            console.log(`✅ ENHANCEMENT: Converted ${timeField} to ISO string:`, enhanced[timeField]);
          } else if (typeof enhanced[timeField] === 'string') {
            console.log(`✅ ENHANCEMENT: Keeping ${timeField} as ISO string:`, enhanced[timeField]);
          }
        }
      });
    }
    
    console.log(`✅ LLM enhanced variables:`, enhanced);
    return enhanced;
  } catch (e) {
    console.error(`❌ LLM validation failed:`, e);
    console.error(`Raw response:`, completion.choices[0]?.message?.content);
    return variables; // Return original if validation fails
  }
}

// LLM-based fallback variable generation
async function generateFallbackVariablesWithLLM(toolName, message) {
  console.log(`🔄 LLM generating fallback variables for ${toolName}...`);
  
  const tool = TOOL_REGISTRY.find(t => t.name === toolName);
  if (!tool) return {};

  const systemPrompt = `You are a fallback parameter extractor that works with refined prompts.

CURRENT DATE AND TIME CONTEXT:
Today's date: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
Current timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

TOOL: ${toolName}
REQUIRED PARAMETERS: ${tool ? JSON.stringify(tool.inputs) : 'Unknown'}

TOOL-AWARE FALLBACK EXTRACTION RULES:
1. The message has been refined by the intelligent preprocessor with embedded context
2. EXTRACT parameters that match the CURRENT TOOL's required inputs only
3. RESPECT the tool's parameter schema - do NOT create parameters that don't exist
4. NEVER use generic placeholders - extract actual values from the message
5. For dates/times: Use the current date context above to calculate relative dates and format as ISO 8601 strings

TOOL-SPECIFIC FALLBACK LOGIC:
- FOR COMMUNICATION TOOLS (gmail_send_email, send_imessage): Compose communication content
- FOR CALENDAR TOOLS (calendar_create_event): Extract event details in proper schema
- FOR OTHER TOOLS: Extract parameters matching the tool's requirements

CALENDAR FALLBACK (calendar_create_event):
- EXTRACT summary (event title) from the message
- EXTRACT start time from date/time references and convert to ISO 8601 format using current date context
- EXTRACT end time if mentioned, otherwise set to 1 hour after start time, also in ISO 8601 format
- EXTRACT description from details in message
- EXTRACT location if mentioned
- IMPORTANT: Calculate relative dates like "tomorrow", "next Monday" from today's date provided above
- IMPORTANT: For all-day events, include "all day" in the summary or description so they can be properly converted to 9am-9pm timeframe
- CRITICAL: NEVER create an "events" array - return individual parameters for ONE event only
Parameters: summary, start, end, description, location

COMMUNICATION FALLBACK (gmail_send_email, send_imessage):
- COMPOSE natural email/message body from information in the message
- EXTRACT recipient names from action instructions
- CREATE appropriate subject lines based on content
Parameters: to, subject, body (email) or contact_name, message (imessage)

SEQUENTIAL CHAIN FALLBACK:
If this is part of a sequential workflow:
- Content portion → use appropriately based on tool type
- Instruction portion → extract tool-specific parameters
Example: "(summary content) send to john" → email: body: summary, to: "john" | calendar: summary: content

REFINED MESSAGE: "${message}"

Extract parameters from the refined message. Return ONLY valid JSON with proper parameter names.
Example: {"param1": "value1", "param2": "value2"}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ 
      role: 'system', 
      content: systemPrompt 
    }, {
      role: 'user',
      content: `Tool: ${toolName}
Required parameters: ${tool ? tool.inputs.join(', ') : 'Unknown'}
Specific task message: "${message}"

CRITICAL: Extract parameters for THIS SPECIFIC TASK ONLY. Do NOT create parameters for other events or tasks.

Extract parameters for the ${toolName} tool from the specific task message.
${toolName === 'calendar_create_event' ? 'IMPORTANT: If no end time is mentioned, set end time to 1 hour after start time.' : ''}
Return ONLY valid JSON with parameters matching the tool's schema.`
    }],
    max_tokens: 500,
    temperature: 0.1
  });

  try {
    let response = completion.choices[0]?.message?.content?.trim() || '{}';
    console.log(`🔍 Fallback extraction response: ${response}`);
    
    // Try to extract JSON from response if it contains extra text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      response = jsonMatch[0];
    }
    
    let fallbackVars = JSON.parse(response);
    
    // If LLM fallback extraction still returns empty, return empty object
    // The enhancement step will handle any remaining issues
    if (!fallbackVars || Object.keys(fallbackVars).length === 0) {
      console.log(`⚠️ LLM fallback extraction returned empty for ${toolName}, returning empty object`);
      fallbackVars = {};
    }
    
    // Post-process calendar_create_event fallback to ensure end time is set
    if (toolName === 'calendar_create_event' && fallbackVars.start && (!fallbackVars.end || fallbackVars.end === '')) {
      try {
        const startTime = fallbackVars.start;
        let endTime = startTime + ' + 1 hour'; // Simple fallback
        
        // Try to parse common formats
        const timeMatch = startTime.match(/(\d{1,2})(\s*)(am|pm)/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const ampm = timeMatch[3].toLowerCase();
          
          hour += 1;
          if (hour > 12) {
            hour = 1;
            const newAmpm = ampm === 'am' ? 'pm' : 'am';
            endTime = startTime.replace(/\d{1,2}\s*(am|pm)/i, `${hour}${newAmpm}`);
          } else {
            endTime = startTime.replace(/\d{1,2}\s*(am|pm)/i, `${hour}${timeMatch[2]}${ampm}`);
          }
        }
        
        fallbackVars.end = endTime;
        console.log(`📅 Calendar fallback end time auto-set: "${startTime}" → "${endTime}"`);
      } catch (error) {
        console.log(`⚠️ Could not auto-set calendar fallback end time:`, error);
        fallbackVars.end = fallbackVars.start + ' + 1 hour';
      }
    }
    
    // CRITICAL FIX: Prevent events array creation for calendar tools in fallback too
    if (toolName === 'calendar_create_event' && fallbackVars.events && Array.isArray(fallbackVars.events)) {
      console.log(`🚨 FIXING FALLBACK: LLM created events array despite instructions - extracting first event only`);
      if (fallbackVars.events.length > 0) {
        const firstEvent = fallbackVars.events[0];
        // Return individual parameters, not an events array
        fallbackVars = {
          summary: firstEvent.summary || '',
          start: firstEvent.start || '',
          end: firstEvent.end || '',
          description: firstEvent.description || '',
          location: firstEvent.location || ''
        };
        console.log(`✅ Fallback variables (fixed):`, fallbackVars);
      }
    }
    
    // CRITICAL FIX: Normalize calendar date formats and handle all-day events in fallback too
    if (toolName === 'calendar_create_event') {
      // First, check if this is an all-day event and convert to 9am-9pm
      const isAllDayEvent = fallbackVars.summary && (
        fallbackVars.summary.toLowerCase().includes('all day') ||
        fallbackVars.description && fallbackVars.description.toLowerCase().includes('all day') ||
        (fallbackVars.start && fallbackVars.start.toString().includes('00:00:00')) && 
        (fallbackVars.end && fallbackVars.end.toString().includes('23:59:59'))
      );
      
      if (isAllDayEvent) {
        console.log(`🕘 Fallback: Converting all-day event to 9am-9pm timeframe`);
        
        // Extract the date part from start time
        let dateStr = '';
        if (typeof fallbackVars.start === 'string' && fallbackVars.start.includes('T')) {
          dateStr = fallbackVars.start.split('T')[0]; // Get YYYY-MM-DD part
        } else if (typeof fallbackVars.start === 'string') {
          dateStr = fallbackVars.start;
        }
        
        if (dateStr) {
          fallbackVars.start = `${dateStr}T09:00:00`; // 9am
          fallbackVars.end = `${dateStr}T21:00:00`;   // 9pm
          console.log(`✅ Fallback: All-day event converted: ${fallbackVars.start} to ${fallbackVars.end}`);
        }
      }
      
      // CRITICAL: ALWAYS convert any complex date objects to simple ISO strings
      ['start', 'end'].forEach(timeField => {
        if (fallbackVars[timeField]) {
          if (typeof fallbackVars[timeField] === 'object') {
            // Extract ISO string from any nested structure
            let isoString = null;
            
            if (fallbackVars[timeField].dateTime) {
              // Handle {dateTime: "...", timeZone: "..."} or nested structures
              if (typeof fallbackVars[timeField].dateTime === 'object') {
                // Double nested: {dateTime: {dateTime: "...", timeZone: "..."}, timeZone: "..."}
                isoString = fallbackVars[timeField].dateTime.dateTime || fallbackVars[timeField].dateTime;
                console.log(`🚨 FALLBACK: Fixed double-nested dateTime for ${timeField}`);
              } else {
                // Single nested: {dateTime: "...", timeZone: "..."}
                isoString = fallbackVars[timeField].dateTime;
                console.log(`🚨 FALLBACK: Fixed single-nested dateTime for ${timeField}`);
              }
            } else {
              // Fallback for other object structures
              isoString = fallbackVars[timeField].start || fallbackVars[timeField].end || fallbackVars[timeField];
            }
            
            // Convert to simple ISO string
            fallbackVars[timeField] = isoString;
            console.log(`✅ FALLBACK: Converted ${timeField} to ISO string:`, fallbackVars[timeField]);
          } else if (typeof fallbackVars[timeField] === 'string') {
            console.log(`✅ FALLBACK: Keeping ${timeField} as ISO string:`, fallbackVars[timeField]);
          }
        }
      });
    }
    
    return fallbackVars;
  } catch (error) {
    console.error('❌ Fallback extraction failed:', error);
    return {};
  }
}

// Enhanced extraction for multiple tasks - LLM determines relevant task
async function extractVariablesForTool(toolName, message, multipleTasks) {
  console.log(`🔄 LLM extracting variables for ${toolName} from multiple tasks:`, multipleTasks);
  
  // Use LLM to determine which task is most relevant for this tool
  const relevantTask = await findRelevantTaskWithLLM(toolName, multipleTasks, message);
  console.log(`🎯 LLM selected task "${relevantTask}" for tool ${toolName}`);
  
  // Extract variables using the LLM-selected relevant task
  return await extractVariables(toolName, relevantTask);
}

// LLM-based relevant task selection
async function findRelevantTaskWithLLM(toolName, tasks, originalMessage) {
  if (tasks.length <= 1) return tasks[0] || originalMessage;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `You are a task analyzer. Given a tool and multiple tasks, determine which task is most relevant for that specific tool.

ANALYSIS GUIDELINES:
- Consider what the tool does and which task requires that functionality
- Look for keywords and context that match the tool's purpose
- Choose the task that would provide the best parameters for the tool
- Consider the logical flow of operations

RESPONSE FORMAT:
Return ONLY the most relevant task text, nothing else.`
    }, {
      role: 'user',
      content: `Tool: ${toolName}
Tasks: ${JSON.stringify(tasks)}
Original message: "${originalMessage}"

Which task is most relevant for the ${toolName} tool?`
    }],
    max_tokens: 100,
    temperature: 0.1
  });

  const relevantTask = completion.choices[0]?.message?.content?.trim() || tasks[0];
  return relevantTask;
}

module.exports = {
  extractVariables,
  extractVariablesForTool,
  validateAndEnhanceVariablesWithLLM,
  generateFallbackVariablesWithLLM,
  findRelevantTaskWithLLM,
  mapContactNameToEmail
}; 