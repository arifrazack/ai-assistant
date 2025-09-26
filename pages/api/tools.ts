import type { NextApiRequest, NextApiResponse } from 'next';
import { openApp } from '../../lib/tools/open_app';
import { typeText } from '../../lib/tools/type_text';
import { clickPosition } from '../../lib/tools/click_position';
import { getOpenApps } from '../../lib/tools/get_open_apps';
import { sendImessageToContact } from '../../lib/tools/send_imessage';
import { startFacetimeCall } from '../../lib/tools/start_facetime_call';
import { getClipboard } from '../../lib/tools/get_clipboard';
import { setClipboard } from '../../lib/tools/set_clipboard';
import { playPauseMusic } from '../../lib/tools/play_pause_music';
import { spotifyControl } from '../../lib/tools/spotify_control';
import { setVolume, controlVolume } from '../../lib/tools/volume_control';
import { findContact } from '../../lib/tools/find_contact';
import { getOpenTabs } from '../../lib/tools/get_open_tabs';
import { openBrowserTab } from '../../lib/tools/open_browser_tab';
import { searchWeb, searchYoutube } from '../../lib/tools/search_web';
import { browseWebPlaywright } from '../../lib/tools/browse_web_playwright';
import { getFrontWindowContents, getFrontWindowContentsAppleScript } from '../../lib/tools/get_front_window_contents';
import { getAccessibleTabs, searchTabsByContent } from '../../lib/tools/get_accessible_tabs';
import { createCalendlyInvitee } from '../../lib/tools/create_calendly_invitee';
import { startMicrophone, stopMicrophone, getMicrophoneStatus } from '../../lib/tools/microphone_control';
import { sendGmailEmail } from '../../lib/tools/gmail_send_email';
import { appendRowToSheet } from '../../lib/tools/sheets_append_row';
import { downloadDriveFile } from '../../lib/tools/drive_download_file';
import { createCalendarEvent } from '../../lib/tools/calendar_create_event';
// Tier 1: Context-Switching Tools
import { getFrontmostAppName } from '../../lib/tools/get_frontmost_app_name';
import { getActiveWindowTitle } from '../../lib/tools/get_active_window_title';
import { getSelectedText } from '../../lib/tools/get_selected_text';
import { copySelectedTextToClipboard } from '../../lib/tools/copy_selected_text_to_clipboard';
import { pasteTextIntoFrontApp } from '../../lib/tools/paste_text_into_front_app';
// Tier 2: Notes.app Tools
import { listNotesInFolder } from '../../lib/tools/notes_list_notes';
import { getNoteContent } from '../../lib/tools/notes_get_note_content';
import { createNote } from '../../lib/tools/notes_create_note';
import { updateNote } from '../../lib/tools/notes_update_note';
// Tier 2: Browser Tools
import { getActiveTabUrl } from '../../lib/tools/browser_get_active_tab_url';
import { getActiveTabTitle } from '../../lib/tools/browser_get_active_tab_title';
import { openUrlInNewTab } from '../../lib/tools/browser_open_url_in_new_tab';
import { searchGoogle } from '../../lib/tools/browser_search_google';
import { takeScreenshot } from '../../lib/tools/take_screenshot';

interface ToolRequest {
  tool: string;
  inputs: Record<string, any>;
}

interface ToolResponse {
  success: boolean;
  result?: any;
  error?: string;
  tool?: string;
  errorDetails?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ToolResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { tool, inputs }: ToolRequest = req.body;

    if (!tool) {
      return res.status(400).json({
        success: false,
        error: 'Tool name is required'
      });
    }

    console.log(`Executing tool: ${tool} with inputs:`, inputs);

    let result: any;

