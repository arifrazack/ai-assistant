# 🌐 Browser Tools Documentation

This document describes the powerful browser and web tools available in your AI assistant.

## 🛠️ Available Tools

### 1. **Get Open Tabs** (`get_open_tabs`)
- **Description**: Lists all currently open tabs from Safari or Chrome
- **Usage**: `"What tabs are open in Safari?"` or `"Show me Chrome tabs"`
- **Parameters**: 
  - `browser` (optional): "Safari" or "Google Chrome" (defaults to Safari)

### 2. **Open Browser Tab** (`open_browser_tab`)
- **Description**: Opens a URL in your default browser or a specified browser
- **Usage**: `"Open google.com"` or `"Open youtube.com in Chrome"`
- **Parameters**:
  - `url` (required): The website URL to open
  - `browser` (optional): "Safari", "Google Chrome", or "Arc" (defaults to your default browser)
- **Features**: 
  - Uses your system's default browser when no browser specified
  - Automatically adds `https://` if no protocol specified
  - Works with any valid URL

### 3. **Web Search** (`search_web`)
- **Description**: Searches Google in your preferred browser
- **Usage**: `"Search for 'weather today'"` or `"Google 'best restaurants NYC' in Chrome"`
- **Parameters**:
  - `query` (required): Your search terms
  - `browser` (optional): Browser to use (defaults to Safari)

### 4. **YouTube Search** (`search_youtube`)
- **Description**: Searches for videos on YouTube
- **Usage**: `"Search YouTube for 'cooking tutorials'"` or `"Find music videos"`
- **Parameters**:
  - `query` (required): What to search for
  - `browser` (optional): Browser to use

### 5. **Advanced Web Browsing** (`browse_web_playwright`) 🤖
- **Description**: Automated web browsing with AI capabilities
- **Usage**: `"Browse and research AI news"` or `"Get information about stock market"`
- **Features**:
  - Automated Google searching
  - Content extraction
  - Screenshot capability
  - Result summarization

## 🎯 Example Commands

### Basic Web Tasks
```
"What tabs do I have open?"
"Open reddit.com"
"Search for 'iPhone 15 reviews'"
"Search YouTube for 'JavaScript tutorials'"
```

### Advanced Tasks  
```
"Open GitHub in Chrome and show me trending repositories"
"Search for 'best pizza NYC' and open the first result"
"Research the latest AI developments using automated browsing"
```

### Cross-Browser Support
```
"Open twitter.com in Arc"
"Show me Chrome tabs"
"Search DuckDuckGo for 'privacy tools' in Safari"
```

## 🔧 Setup Requirements

### Basic Tools (Ready to Use)
- ✅ `get_open_tabs`
- ✅ `open_browser_tab`  
- ✅ `search_web`
- ✅ `search_youtube`

### Advanced Tools (Requires Installation)
- ⚠️ `browse_web_playwright`: Requires Playwright installation

#### To Install Playwright:
```bash
npm install playwright
npx playwright install
```

## 🎉 Benefits

- **Seamless Integration**: Control your browser through natural language
- **Multi-Browser Support**: Works with Safari, Chrome, and Arc
- **Smart URL Handling**: Automatically formats URLs
- **Search Integration**: Direct access to Google, YouTube, and other search engines
- **Automated Browsing**: Advanced AI-powered web interaction

## 🤖 AI Intelligence

The assistant can now:
- **Understand Context**: "Open the GitHub repo for React" → Searches and opens directly
- **Multi-Step Tasks**: "Research competitors and open their websites"
- **Smart Defaults**: Remembers your preferred browser
- **Content Extraction**: Gets key information from websites automatically

Your assistant is now a powerful web browsing companion! 🚀 