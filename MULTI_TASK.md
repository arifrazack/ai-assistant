# 🔀 Multi-Task Processing Documentation

Your AI assistant now supports executing multiple tasks in a single command using **"and also"** for parallel execution and **"and then"** for sequential execution with data passing.

## 🎯 How It Works

### **"and also"** - Parallel Execution
When you use **"and also"** in your command, the assistant:
1. **Splits** your request into separate tasks
2. **Analyzes** each task independently 
3. **Selects** appropriate tools for each task
4. **Executes** all tools simultaneously
5. **Provides** a comprehensive summary

### **"and then"** - Sequential Execution with Data Passing  
When you use **"and then"** in your command, the assistant:
1. **Splits** your request into separate tasks
2. **Executes** the first task completely
3. **Waits** for the first task to finish
4. **Injects** the output from the first task into the second task
5. **Executes** the second task with the enhanced context
6. **Provides** results from both tasks

## 💡 Example Commands

### **"and also"** Examples (Parallel)
```
"imessage Aleena 'lol' and also ft Omar"
→ Sends iMessage to Aleena AND starts FaceTime call with Omar (simultaneously)

"text John 'running late' and also check what tabs are open"
→ Sends text message AND lists browser tabs (simultaneously)

"call Sarah and also open google.com"
→ Starts FaceTime call AND opens Google in browser (simultaneously)
```

### **"and then"** Examples (Sequential with Data Passing)
```
"get the list of open apps and then email the list to Arif"
→ Gets list of apps, WAITS for completion, then emails that list to Arif

"find contact for John and then call him"
→ Searches for John's contact info, then uses that info to start FaceTime call

"check what's in my clipboard and then text Sarah with that content"
→ Gets clipboard content, then sends that content as a message to Sarah

"get my open browser tabs and then analyze what I'm working on"
→ Gets tab list, then uses AI to analyze the tab data and determine work focus
```

### Advanced Multi-Task Examples
```
"imessage Mom 'I'll be home soon' and also search for best pizza places and also check what apps are running"
→ Executes 3 tasks: iMessage + web search + list apps

"ft John and also open youtube.com and also set volume to 50"
→ FaceTime call + open website + adjust volume
```

### Complex Scenarios
```
"send message to Omar about the meeting and also search YouTube for JavaScript tutorials and also check what's in the front window"
→ Smart parsing: each task gets appropriate tool
```

## 🧠 Intelligent Task Matching

The system intelligently matches tools to tasks using keyword recognition:

### Communication Tools
- **iMessage**: `imessage`, `text`, `message`, `send`, `msg`
- **FaceTime**: `facetime`, `ft`, `call`, `video call`, `video`

### Browser Tools  
- **Tabs**: `tabs`, `browser`, `chrome`, `safari`, `tab`
- **Open URL**: `open`, `navigate`, `browse`, `website`, `url`
- **Search**: `search`, `google`, `look up`, `find`
- **YouTube**: `youtube`, `videos`, `video search`

### System Tools
- **Apps**: `apps`, `applications`, `running`, `app`
- **Window**: `window`, `front`, `current`, `active`
- **Clipboard**: `clipboard`, `paste`, `copy`
- **Type**: `type`, `enter`, `input`

## 🔄 Processing Flow

### **"and also"** Flow (Parallel)
```
Input: "imessage John 'hello' and also ft Sarah"
          ↓
Parse Tasks: ["imessage John 'hello'", "ft Sarah"]
          ↓
Analyze Each:
- Task 1 → send_imessage tool
- Task 2 → start_facetime_call tool
          ↓
Execute Both Simultaneously: [send_imessage, start_facetime_call]
          ↓
Generate Response: Summary of both actions
```

