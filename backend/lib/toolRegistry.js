// Tool registry for the backend
const TOOL_REGISTRY = [
  {
    name: "confirmation_tool",
    description: "Request user confirmation before executing communication tools like email or messages. Shows parameters and allows approve/edit/deny.",
    inputs: ["tool", "parameters"],
    examples: ["Confirm sending email", "Review message before sending", "Approve communication action"]
  },
  {
    name: "open_app",
    description: "Open a macOS application by name. Common apps: Notes, Calculator, Safari, Mail, etc.",
    inputs: ["app_name"],
    examples: ["Open Notes app", "Launch Safari", "Open Calculator"]
  },
  {
    name: "type_text", 
    description: "Type text into the currently active window or application",
    inputs: ["text"],
    examples: ["Type 'Hello World'", "Enter my email address", "Write a reminder"]
  },
  {
    name: "click_position",
    description: "Click at specific screen coordinates (x, y)",
    inputs: ["x", "y"], 
    examples: ["Click at position 100, 200", "Click the button at coordinates 450, 300"]
  },
  {
    name: "get_open_apps",
    description: "Get a list of currently running macOS applications",
    inputs: [],
    examples: ["What apps are currently open?", "List running applications"]
  },
  {
    name: "send_imessage",
    description: "Send an iMessage to a contact by name. Intelligently reformats message content into natural conversational format and tries phone numbers first (1st, 2nd, 3rd), then falls back to email if needed.",
    inputs: ["contact_name", "message"],
    examples: ["iMessage John that I'm running late", "text Sarah that the meeting is at 3pm", "tell Mike I'm building an app", "message Mom that I'll be home soon"]
  },
  {
    name: "start_facetime_call",
    description: "Start a FaceTime call with a contact by name. Automatically tries phone numbers first (1st, 2nd, 3rd), then falls back to email if needed.",
    inputs: ["contact_name"],
    examples: ["Call John on FaceTime", "Start a FaceTime call with Mom", "Video call Sarah"]
  },
  {
    name: "get_clipboard",
    description: "Get the current clipboard content",
    inputs: [],
    examples: ["What's in the clipboard?", "Show me clipboard content", "Read the clipboard"]
  },
  {
    name: "set_clipboard",
    description: "Set text to the clipboard",
    inputs: ["text"],
    examples: ["Copy 'Hello World' to clipboard", "Set clipboard to my email address", "Copy this text to clipboard"]
  },
  {
    name: "play_pause_music",
    description: "Smart music control - automatically detects and controls Spotify or Apple Music (whichever is active)",
    inputs: [],
    examples: ["Play music", "Pause the music", "Toggle music playback"]
  },
  {
    name: "spotify_control",
    description: "Advanced Spotify control with specific actions: toggle, play, pause, status, next, previous",
    inputs: ["action"],
    examples: ["Control Spotify", "Pause Spotify", "Next track on Spotify", "Get Spotify status", "Play Spotify"]
  },
  {
    name: "set_volume",
    description: "Set system volume to a specific level (0-100)",
    inputs: ["volume"],
    examples: ["Set volume to 50", "Turn volume up to 80", "Make volume 25"]
  },
  {
    name: "find_contact",
    description: "Search through contacts and call history to find contact details (phone numbers, emails) for a person",
    inputs: ["contact_name"],
    examples: ["Find contact for John", "Look up Sarah's contact info", "Search for Omar Razack contact details"]
  },
  {
    name: "get_open_tabs",
    description: "Get a list of currently open tabs from Arc, Chrome, or Safari browser (defaults to Arc)",
    inputs: ["browser"],
    examples: ["What tabs are open?", "Show me browser tabs", "List open tabs", "What tabs are open in Arc?"]
  },
  {
    name: "open_browser_tab",
    description: "Open a URL in Arc browser (default) or a specified browser (Safari, Chrome, Arc). Uses Arc when no browser specified.",
    inputs: ["url", "browser"],
    examples: ["Open google.com", "Open youtube.com in Safari", "Open https://github.com in Chrome"]
  },
  {
    name: "search_web", 
    description: "Search the web using Google in Arc browser (default) or a specified browser",
    inputs: ["query", "browser"],
    examples: ["Search for 'weather today'", "Google search 'best restaurants NYC' in Chrome", "Search 'how to code Python'"]
  },
  {
    name: "search_youtube",
    description: "Search for videos on YouTube in Arc browser (default) or a specified browser",
    inputs: ["query", "browser"],
    examples: ["Search YouTube for 'cooking tutorials'", "Find music videos on YouTube", "Search 'programming lessons' on YouTube"]
  },
  {
    name: "browse_web_playwright",
    description: "Advanced automated web browsing with Playwright - can extract content, take screenshots, and interact with websites",
    inputs: ["goal"],
    examples: ["Browse and extract content about AI news", "Research latest iPhone features", "Get information about stock market"]
  },
  {
    name: "get_front_window_contents",
    description: "Get the text contents of the currently active/frontmost window",
    inputs: [],
    examples: ["What's in the front window?", "Read current window content", "Get text from active window"]
  },
  {
    name: "get_accessible_tabs",
    description: "Get detailed information about browser tabs including their content (requires axcli for full content, falls back to basic info)",
    inputs: [],
    examples: ["Get all tabs with content", "Show me detailed tab information", "What content is in my browser tabs?"]
  },
  {
    name: "search_tabs_content",
    description: "Search through browser tab contents for specific text or topics",
    inputs: ["query"],
    examples: ["Find tabs about JavaScript", "Search tabs for 'machine learning'", "Look for tabs mentioning iPhone"]
  },
  {
    name: "call_llm",
    description: "Call LLM with custom prompt and context - useful for analysis, decision making, or processing previous tool outputs",
    inputs: ["prompt", "context"],
    examples: ["Analyze this data and summarize", "Make a decision based on these results", "Process this information and provide insights"]
  },
  {
    name: "create_calendly_invitee",
    description: "Create a Calendly invitee for a scheduled event",
    inputs: ["email", "name", "eventType"],
    examples: ["Add John Doe to my meeting", "Create Calendly invitee for sarah@email.com", "Add attendee to event"]
  },
  {
    name: "start_microphone",
    description: "Start voice input and speech recognition",
    inputs: [],
    examples: ["Start voice input", "Enable microphone", "Turn on speech recognition"]
  },
  {
    name: "stop_microphone", 
    description: "Stop voice input and speech recognition",
    inputs: [],
    examples: ["Stop voice input", "Disable microphone", "Turn off speech recognition"]
  },
  {
    name: "get_microphone_status",
    description: "Check microphone and speech recognition status",
    inputs: [],
    examples: ["Check microphone status", "Is voice input working?", "Test speech recognition"]
  },
  {
    name: "check_google_auth",
    description: "Check Google authentication status",
    inputs: [],
    examples: ["Am I logged into Google?", "Check Google account status", "Is Google connected?"]
  },
  {
    name: "gmail_send_email",
    description: "Send an email through Gmail. Requires Google account authentication with Gmail access. Perfect for sending professional emails, notifications, or messages.",
    inputs: ["to", "subject", "body"],
    examples: ["Send email to john@example.com", "Email Sarah about the meeting", "Send a follow-up email to the client", "send an email to someone telling them something"]
  },
  {
    name: "sheets_append_row",
    description: "Append a row of data to a Google Sheets spreadsheet. Requires Google account authentication and spreadsheet ID.",
    inputs: ["spreadsheetId", "range", "values"],
    examples: ["Add data to spreadsheet", "Log expense in Sheet1", "Append row to expense tracker", "Add entry to database"]
  },
  {
    name: "drive_download_file",
    description: "Download a file from Google Drive by file ID. Requires Google account authentication. Returns file content and metadata.",
    inputs: ["fileId"],
    examples: ["Download document from Drive", "Get file content from Google Drive", "Retrieve shared file"]
  },
  {
    name: "calendar_create_event",
    description: "Create a new event in Google Calendar. Requires Google account authentication. Supports date/time, description, and location.",
    inputs: ["summary", "start", "end", "description", "location"],
    examples: ["Schedule a meeting for tomorrow at 2pm", "Create calendar event for project deadline", "Add appointment to calendar"]
  },
  {
    name: "connect_google",
    description: "Connect Google account for enhanced features. Use full_access=true for calendar, drive, and sheets access.",
    inputs: ["gmail_access", "full_access"],
    examples: ["Connect my Google account", "Sign in with Google", "Enable Gmail access", "Connect Google with full access for calendar"]
  },
  {
    name: "disconnect_google",
    description: "Disconnect Google account",
    inputs: [],
    examples: ["Disconnect Google", "Sign out of Google", "Remove Google access"]
  },
  {
    name: "notification",
    description: "Send a system notification to the computer with a custom message",
    inputs: ["message", "title", "subtitle"],
    examples: ["Send notification 'Task completed'", "Notify me 'Meeting in 5 minutes'", "Show notification about deadline"]
  },
  // Tier 1: Context-Switching Tools
  {
    name: "get_frontmost_app_name",
    description: "Returns the name of the currently focused app",
    inputs: [],
    examples: ["What app is currently active?", "Which application is in focus?", "Get the name of the frontmost app"]
  },
  {
    name: "get_active_window_title",
    description: "Gets the title of the current frontmost window",
    inputs: [],
    examples: ["What window is currently active?", "Get the title of the front window", "What's the current window title?"]
  },
  {
    name: "copy_selected_text_to_clipboard",
    description: "Forces Cmd+C and captures clipboard content",
    inputs: [],
    examples: ["Copy the selected text to clipboard", "Copy highlighted content", "Copy selection to clipboard"]
  },
  {
    name: "paste_text_into_front_app",
    description: "Types or pastes generated content back into the user's current app",
    inputs: ["text"],
    examples: ["Paste 'Hello World' into the current app", "Type this text into the active window", "Insert text into the frontmost application"]
  },
  // Tier 2: Notes.app Tools
  {
    name: "list_notes_in_folder",
    description: "Return all note titles in a specific folder (default: 'All iCloud')",
    inputs: ["folder_name"],
    examples: ["List all notes in All iCloud", "Show notes in Work folder", "Get note titles from Personal folder"]
  },
  {
    name: "get_note_content",
    description: "Read full content of a named note",
    inputs: ["note_name"],
    examples: ["Get content of Meeting Notes", "Read the Shopping List note", "Show content of Project Ideas"]
  },
  {
    name: "create_note",
    description: "Agent writes a new note with title and body",
    inputs: ["title", "body"],
    examples: ["Create a note titled 'Meeting Notes' with content", "Make a new note called 'Shopping List'", "Write a note about the project"]
  },
  {
    name: "update_note",
    description: "Agent rewrites or appends to a note",
    inputs: ["note_name", "body"],
    examples: ["Update Meeting Notes with new content", "Rewrite the Shopping List", "Replace content of Project Ideas"]
  },
  // Tier 2: Browser Tools (Safari/Arc/Chrome)
  {
    name: "get_active_tab_url",
    description: "Get current tab's URL from Safari/Arc/Chrome",
    inputs: [],
    examples: ["What's the current tab URL?", "Get the active tab URL", "Show me the current page URL"]
  },
  {
    name: "get_active_tab_title",
    description: "Get current tab's title from Safari/Arc/Chrome",
    inputs: [],
    examples: ["What's the current tab title?", "Get the active tab title", "Show me the current page title"]
  },
  {
    name: "open_url_in_new_tab",
    description: "Agent opens a URL in a new tab in Safari/Arc/Chrome",
    inputs: ["url"],
    examples: ["Open https://example.com in a new tab", "Navigate to Google in new tab", "Open the project website"]
  },
  {
    name: "search_google",
    description: "Triggers a Google search in Safari/Arc/Chrome",
    inputs: ["query"],
    examples: ["Search Google for 'LLMs vs RAG'", "Look up 'best restaurants near me'", "Google search for 'weather today'"]
  },
  {
    name: "take_screenshot", 
    description: "Take a screenshot of the current screen for visual context analysis",
    inputs: [],
    examples: ["Take a screenshot to understand current context", "Capture current screen for analysis", "Screenshot for visual context"]
  }
];

module.exports = { TOOL_REGISTRY }; 