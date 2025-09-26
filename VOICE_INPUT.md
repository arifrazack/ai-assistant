# 🎤 Voice Input & Speech Recognition

Your AI assistant now supports intelligent voice input with real-time speech recognition!

## 🚀 **Features**

### **🎙️ Real-Time Speech Recognition**
- **Live transcription** using browser's native speech recognition
- **High accuracy** speech-to-text conversion
- **Automatic message sending** when speech is complete
- **Visual feedback** with recording indicators

### **🌐 Browser Support**
- ✅ **Chrome** (recommended)
- ✅ **Edge** (Chromium-based)
- ✅ **Safari** (macOS/iOS)
- ❌ **Firefox** (limited support)

### **🎯 Smart Integration**
- **Seamless chat integration** - voice input works exactly like typing
- **Tool execution** - voice commands trigger tools automatically
- **Multi-task support** - say "play music and also check weather"
- **Conditional logic** - "if it's raining then turn on heater"

## 🎮 **How to Use**

### **1. Basic Voice Input**
1. Click the **🎤 microphone button** in the chat interface
2. **Grant microphone permission** when prompted
3. **Speak your message** clearly
4. The message will be **automatically sent** when complete

### **2. Voice Commands Examples**
```bash
"Play my favorite music"
"Send a message to John saying I'll be late"
"What's the weather like today?"
"Open Chrome and search for AI news"
"If Spotify is playing then pause it, otherwise play music"
```

### **3. Visual Indicators**
- **🎤** - Ready to record
- **🎤🔴** - Currently recording (with pulse animation)
- **🎙️ Listening...** - Processing your speech
- **"Voice input: [text]"** - Shows what was heard

## 🔧 **Technical Details**

### **Speech Recognition API**
- Uses browser's native **Web Speech API**
- **Continuous recognition** for natural speaking
- **Real-time results** with confidence scoring
- **Language support**: English (US) default

### **Tools Available via Voice**
All your existing tools work with voice input:

#### **System Control**
```bash
"Open Spotify"
"Type 'Hello world'"
"Click at position 100, 200"
"Set volume to 50%"
```

#### **Communication**
```bash
"Send iMessage to Mom saying I'm on my way"
"Start FaceTime call with John"
"Find contact information for Sarah"
```

#### **Web & Browser**
```bash
"Search Google for best restaurants"
"Open new tab to YouTube"
"Get my open tabs"
"Browse to wikipedia.com"
```

#### **Music Control**
```bash
"Play music"
"Skip to next song"
"What song is playing?"
"Pause Spotify"
```

#### **Smart Features**
```bash
"Get clipboard content"
"Check microphone status"
"Call LLM to analyze this data"
"Create Calendly invite for john@email.com"
```

## ⚙️ **Setup & Configuration**

### **Browser Permissions**
1. **Allow microphone access** when prompted
2. **Check browser settings** if voice input doesn't work
3. **Test with simple commands** like "hello"

### **Troubleshooting**

#### **Voice Input Not Working**
- ✅ **Check microphone permissions** in browser settings
- ✅ **Use Chrome or Edge** for best support
- ✅ **Speak clearly** and at normal volume
- ✅ **Check microphone hardware** is working

#### **Low Recognition Accuracy**
- ✅ **Speak slowly and clearly**
- ✅ **Reduce background noise**
- ✅ **Use short, clear commands**
- ✅ **Check microphone positioning**

#### **Commands Not Executing**
- ✅ **Voice input triggers same logic as typing**
- ✅ **Use natural language** - "play music" not just "play"
- ✅ **Check tool availability** - some tools may be system-specific

## 🎯 **Best Practices**

### **For Clear Recognition**
1. **Speak naturally** - no need to be robotic
2. **Use complete sentences** - "Play my music" vs "Play music"
3. **Pause briefly** before and after commands
4. **Speak at normal conversational volume**

### **For Complex Commands**
1. **Multi-task**: "Play music and also check weather"
2. **Conditional**: "If Spotify is playing then pause it"
3. **Sequential**: "First open Chrome, then search for news"
4. **Natural language**: "Send John a message saying I'll be 10 minutes late"

### **Voice Command Examples**

#### **Simple Commands**
```bash
"What time is it?"
"Play music"
"Open settings"
"Check weather"
```

#### **Complex Commands**
```bash
"Send iMessage to Sarah saying the meeting is moved to 3 PM"
"If music is playing then skip to next song, otherwise start playing"
"Open Arc browser and search for the best pizza places near me"
"Create a Calendly invite for john.doe@company.com named John Doe"
```

#### **Multi-step Commands**
```bash
"Open Spotify and also search Google for today's news"
"Send a message to Mom and then call Dad on FaceTime"
"Check if I have any new tabs open and then search for weather"
```

## 🛠️ **Developer Integration**

### **VoiceInput Component**
```tsx
import VoiceInput from '../components/VoiceInput';

<VoiceInput 
  onTranscript={(text) => console.log('Heard:', text)}
  isEnabled={true}
  className="my-voice-input"
/>
```

### **MicrophoneController Class**
```typescript
import { MicrophoneController } from '../lib/tools/microphone_control';

const mic = new MicrophoneController();
mic.startListening(
  (transcript, confidence) => console.log(transcript),
  (error) => console.error(error),
  (state) => console.log('State:', state)
);
```

### **Tool Integration**
Voice input automatically integrates with all existing tools:
- **Same processing pipeline** as text input
- **Same tool selection logic**
- **Same conditional and multi-task support**
- **Same error handling**

## 🎉 **Advanced Features**

### **Confidence Scoring**
- Each voice input includes a **confidence score**
- Low confidence results may prompt for **confirmation**
- **High confidence** commands execute immediately

### **Error Recovery**
- **Automatic retries** for unclear speech
- **Fallback to typing** if voice fails
- **Clear error messages** for permission issues

### **Multi-Language Support** (Future)
- Currently supports **English (US)**
- **Additional languages** can be configured
- **Accent adaptation** improves over time

---

**🎤 Your assistant now listens as well as it thinks!**

*Just click the microphone and start talking - your voice commands will be processed with the same intelligence as typed messages.* 