### **"and then"** Flow (Sequential with Data Passing)
```
Input: "get open apps and then email the list to Arif"
          ↓
Parse Tasks: ["get open apps", "email the list to Arif"]
          ↓
Step 1: Execute first task
- get_open_apps → Returns: "Safari, Mail, Notes, Calculator"
          ↓
Step 2: Wait for completion, then inject output into second task
- Enhanced message: "email the list to Arif"
                   + "Output from previous step: get_open_apps: Safari, Mail, Notes, Calculator"
          ↓
Step 3: Execute second task with enhanced context
- gmail_send_email → Uses the app list in the email body
          ↓
Generate Response: Summary of both sequential actions
```

## 🎯 Smart Variable Extraction

Each tool gets variables from its most relevant task:

```
"text Mom 'dinner ready' and also open netflix.com"

Task Matching:
- send_imessage ← "text Mom 'dinner ready'"
  → {contact_name: "Mom", message: "dinner ready"}
  
- open_browser_tab ← "open netflix.com"
  → {url: "netflix.com", browser: "default"}
```

## 🔍 Examples by Category

### **Communication + Information**
```
"imessage Dad 'on my way' and also what tabs are open"
"ft Sarah and also check running apps"
"text John and also get clipboard contents"
```

### **Communication + Browser**
```
"call Mom and also open google.com"
"imessage Omar and also search for restaurants"
"ft John and also open YouTube"
```

### **Browser + System**
```
"open reddit.com and also set volume to 30"
"search for iPhone reviews and also check front window"
"get Chrome tabs and also find contact for Sarah"
```

### **Triple Tasks**
```
"text Mom 'hello' and also ft Dad and also open spotify.com"
"imessage John and also check tabs and also set volume to 50"
"call Sarah and also search YouTube and also get running apps"
```

## 🆚 **"and also"** vs **"and then"** - Key Differences

| Feature | **"and also"** (Parallel) | **"and then"** (Sequential) |
|---------|---------------------------|------------------------------|
| **Execution** | Simultaneous | Step-by-step |
| **Speed** | ⚡ Faster | 🔄 Slower (waits for first) |
| **Data Flow** | Independent tasks | Output of first → Input of second |
| **Use Case** | Unrelated actions | When second needs first's result |
| **Error Handling** | One fails, others continue | First fails → stops chain |

### When to use **"and also"**:
- ✅ Independent actions: "text Mom and also open Netflix"  
- ✅ Maximum speed needed
- ✅ Actions don't depend on each other

### When to use **"and then"**:
- ✅ Second action needs first's output: "get tabs and then analyze them"
- ✅ Sequential workflow required
- ✅ Data needs to flow between tasks

## ⚡ Performance Features

### **Parallel Execution ("and also")**
- All tools run simultaneously for maximum speed
- No waiting between tasks

### **Sequential Execution ("and then")**
- Waits for first task completion
- Injects output into second task context
- Ensures proper data flow

### **Smart Deduplication**
- If multiple tasks need the same tool, it runs once
- Efficient resource usage

### **Graceful Handling**
- **Parallel**: If one task fails, others continue
- **Sequential**: If first task fails, chain stops
- Clear error reporting per task

## 🎉 Benefits

### **Efficiency**
- ✅ Execute multiple actions in one command
- ✅ Save time with batch operations
- ✅ Natural conversation flow

### **Intelligence**
- ✅ Smart task parsing and matching
- ✅ Context-aware variable extraction
- ✅ Comprehensive response summaries

### **Flexibility** 
- ✅ Mix any combination of tools
- ✅ Handle 2, 3, or more tasks
- ✅ Fallback to single-task if no "and also"

## 🚀 Try It Now!

### **Parallel Examples:**
```
"imessage [contact] '[message]' and also ft [contact]"
"text Mom 'love you' and also open github.com and also check what apps are running"
```

### **Sequential Examples:**
```
"get open apps and then email the list to Arif"
"find John's contact and then call him"
"check clipboard content and then text Sarah with it"
```

### **Advanced Mixed Usage:**
While you can't mix "and also" and "and then" in the same command, you can chain multiple sequential steps:
```
"get browser tabs and then analyze what I'm working on and then text Mom about my progress"
```

Your assistant now handles both parallel and sequential multi-task requests with intelligent data passing! 🎯✨ 