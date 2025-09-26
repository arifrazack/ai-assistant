export interface ToolDefinition {
  name: string;
  description: string;
  inputs: string[];
  inputTypes?: Record<string, string>;
  examples?: string[];
}

export const toolRegistry: ToolDefinition[] = [
  {
    name: "open_app",
    description: "Open a macOS application by name. Common apps: Notes, Calculator, Safari, Mail, etc.",
    inputs: ["app_name"],
    inputTypes: { app_name: "string" },
    examples: [
      "Open Notes app",
      "Launch Safari",
      "Open Calculator"
    ]
  },
  {
    name: "type_text",
    description: "Type text into the currently active window or application",
    inputs: ["text"],
    inputTypes: { text: "string" },
    examples: [
      "Type 'Hello World'",
      "Enter my email address",
      "Write a reminder"
    ]
  },
  {
    name: "click_position",
    description: "Click at specific screen coordinates (x, y). Requires knowing the exact pixel position.",
    inputs: ["x", "y"],
    inputTypes: { x: "number", y: "number" },
    examples: [
      "Click at position 100, 200",
      "Click the button at coordinates 450, 300"
    ]
  },
  {
    name: "get_open_apps",
    description: "Get a list of currently running macOS applications",
    inputs: [],
    inputTypes: {},
    examples: [
      "What apps are currently open?",
      "List running applications",
      "Show me open programs"
    ]
  },
  {
    name: "send_imessage",
    description: "Send an iMessage to a contact by name. Requires Messages app and valid contact.",
    inputs: ["contact_name", "message"],
    inputTypes: { contact_name: "string", message: "string" },
    examples: [
      "Send a message to John saying 'Hello'",
      "Text Mom 'I'll be home soon'",
      "Send iMessage to Sarah 'Meeting at 3pm'"
    ]
  },
  {
    name: "start_facetime_call",
    description: "Start a FaceTime call with a contact by name. Requires FaceTime app and valid contact.",
    inputs: ["contact_name"],
    inputTypes: { contact_name: "string" },
    examples: [
      "Call John on FaceTime",
      "Start a FaceTime call with Mom",
      "Video call Sarah"
    ]
  },
  {
    name: "get_clipboard",
    description: "Get the current clipboard content",
    inputs: [],
    inputTypes: {},
    examples: [
      "What's in the clipboard?",
      "Show me clipboard content",
      "Read the clipboard"
    ]
  },
  {
    name: "set_clipboard",
    description: "Set text to the clipboard",
    inputs: ["text"],
    inputTypes: { text: "string" },
    examples: [
      "Copy 'Hello World' to clipboard",
      "Set clipboard to my email address",
      "Copy this text to clipboard"
    ]
  },
  {
    name: "play_pause_music",
    description: "Toggle music playback (play/pause) in the Music app",
    inputs: [],
    inputTypes: {},
    examples: [
      "Play music",
      "Pause the music",
      "Toggle music playback"
    ]
  },
  {
    name: "spotify_control",
    description: "Control Spotify playback (play, pause, next, previous, volume)",
    inputs: ["action", "value"],
    inputTypes: { action: "string", value: "string" },
    examples: [
      "Play Spotify",
      "Pause Spotify",
      "Next track on Spotify",
      "Set Spotify volume to 50"
    ]
  },
  {
    name: "confirmation_tool",
    description: "Request user confirmation before executing communication tools like email or messages. Shows parameters and allows approve/edit/deny.",
    inputs: ["tool", "parameters"],
    inputTypes: { tool: "string", parameters: "object" },
    examples: [
      "Confirm sending email",
      "Review message before sending",
      "Approve communication action"
    ]
  },
  {
    name: "set_volume",
    description: "Set system volume to a specific level (0-100)",
    inputs: ["volume"],
    inputTypes: { volume: "number" },
    examples: [
      "Set volume to 50",
      "Turn volume up to 80",
      "Make volume 25"
    ]
  },
  {
    name: "find_contact",
    description: "Search through contacts and call history to find contact details (phone numbers, emails) for a person",
    inputs: ["contact_name"],
    inputTypes: { contact_name: "string" },
    examples: [
      "Find contact for John",
      "Look up Sarah's contact info",
      "Search for Omar Razack contact details"
    ]
  },
  {
    name: "gmail_send_email",
    description: "Send an email through Gmail. Requires Google account authentication with Gmail access.",
    inputs: ["to", "subject", "body"],
    inputTypes: { to: "string", subject: "string", body: "string" },
    examples: [
      "Send email to john@example.com",
      "Email Sarah about the meeting",
      "Send a follow-up email to the client"
    ]
  },
  {
    name: "sheets_append_row",
    description: "Append a row of data to a Google Sheets spreadsheet. Requires Google account authentication.",
    inputs: ["spreadsheetId", "range", "values"],
    inputTypes: { spreadsheetId: "string", range: "string", values: "array" },
    examples: [
      "Add data to spreadsheet",
      "Append row to Sheet1",
      "Log data in expense tracker"
    ]
  },
  {
    name: "drive_download_file",
    description: "Download a file from Google Drive by file ID. Requires Google account authentication.",
    inputs: ["fileId"],
    inputTypes: { fileId: "string" },
    examples: [
      "Download document from Drive",
      "Get file content from Google Drive",
      "Retrieve shared file"
    ]
  },
  {
    name: "calendar_create_event",
    description: "Create a new event in Google Calendar. Requires Google account authentication.",
    inputs: ["summary", "start", "end"],
    inputTypes: { summary: "string", start: "string", end: "string" },
    examples: [
      "Schedule a meeting for tomorrow at 2pm",
      "Create calendar event for the project deadline",
      "Add appointment to calendar"
    ]
  },
  {
    name: "notification",
    description: "Send a system notification to the computer with a custom message",
    inputs: ["message"],
    inputTypes: { message: "string", title: "string", subtitle: "string" },
    examples: [
      "Send notification 'Task completed'",
      "Notify me 'Meeting in 5 minutes'", 
      "Show notification about deadline"
    ]
  },
  // Tier 1: Context-Switching Tools
  {
    name: "get_frontmost_app_name",
    description: "Returns the name of the currently focused app",
    inputs: [],
    inputTypes: {},
    examples: [
      "What app is currently active?",
      "Which application is in focus?",
      "Get the name of the frontmost app"
    ]
  },
  {
    name: "get_active_window_title",
    description: "Gets the title of the current frontmost window",
    inputs: [],
    inputTypes: {},
    examples: [
      "What window is currently active?",
      "Get the title of the front window",
      "What's the current window title?"
    ]
  },
  {
    name: "get_selected_text",
    description: "Returns the currently selected/highlighted text from most native mac apps (e.g., Safari, Notes, Pages)",
    inputs: [],
    inputTypes: {},
    examples: [
      "What text is currently selected?",
      "Get the highlighted text",
      "Read the selected content"
    ]
  },
  {
    name: "copy_selected_text_to_clipboard",
    description: "Forces Cmd+C and captures clipboard content",
    inputs: [],
    inputTypes: {},
    examples: [
      "Copy the selected text to clipboard",
      "Copy highlighted content",
      "Copy selection to clipboard"
    ]
  },
  {
    name: "paste_text_into_front_app",
    description: "Types or pastes generated content back into the user's current app",
    inputs: ["text"],
    inputTypes: { text: "string" },
    examples: [
      "Paste 'Hello World' into the current app",
      "Type this text into the active window",
      "Insert text into the frontmost application"
    ]
  },
  // Tier 2: Notes.app Tools
  {
    name: "list_notes_in_folder",
    description: "Return all note titles in a specific folder (default: 'All iCloud')",
    inputs: ["folder_name"],
    inputTypes: { folder_name: "string" },
    examples: [
      "List all notes in All iCloud",
      "Show notes in Work folder",
      "Get note titles from Personal folder"
    ]
  },
  {
    name: "get_note_content",
    description: "Read full content of a named note",
    inputs: ["note_name"],
    inputTypes: { note_name: "string" },
    examples: [
      "Get content of Meeting Notes",
      "Read the Shopping List note",
      "Show content of Project Ideas"
    ]
  },
  {
    name: "create_note",
    description: "Agent writes a new note with title and body",
    inputs: ["title", "body"],
    inputTypes: { title: "string", body: "string" },
    examples: [
      "Create a note titled 'Meeting Notes' with content",
      "Make a new note called 'Shopping List'",
      "Write a note about the project"
    ]
  },
  {
    name: "update_note",
    description: "Agent rewrites or appends to a note",
    inputs: ["note_name", "body"],
    inputTypes: { note_name: "string", body: "string" },
    examples: [
      "Update Meeting Notes with new content",
      "Rewrite the Shopping List",
      "Replace content of Project Ideas"
    ]
  },
  // Tier 2: Browser Tools (Safari/Arc/Chrome)
  {
    name: "get_active_tab_url",
    description: "Get current tab's URL from Safari/Arc/Chrome",
    inputs: [],
    inputTypes: {},
    examples: [
      "What's the current tab URL?",
      "Get the active tab URL",
      "Show me the current page URL"
    ]
  },
  {
    name: "get_active_tab_title",
    description: "Get current tab's title from Safari/Arc/Chrome",
    inputs: [],
    inputTypes: {},
    examples: [
      "What's the current tab title?",
      "Get the active tab title",
      "Show me the current page title"
    ]
  },
  {
    name: "open_url_in_new_tab",
    description: "Agent opens a URL in a new tab in Safari/Arc/Chrome",
    inputs: ["url"],
    inputTypes: { url: "string" },
    examples: [
      "Open https://example.com in a new tab",
      "Navigate to Google in new tab",
      "Open the project website"
    ]
  },
  {
    name: "call_llm",
    description: "Call LLM with custom prompt and context - useful for analysis, decision making, conversation, or processing previous tool outputs",
    inputs: ["prompt", "context"],
    inputTypes: { prompt: "string", context: "string" },
    examples: [
      "Analyze this data and summarize",
      "Make a decision based on these results", 
      "Process this information and provide insights",
      "Answer a question conversationally"
    ]
  },
  {
    name: "search_google",
    description: "Search Google for information or websites",
    inputs: ["query"],
    inputTypes: { query: "string" },
    examples: [
      "Search Google for 'TypeScript tutorials'",
      "Find information about machine learning",
      "Search for local restaurants"
    ]
  },
  {
    name: "take_screenshot",
    description: "Take a screenshot of the current screen for visual context analysis",
    inputs: [],
    inputTypes: {},
    examples: [
      "Take a screenshot to understand current context",
      "Capture current screen for analysis",
      "Screenshot for visual context"
    ]
  }
];

// Helper function to get tool by name
export function getToolByName(name: string): ToolDefinition | undefined {
  return toolRegistry.find(tool => tool.name === name);
}

// Helper function to get all tool names
export function getAllToolNames(): string[] {
  return toolRegistry.map(tool => tool.name);
}

// Helper function to format tools for LLM
export function formatToolsForLLM(): string {
  return toolRegistry.map(tool => 
    `- ${tool.name}: ${tool.description}\n  Inputs: ${tool.inputs.join(', ')}\n  Examples: ${tool.examples?.join('; ') || 'N/A'}`
  ).join('\n\n');
} 