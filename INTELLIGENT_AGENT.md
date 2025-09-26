# 🧠 Intelligent LLM Agent System

Your chat application now features a sophisticated **multi-step LLM processing pipeline** that analyzes user intent, selects appropriate tools, and executes system actions automatically.

## 🔄 **How It Works**

When you send a message, the system goes through 5 intelligent steps:

### **Step 1: Intent Classification** 🎯
The AI determines what type of request you're making:
- `system_action`: You want to perform a system action (open app, type text, etc.)
- `question`: You're asking a question  
- `conversation`: You want to have a conversation
- `information`: You want information about something
- `other`: Doesn't fit other categories

### **Step 2: Tone Analysis** 😊
The AI analyzes your emotional tone:
- `friendly`: Warm, enthusiastic language
- `polite`: Respectful, courteous language
- `urgent`: Expressing urgency or immediate need
- `casual`: Informal, relaxed language
- `frustrated`: Showing annoyance or impatience
- `neutral`: Neither positive nor negative

### **Step 3: Tool Selection** 🛠️
If your intent is `system_action`, the AI selects appropriate tools:
- `open_app`: Open macOS applications
- `type_text`: Type text into active windows
- `click_position`: Click at screen coordinates
- `get_open_apps`: List currently running apps
- `send_imessage`: Send iMessages to contacts (with smart contact resolution)
- `start_facetime_call`: Make FaceTime calls (with smart contact resolution)
- `get_clipboard`: Read clipboard content
- `set_clipboard`: Copy text to clipboard  
- `play_pause_music`: Control music playback
- `set_volume`: Adjust system volume
- `find_contact`: Search contacts for phone numbers and emails

### **Step 4: Variable Extraction** 📊
The AI extracts the specific parameters needed for each tool:
- For `open_app`: Extracts the app name (e.g., "Notes", "Safari")
- For `type_text`: Extracts the text to type
- For `click_position`: Extracts x,y coordinates
- For `get_open_apps`: No variables needed
- For `send_imessage`: Extracts contact name and message content

### **Step 5: Execution & Response** ⚡
The AI executes the tools and generates an intelligent response based on:
- Your original tone (matches your communication style)
- The results of any system actions performed
- Context-aware explanations of what was accomplished

## 🎪 **Example Interactions**

### **System Actions**
**You:** "Open the Notes app please"
- **Intent:** `system_action`
- **Tone:** `polite`  
- **Tools:** `open_app`
- **Variables:** `{"app_name": "Notes"}`
- **Result:** ✅ Opens Notes app
- **Response:** *"I've politely opened the Notes app for you as requested."*

### **Multiple Tools**
**You:** "Open Safari and then type 'hello world'"**
- **Intent:** `system_action`
- **Tone:** `neutral`
- **Tools:** `open_app`, `type_text`
- **Variables:** `{"app_name": "Safari"}`, `{"text": "hello world"}`
- **Results:** ✅ Opens Safari, ✅ Types text
- **Response:** *"I've opened Safari and typed 'hello world' for you."*

### **Questions**
**You:** "What's the weather like?"**
- **Intent:** `question`
- **Tone:** `casual`
- **Tools:** None needed
- **Response:** *Conversational response about weather*

### **Messaging Actions**
**You:** "Send a message to Mom saying I'll be home for dinner"**
- **Intent:** `system_action`
- **Tone:** `neutral`
- **Tools:** `send_imessage`
- **Variables:** `{"contact_name": "Mom", "message": "I'll be home for dinner"}`
- **Result:** ✅ Sends iMessage to Mom
- **Response:** *"I've sent the message to Mom letting her know you'll be home for dinner."*

## 🖥️ **Available System Tools**

### **1. Open Applications** 📱
```bash
Command: "Open [app name]"
Examples:
- "Open Notes"
- "Launch Safari"  
- "Start Calculator"
- "Open Mail app"
```

### **2. Type Text** ⌨️
```bash
Command: "Type [text]"
Examples:
- "Type 'Hello World'"
- "Enter my email address"
- "Write 'Meeting at 3pm'"
```

### **3. Click Position** 🖱️
```bash
Command: "Click at [coordinates]"
Examples:
- "Click at position 100, 200"
- "Click the button at 450, 300"
```

### **4. List Open Apps** 📋
```bash
Command: "What apps are open?"
Examples:
- "Show me running applications"
- "List open programs"
- "What's currently running?"
```

