# 🧠 Advanced AI Assistant: Conditional Logic & Smart Execution

Your AI assistant now supports sophisticated conditional logic and intelligent tool orchestration!

## 🔀 **Conditional Logic (If/Then/Else)**

### **Syntax:**
```
"if [condition] then [action] else [fallback_action]"
```

### **Examples:**

**Basic Conditional:**
```
User: "if I don't have ChatGPT open in my tabs then open it"
```
**What happens:**
1. ✅ Checks browser tabs for ChatGPT
2. 🔍 LLM evaluates if condition is true/false
3. ⚡ If not found → Opens ChatGPT tab
4. ✨ If found → No action (reports status)

**With Else Branch:**
```
User: "if Omar is in my contacts then call him else message him"
```
**What happens:**
1. 🔍 Searches contacts for Omar
2. 🧠 LLM evaluates if contact exists
3. ✅ If found → Starts FaceTime call
4. 📱 If not found → Sends iMessage

**Complex Example:**
```
User: "if YouTube is open then get its content else search for coding tutorials"
```

**Music Control Examples:**
```
User: "if music is playing then pause it else start playing music"
User: "if Spotify is playing then skip to next track else play Spotify"
User: "if music is paused then resume it else check what's playing"
```

## ⛓️ **Sequential Tool Execution (Dependencies)**

The system automatically detects when tools need to run in sequence based on dependencies:

### **Auto-Detected Dependencies:**
- **`call_llm`** needs output from: `get_open_tabs`, `get_open_apps`, `find_contact`, etc.
- **`send_imessage`** / **`start_facetime_call`** need contact info first
- **Analysis tools** need data collection tools to run first

### **Example - Sequential Execution:**
```
User: "find Omar's contact and analyze if I should call or text him"
```
**Execution Order:**
1. 🔍 `find_contact` → Gets Omar's contact details
2. 🧠 `call_llm` → Analyzes contact info and decides best method
3. 📞 Executes recommended action

## 🧠 **Call LLM Meta-Tool**

### **Purpose:**
A special tool that lets the AI call itself with custom prompts and context.

### **Automatic Usage:**
- **Decision Making**: "Should I call or text?"
- **Data Analysis**: Analyzing tool outputs
- **Condition Evaluation**: Determining if conditions are true/false

### **Manual Usage:**
```
User: "analyze my browser tabs and tell me what I'm working on"
```
**What happens:**
1. 🔍 `get_open_tabs` → Gets tab data
2. 🧠 `call_llm` → Analyzes tabs with prompt: "What is this person working on?"
3. ✨ Returns intelligent analysis

## 🎵 **Enhanced Music Control**

### **Smart Music Detection:**
The system now intelligently detects and controls:
- **Spotify** (preferred)  
- **Apple Music** (fallback)

### **Available Music Commands:**
- **`play_pause_music`**: Smart toggle (auto-detects active app)
- **`spotify_control`**: Advanced Spotify control with specific actions

### **Spotify-Specific Actions:**
```bash
"play Spotify"          → Starts playing
"pause Spotify"         → Pauses playback  
"next track on Spotify" → Skips to next song
"previous Spotify song" → Goes to previous song
"Spotify status"        → Shows current track info
"toggle Spotify"        → Play/pause toggle
```

### **Smart Responses:**
```bash
✅ "Spotify is now playing - Shape of You by Ed Sheeran (÷)"
✅ "Music is now paused"  
✅ "Skipped to next track - Bad Habits by Ed Sheeran (=)"
✅ "Spotify is playing: Blinding Lights by The Weeknd (After Hours) (2:31 / 3:20)"
```

## 🎯 **Execution Types**

### **1. Parallel Execution (Default)**
```
User: "open YouTube and also check what apps are running"
```
- ⚡ Both tools run simultaneously
- 🚀 Fastest for independent actions

### **2. Sequential Execution (Auto-Detected)**
```
User: "get my contacts and analyze who I talk to most"
```
- 🔍 First: Gets contacts
- 🧠 Then: LLM analyzes the contact data
- ⛓️ Second tool uses first tool's output

### **3. Conditional Execution**
```
User: "if music is playing then pause it else start playing music"
```
- 🔍 First: Checks music status
- 🧠 Then: LLM decides which action
- ⚡ Finally: Executes chosen action

## 📊 **Smart Logging**

Watch the console for detailed execution flow:

```bash
🔀 Conditional logic detected: { type: 'conditional', condition: '...' }
🔀 Conditional detected: IF "I don't have ChatGPT open" THEN "open it"
🔀 Condition "I don't have ChatGPT open" evaluated as: TRUE
🔀 Executing THEN branch: "open it"

⛓️ Sequential execution needed: [{ tool: 'call_llm', dependsOn: ['get_open_tabs'] }]
⛓️ Executing tools sequentially: ['get_open_tabs', 'call_llm']
```

## 🚀 **Performance Optimizations**

### **LLM Call Reduction:**
- **Simple tools**: Skip LLM variable extraction (regex patterns)
- **No-param tools**: Skip LLM entirely
- **Smart caching**: Reuse results when possible

### **Execution Efficiency:**
- **Parallel by default**: Independent tools run simultaneously
- **Sequential when needed**: Dependency-aware execution
- **Conditional branching**: Only execute necessary paths

## 💡 **Advanced Use Cases**

### **Intelligent Workflows:**
```
User: "if I have unread messages then summarize them else check my calendar"
```

### **Context-Aware Actions:**
```
User: "find John's contact and if he has multiple numbers then ask me which one to call"
```

### **Data-Driven Decisions:**
```
User: "get my browser tabs and if I have more than 10 then close the oldest ones"
```

### **Multi-Step Analysis:**
```
User: "check what's playing, analyze if it matches my work mood, and adjust volume accordingly"
```

## 🎨 **Tips for Best Results**

### **✅ Good Conditional Patterns:**
- `"if X then Y"` - Simple condition
- `"if X then Y else Z"` - With fallback
- Use natural language for conditions
- Be specific about actions

### **❌ Avoid:**
- Overly complex nested conditions
- Very long conditional chains
- Ambiguous conditions

### **🔥 Power User Examples:**
```
"if I don't have Slack open then open it, get my messages, and summarize what I missed"

"check if YouTube is open, if yes get the current video title, else search for productivity tips"

"if Omar is online then video call him, else send him a message asking when he'll be free"

"if Spotify is playing then show me what's playing, else play my liked songs"

"if music is too loud then lower volume to 30, else check what's currently playing"

"if I'm listening to music then skip to next track, else start playing focus music"
```

---

**🎉 Your assistant is now capable of complex reasoning, conditional logic, and intelligent tool orchestration!**

Try commands with "if/then/else" patterns and watch the magic happen! ✨ 