    switch (tool) {
      case 'open_app':
        if (!inputs.app_name) {
          return res.status(400).json({
            success: false,
            error: 'app_name is required for open_app tool'
          });
        }
        result = await openApp(inputs.app_name);
        break;

      case 'type_text':
        if (!inputs.text) {
          return res.status(400).json({
            success: false,
            error: 'text is required for type_text tool'
          });
        }
        result = await typeText(inputs.text);
        break;

      case 'click_position':
        if (typeof inputs.x !== 'number' || typeof inputs.y !== 'number') {
          return res.status(400).json({
            success: false,
            error: 'x and y coordinates (numbers) are required for click_position tool'
          });
        }
        result = await clickPosition(inputs.x, inputs.y);
        break;

      case 'get_open_apps':
        result = await getOpenApps();
        break;

      case 'send_imessage':
        if (!inputs.contact_name || !inputs.message) {
          return res.status(400).json({
            success: false,
            error: 'contact_name and message are required for send_imessage tool'
          });
        }
        result = await sendImessageToContact(inputs.contact_name, inputs.message);
        break;

      case 'start_facetime_call':
        if (!inputs.contact_name) {
          return res.status(400).json({
            success: false,
            error: 'contact_name is required for start_facetime_call tool'
          });
        }
        result = await startFacetimeCall(inputs.contact_name);
        break;

      case 'get_clipboard':
        result = await getClipboard();
        break;

      case 'set_clipboard':
        if (!inputs.text) {
          return res.status(400).json({
            success: false,
            error: 'text is required for set_clipboard tool'
          });
        }
        result = await setClipboard(inputs.text);
        break;

      case 'play_pause_music':
        result = await playPauseMusic();
        break;

      case 'spotify_control':
        const action = inputs.action || 'toggle';
        result = await spotifyControl(action);
        break;

      case 'set_volume':
        // Check if it's a relative volume change (action + level) or absolute volume
        if (inputs.action && inputs.level !== undefined) {
          result = await controlVolume({ action: inputs.action, level: inputs.level });
        } else if (inputs.volume !== undefined) {
          if (typeof inputs.volume !== 'number' || inputs.volume < 0 || inputs.volume > 100) {
            return res.status(400).json({
              success: false,
              error: 'volume must be a number between 0 and 100 for set_volume tool'
            });
          }
          result = await controlVolume({ volume: inputs.volume });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Volume control requires either volume number or action with level'
          });
        }
        break;

      case 'find_contact':
        if (!inputs.contact_name) {
          return res.status(400).json({
            success: false,
            error: 'contact_name is required for find_contact tool'
          });
        }
        result = await findContact(inputs.contact_name);
        break;

      case 'get_open_tabs':
        const browser = inputs.browser || 'default';
        if (!['Safari', 'Google Chrome', 'Arc', 'default'].includes(browser)) {
          return res.status(400).json({
            success: false,
            error: 'browser must be "Safari", "Google Chrome", "Arc", or "default" for get_open_tabs tool'
          });
        }
        result = await getOpenTabs(browser);
        break;

      case 'open_browser_tab':
        if (!inputs.url) {
          return res.status(400).json({
            success: false,
            error: 'url is required for open_browser_tab tool'
          });
        }
        const targetBrowser = inputs.browser || 'default';
        if (targetBrowser === 'default') {
          // Use the openUrl helper function for default browser
          const { openUrl } = await import('../../lib/tools/open_browser_tab');
          result = await openUrl(inputs.url);
        } else {
          if (!['Safari', 'Google Chrome', 'Arc'].includes(targetBrowser)) {
            return res.status(400).json({
              success: false,
              error: 'browser must be "Safari", "Google Chrome", "Arc", or "default" for open_browser_tab tool'
            });
          }
          result = await openBrowserTab(targetBrowser, inputs.url);
        }
        break;

      case 'search_web':
        if (!inputs.query) {
          return res.status(400).json({
            success: false,
            error: 'query is required for search_web tool'
          });
        }
        const searchBrowser = inputs.browser || 'default';
        if (!['Safari', 'Google Chrome', 'Arc', 'default'].includes(searchBrowser)) {
          return res.status(400).json({
            success: false,
            error: 'browser must be "Safari", "Google Chrome", "Arc", or "default" for search_web tool'
          });
        }
        result = await searchWeb(inputs.query, searchBrowser === 'default' ? 'Arc' : searchBrowser);
        break;

      case 'search_youtube':
        if (!inputs.query) {
          return res.status(400).json({
            success: false,
            error: 'query is required for search_youtube tool'
          });
        }
        const youtubeBrowser = inputs.browser || 'default';
        if (!['Safari', 'Google Chrome', 'Arc', 'default'].includes(youtubeBrowser)) {
          return res.status(400).json({
            success: false,
            error: 'browser must be "Safari", "Google Chrome", "Arc", or "default" for search_youtube tool'
          });
        }
        result = await searchYoutube(inputs.query, youtubeBrowser === 'default' ? 'Arc' : youtubeBrowser);
        break;

      case 'browse_web_playwright':
        if (!inputs.goal) {
          return res.status(400).json({
            success: false,
            error: 'goal is required for browse_web_playwright tool'
          });
        }
        result = await browseWebPlaywright(inputs.goal);
        break;

      case 'get_front_window_contents':
        try {
          result = await getFrontWindowContents();
        } catch (error) {
          // Fallback to AppleScript if axcli fails
          console.log('Falling back to AppleScript for front window contents');
          result = await getFrontWindowContentsAppleScript();
        }
        break;

      case 'get_accessible_tabs':
        result = await getAccessibleTabs();
        break;

      case 'search_tabs_content':
        if (!inputs.query) {
          return res.status(400).json({
            success: false,
            error: 'query is required for search_tabs_content tool'
          });
        }
        result = await searchTabsByContent(inputs.query);
        break;

      case 'call_llm':
        if (!inputs.prompt) {
          return res.status(400).json({
            success: false,
            error: 'prompt is required for call_llm tool'
          });
        }
        result = await callLLM(inputs.prompt, inputs.context || '');
        break;

      case 'create_calendly_invitee':
        if (!inputs.email || !inputs.name || !inputs.eventType) {
          return res.status(400).json({
            success: false,
            error: 'email, name, and eventType are required for create_calendly_invitee tool'
          });
        }
        result = await createCalendlyInvitee(inputs.email, inputs.name, inputs.eventType);
        break;

      case 'start_microphone':
        result = await startMicrophone();
        break;

      case 'stop_microphone':
        result = await stopMicrophone();
        break;

      case 'get_microphone_status':
        result = await getMicrophoneStatus();
        break;

      case 'gmail_send_email':
        if (!inputs.to || !inputs.subject || !inputs.body) {
          return res.status(400).json({
            success: false,
            error: 'to, subject, and body are required for gmail_send_email tool'
          });
        }
        result = await sendGmailEmail({
          to: inputs.to,
          subject: inputs.subject,
          body: inputs.body
        });
        break;

      case 'sheets_append_row':
        if (!inputs.spreadsheetId || !inputs.range || !inputs.values) {
          return res.status(400).json({
            success: false,
            error: 'spreadsheetId, range, and values are required for sheets_append_row tool'
          });
        }
        if (!Array.isArray(inputs.values)) {
          return res.status(400).json({
            success: false,
            error: 'values must be an array for sheets_append_row tool'
          });
        }
        result = await appendRowToSheet({
          spreadsheetId: inputs.spreadsheetId,
          range: inputs.range,
          values: inputs.values
        });
        break;

      case 'drive_download_file':
        if (!inputs.fileId) {
          return res.status(400).json({
            success: false,
            error: 'fileId is required for drive_download_file tool'
          });
        }
        result = await downloadDriveFile({
          fileId: inputs.fileId
        });
        break;

      case 'calendar_create_event':
        if (!inputs.summary || !inputs.start || !inputs.end) {
          return res.status(400).json({
            success: false,
            error: 'summary, start, and end are required for calendar_create_event tool'
          });
        }
        result = await createCalendarEvent({
          summary: inputs.summary,
          start: inputs.start,
          end: inputs.end,
          description: inputs.description,
          location: inputs.location
        });
        break;

      case 'check_google_auth':
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
          const response = await fetch(`${backendUrl}/api/auth/google/status`);
          const data = await response.json();
          
          if (data.success && data.authenticated) {
            // Format the response to match what settings page expects
            const scopesList = data.scopes ? data.scopes.join(', ') : 'Unknown';
            result = `✅ Google account is connected
Email: ${data.user.email}
Name: ${data.user.name}
Scopes: ${scopesList}
${data.hasGmailAccess ? '📧 Gmail access: Yes' : '📧 Gmail access: No'}
${data.hasCalendarAccess ? '📅 Calendar access: Yes' : '📅 Calendar access: No'}
${data.hasSheetsAccess ? '📊 Sheets access: Yes' : '📊 Sheets access: No'}
${data.hasDriveAccess ? '📁 Drive access: Yes' : '📁 Drive access: No'}`;
          } else {
            result = '❌ Google account is not connected. Use "Connect Google account" to sign in.';
          }
        } catch (error) {
          result = `❌ Error checking Google auth status: ${error}`;
        }
        break;

      case 'connect_google':
        try {
          const gmailAccess = inputs.gmail_access === 'true' || 
                             inputs.gmail_access === true ||
                             (typeof inputs.gmail_access === 'string' && 
                              inputs.gmail_access.toLowerCase().includes('gmail'));
          
          const fullAccess = inputs.full_access === 'true' || 
                            inputs.full_access === true ||
                            (typeof inputs.full_access === 'string' && 
                             inputs.full_access.toLowerCase().includes('full'));
          
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
          const params = new URLSearchParams();
          
          if (fullAccess) {
            params.append('full', 'true');
          } else if (gmailAccess) {
            params.append('gmail', 'true');
          }
          
          const response = await fetch(`${backendUrl}/api/auth/google/login?${params.toString()}`);
          const data = await response.json();
          
          if (data.success && data.authUrl) {
            const scopeType = fullAccess ? 'full Google services (Gmail, Calendar, Drive, Sheets)' : 
                             gmailAccess ? 'Gmail' : 'basic profile';
            result = `🔗 Google authentication URL generated for ${scopeType} access. Please visit: ${data.authUrl}`;
          } else {
            result = `❌ Failed to generate Google auth URL: ${data.error || 'Unknown error'}`;
          }
        } catch (error) {
          result = `❌ Error initiating Google auth: ${error}`;
        }
        break;

      case 'disconnect_google':
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
          const response = await fetch(`${backendUrl}/api/auth/google/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'default' })
          });
          
          const data = await response.json();
          
          if (data.success) {
            result = '✅ Google account disconnected successfully';
          } else {
            result = `❌ Failed to disconnect Google account: ${data.error || 'Unknown error'}`;
          }
        } catch (error) {
          result = `❌ Error disconnecting Google account: ${error}`;
        }
        break;

      case 'notification':
        try {
          if (!inputs.message) {
            return res.status(400).json({
              success: false,
              error: 'message is required for notification tool'
            });
          }
          
          const { sendNotification } = await import('../../lib/tools/notification');
          const notificationInput = {
            message: inputs.message,
            title: inputs.title,
            subtitle: inputs.subtitle
          };
          const notificationResult = await sendNotification(notificationInput);
          result = notificationResult.message;
        } catch (error: any) {
          console.error('🔴 Notification tool error:', error);
          result = `❌ ${error.message || 'Failed to send notification'}`;
        }
        break;

      // Tier 1: Context-Switching Tools
      case 'get_frontmost_app_name':
        result = await getFrontmostAppName();
        break;

      case 'get_active_window_title':
        result = await getActiveWindowTitle();
        break;

      case 'get_selected_text':
        result = await getSelectedText();
        break;

      case 'copy_selected_text_to_clipboard':
        result = await copySelectedTextToClipboard();
        break;

      case 'paste_text_into_front_app':
        if (!inputs.text) {
          return res.status(400).json({
            success: false,
            error: 'text is required for paste_text_into_front_app tool'
          });
        }
        result = await pasteTextIntoFrontApp(inputs.text);
        break;

      // Tier 2: Notes.app Tools
      case 'list_notes_in_folder':
        if (!inputs.folder_name) {
          return res.status(400).json({
            success: false,
            error: 'folder_name is required for list_notes_in_folder tool'
          });
        }
        result = await listNotesInFolder(inputs.folder_name);
        break;

      case 'get_note_content':
        if (!inputs.note_name) {
          return res.status(400).json({
            success: false,
            error: 'note_name is required for get_note_content tool'
          });
        }
        result = await getNoteContent(inputs.note_name);
        break;

      case 'create_note':
        if (!inputs.title) {
          return res.status(400).json({
            success: false,
            error: 'title is required for create_note tool'
          });
        }
        result = await createNote(inputs.title, inputs.body || '');
        break;

      case 'update_note':
        if (!inputs.note_name || !inputs.body) {
          return res.status(400).json({
            success: false,
            error: 'note_name and body are required for update_note tool'
          });
        }
        result = await updateNote(inputs.note_name, inputs.body);
        break;

      // Tier 2: Browser Tools
      case 'get_active_tab_url':
        result = await getActiveTabUrl();
        break;

      case 'get_active_tab_title':
        result = await getActiveTabTitle();
        break;

      case 'open_url_in_new_tab':
        if (!inputs.url) {
          return res.status(400).json({
            success: false,
            error: 'url is required for open_url_in_new_tab tool'
          });
        }
        result = await openUrlInNewTab(inputs.url);
        break;

      case 'search_google':
        if (!inputs.query) {
          return res.status(400).json({
            success: false,
            error: 'query is required for search_google tool'
          });
        }
        result = await searchGoogle(inputs.query);
        break;

      case 'take_screenshot':
        result = await takeScreenshot();
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown tool: ${tool}. Available tools: open_app, type_text, click_position, get_open_apps, send_imessage, start_facetime_call, get_clipboard, set_clipboard, play_pause_music, spotify_control, set_volume, find_contact, get_open_tabs, open_browser_tab, search_web, search_youtube, browse_web_playwright, get_front_window_contents, get_accessible_tabs, search_tabs_content, call_llm, create_calendly_invitee, start_microphone, stop_microphone, get_microphone_status, gmail_send_email, sheets_append_row, drive_download_file, calendar_create_event, check_google_auth, connect_google, disconnect_google, notification, get_frontmost_app_name, get_active_window_title, get_selected_text, copy_selected_text_to_clipboard, paste_text_into_front_app, list_notes_in_folder, get_note_content, create_note, update_note, get_active_tab_url, get_active_tab_title, open_url_in_new_tab, search_google, take_screenshot`
        });
    }

    return res.status(200).json({
      success: true,
      result
    });

  } catch (error: any) {
    // 🔴 Log the raw error to see what we're getting from tools
    console.error("🔴 Tools API - Raw tool execution error:", error);
    console.error("🔴 Tools API - Error.message:", error?.message);
    console.error("🔴 Tools API - Error.originalError:", error?.originalError);
    console.error("🔴 Tools API - Error.errorDetails:", error?.errorDetails);
    
    // Preserve detailed error information from enhanced tools
    let errorMessage = 'Unknown tool execution error';
    let statusCode = 500;
    let errorDetails = null;
    
    if (error.message) {
      errorMessage = error.message;
      
      // Check if this is an enhanced error from our tools
      if (error.errorDetails) {
        errorDetails = error.errorDetails;
      }
      
      // If this is a network error, use appropriate status
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('API Error') && error.statusCode) {
        statusCode = error.statusCode;
      }
    }
    
    console.error('Tools API - Final processed error:', {
      message: errorMessage,
      statusCode,
      hasDetails: !!errorDetails
    });
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      tool: req.body?.tool || 'unknown',
      errorDetails: errorDetails || {
        originalError: error.originalError?.message || error.message,
        toolName: req.body?.tool || 'unknown',
        errorType: 'execution_error',
        specificDetails: error.originalError || null,
        statusCode: statusCode
      }
    });
  }
}

