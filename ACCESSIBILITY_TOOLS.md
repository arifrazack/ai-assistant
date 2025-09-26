# 🔍 Accessibility Tools Documentation

This document describes the advanced accessibility tools available in your AI assistant for deep system integration and window content access.

## 🛠️ Available Tools

### 1. **Get Front Window Contents** (`get_front_window_contents`)
- **Description**: Extracts readable text content from the currently active/frontmost window
- **Usage**: `"What's in the front window?"` or `"Read current window content"`
- **Technology**: Uses `axcli` (if available) or AppleScript fallback
- **Features**:
  - Works with most macOS applications
  - Automatically falls back to AppleScript if axcli unavailable
  - Respects accessibility permissions

### 2. **Get Accessible Tabs** (`get_accessible_tabs`)
- **Description**: Retrieves detailed information about browser tabs including their content
- **Usage**: `"Get all tabs with content"` or `"Show detailed tab information"`
- **Technology**: Uses `axcli` (preferred) or AppleScript fallback
- **Returns**: Array of tab objects with:
  - `title`: Tab title
  - `url`: Tab URL
  - `contents`: Page text content (axcli only)

### 3. **Search Tab Contents** (`search_tabs_content`) 
- **Description**: Search through all browser tab contents for specific text or topics
- **Usage**: `"Find tabs about JavaScript"` or `"Search tabs for 'machine learning'"`
- **Parameters**:
  - `query` (required): What to search for
- **Features**:
  - Searches titles, URLs, and content (if available)
  - Case-insensitive matching
  - Returns matching tabs with relevance

## 🎯 Example Commands

### Window Content Access
```
"What's in the front window?"
"Read the current window content"
"Get text from the active window"
"What am I looking at right now?"
```

### Advanced Tab Management
```
"Get all tabs with their content"
"Show me detailed tab information"
"What content is in my browser tabs?"
```

### Intelligent Tab Search
```
"Find tabs about JavaScript"
"Search tabs for 'machine learning'"
"Look for tabs mentioning iPhone"
"Show tabs about cooking recipes"
```

## 🔧 Setup & Dependencies

### Basic Functionality (Ready Now)
✅ **AppleScript Fallbacks** - Work immediately with macOS accessibility
- `get_front_window_contents` - Basic window text access
- `get_accessible_tabs` - Tab titles and URLs
- `search_tabs_content` - Search by title/URL

### Enhanced Functionality (Requires axcli)
⚡ **Full Content Access** - Requires `axcli` installation
- Complete page text extraction from tabs
- Advanced window content analysis
- More detailed accessibility information

### Check Your Setup
```bash
# Check accessibility tool status
npm run check-accessibility

# Test accessibility features
npm run test-accessibility
```

## 🔐 Permissions Required

### macOS System Preferences → Security & Privacy → Accessibility
Enable accessibility access for:
- **Terminal** (or your terminal app)
- **Node.js** 
- **Your browser** (Chrome, Safari, etc.)

### Steps to Enable:
1. Open **System Preferences** → **Security & Privacy** → **Accessibility**
2. Click the **lock** to make changes
3. Add your **Terminal app** and **browsers**
4. Restart terminal and try the tools

## 🚀 Technical Implementation

### Smart Fallback System
```
axcli available? → Use axcli (full features)
axcli missing? → Use AppleScript (basic features)
Permissions denied? → Graceful error handling
```

### Error Handling
- Automatic fallback to AppleScript
- Clear error messages for permission issues
- Graceful degradation when content unavailable

## 💡 Use Cases

### Content Analysis
- **Research**: Find tabs related to your current project
- **Organization**: See what content you have open across tabs
- **Context**: Understand what's in your active window

### Productivity
- **Tab Management**: Find tabs by content, not just title
- **Information Gathering**: Extract text from current window
- **Multi-tasking**: Keep track of multiple information sources

### Accessibility
- **Content Reading**: AI can read and summarize window content
- **Context Awareness**: Assistant knows what you're looking at
- **Intelligent Assistance**: Provide help based on current window

## 🔧 Troubleshooting

### "axcli not found" Warning
**This is normal!** - Tools work with AppleScript fallbacks
- ✅ Basic functionality works immediately
- ⚠️ Full content extraction requires axcli
- 💡 Check `npm run check-accessibility` for status

### Permission Denied Errors
1. Enable Accessibility permissions in System Preferences
2. Restart Terminal/IDE
3. Test with `npm run test-accessibility`

### Browser Not Responding
1. Ensure browser is running
2. Check if browser allows AppleScript access
3. Try different browser (Chrome → Safari)

## 🎉 Benefits

- **Deep System Integration**: Access any window content
- **Intelligent Content Search**: Find information across browser tabs  
- **Context Awareness**: AI knows what you're looking at
- **Seamless Fallbacks**: Works even without advanced tools
- **Privacy Focused**: All processing done locally

Your AI assistant now has powerful accessibility capabilities for deeper system understanding! 🚀✨ 