### **5. Send iMessage** 💬
```bash
Command: "Send message to [contact] saying [message]"
Examples:
- "Send a message to John saying 'Hello'"
- "Text Mom 'I'll be home soon'"
- "Send iMessage to Sarah 'Meeting at 3pm'"
- "Message my friend Dave 'Running late'"
```

### **6. FaceTime Calls** 📹
```bash
Command: "Call [contact] on FaceTime"
Examples:
- "Call John on FaceTime"
- "Start a FaceTime call with Mom"
- "Video call Sarah"
- "FaceTime my friend Mike"
```

### **🔍 Smart Contact Resolution**
Both iMessage and FaceTime now automatically search through your Contacts app to find:
- **Phone numbers** (preferred for FaceTime/iMessage)
- **Email addresses** (backup method)
- **Best match** based on name similarity
- **Exact contact details** instead of just names

This means saying **"Call Omar"** will automatically find "Omar Razack" in your contacts and use his actual phone number for the call!

### **7. Clipboard Management** 📋
```bash
Commands: 
- "What's in the clipboard?" (get)
- "Copy [text] to clipboard" (set)
Examples:
- "Show me clipboard content"
- "Read the clipboard"  
- "Copy 'Hello World' to clipboard"
- "Set clipboard to my email address"
```

### **8. Music Control** 🎵
```bash
Command: "Play/pause music"
Examples:
- "Play music"
- "Pause the music"
- "Toggle music playback"
- "Start/stop music"
```

### **9. Volume Control** 🔊
```bash
Command: "Set volume to [number]"
Examples:
- "Set volume to 50"
- "Turn volume up to 80"
- "Make volume 25"
- "Set volume to maximum"
```

### **10. Contact Search** 🔍
```bash
Command: "Find contact for [name]"
Examples:
- "Find contact for John"
- "Look up Sarah's contact info"
- "Search for Omar Razack contact details"
- "What's Mike's phone number?"
```

## 💻 **Technical Architecture**

### **Backend Processing Pipeline**
```
User Message 
    ↓
🧠 Intent Classification (GPT-3.5-turbo)
    ↓
😊 Tone Analysis (GPT-3.5-turbo)
    ↓
🛠️ Tool Selection (GPT-3.5-turbo)
    ↓
📊 Variable Extraction (GPT-3.5-turbo) 
    ↓
⚡ Tool Execution (System APIs)
    ↓
💬 Response Generation (GPT-3.5-turbo)
    ↓
Frontend Display
```

### **System Integration**
- **Frontend:** Next.js with intelligent UI showing analysis
- **Backend:** Node.js with multi-step LLM pipeline
- **Tools API:** macOS system integration via AppleScript
- **LLM:** OpenAI GPT-3.5-turbo for all processing steps

## 🎨 **UI Features**

The frontend now displays:
- **Analysis Panel:** Shows detected intent and tone
- **Tool Usage:** Visual indicators of which tools were used
- **Results:** Success/failure status of each system action
- **Color-coded Tags:** Different colors for intents and tones

## 🚀 **Getting Started**

1. **Make sure both servers are running:**
   ```bash
   npm run dev:all
   ```

2. **Try system commands:**
   - "Open Calculator"
   - "Launch Safari please"
   - "Type 'Hello there'"

3. **Try regular questions:**
   - "How are you?"
   - "What can you help me with?"

4. **Watch the analysis panel** to see how the AI processes your requests!

## 🔧 **Adding New Tools**

To add new system capabilities:

1. **Create the tool function** in `lib/tools/new_tool.ts`
2. **Add to tool registry** in `lib/tool_registry.ts`  
3. **Update tools API** in `pages/api/tools.ts`
4. **Update backend registry** in `backend/server.js`

The AI will automatically learn to use new tools based on their descriptions!

## 🎯 **Advanced Usage**

The system can handle complex requests:
- **"Open Notes and type my grocery list"**
- **"Launch Safari and then show me what apps are running"**  
- **"I need to open Calculator urgently"** (adapts to urgent tone)
- **"Copy my email to clipboard and then call Mom on FaceTime"**
- **"Turn the volume down to 30 and pause the music"**
- **"Send a message to John saying 'Meeting moved to 4pm' and then set volume to 60"**
- **"What's in my clipboard and then copy it to a new note"**

Your AI agent is now intelligent enough to understand context, emotion, and intent - making it feel more natural and helpful! 🎉 