// Meta-tool: Call LLM with custom prompt and context
async function callLLM(prompt: string, context: string = '') {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a helpful AI assistant. Analyze the provided context and respond to the user's prompt. 

IMPORTANT OUTPUT RULES:
1. Provide ONLY what is directly requested in the prompt
2. DO NOT mention the reason you are doing it, only output what is expected from you
3. DO NOT reference workflow steps or what should happen next
4. Focus solely on completing the specific task requested
5. Be concise, accurate, and complete in your response
6. If the prompt contains MULTIPLE questions or tasks, answer ALL of them completely
7. Use clear numbering or sections when answering multiple questions

MULTI-QUESTION HANDLING:
- If you see "Question 2.2", "Question 2.3", etc., answer each one in order
- Don't skip any questions - provide complete answers for all, including technical/coding questions
- Use the same numbering as in the prompt for clarity
- For technical questions involving code/tables/data: provide the conceptual explanation and approach
- Even if you can't execute code, explain what should be done step-by-step

CRITICAL: Answer ALL questions regardless of complexity - theoretical, technical, or coding-related

If asked to summarize, provide only the summary. If asked to analyze, provide only the analysis. Do not suggest or mention any follow-up actions.`;
    
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Handle both string and object context
    let contextStr = '';
    if (typeof context === 'string') {
      contextStr = context.trim();
    } else if (typeof context === 'object' && context !== null) {
      contextStr = JSON.stringify(context, null, 2);
    }
    
    if (contextStr) {
      messages.push({ role: 'user', content: `Context: ${contextStr}\n\nPrompt: ${prompt}` });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 2000, // Increased for multi-question solving
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content || 'No response generated.';
    
    return {
      llm_response: response,
      tokens_used: completion.usage?.total_tokens || 0,
      model: 'gpt-3.5-turbo'
    };

  } catch (error: any) {
    console.error('LLM call error:', error);
    return {
      error: `Failed to call LLM: ${error.message}`
    };
  }
} 