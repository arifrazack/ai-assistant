# 🔧 Voice Input Troubleshooting Guide

Having issues with voice input? Here's how to fix common problems:

## 🚨 **"Voice input error: network"**

This is the most common error. Here's how to fix it:

### **Quick Fixes**
1. **Check Internet Connection**
   - Speech recognition requires internet access
   - Try refreshing the page
   - Test other websites to confirm connectivity

2. **Use HTTPS**
   - Voice input requires HTTPS (secure connection)
   - If using localhost, this should work fine
   - For deployed sites, ensure you're using HTTPS

3. **Try Different Browser**
   - ✅ **Chrome** (recommended - best support)
   - ✅ **Edge** (good support)
   - ✅ **Safari** (decent support)
   - ❌ **Firefox** (limited/no support)

### **Browser-Specific Solutions**

#### **Chrome/Edge**
1. Check URL bar for microphone icon 🎤
2. Click it and select "Always allow"
3. Refresh the page
4. Try voice input again

#### **Safari**
1. Go to Safari > Settings > Websites > Microphone
2. Find your site and set to "Allow"
3. Refresh the page

## 🎤 **Microphone Permission Issues**

### **Grant Permissions**
1. **When prompted**, click "Allow" for microphone access
2. **If blocked**, look for 🎤 icon in address bar
3. **Manually enable** in browser settings

### **Reset Permissions**
1. **Chrome**: Settings > Privacy > Site Settings > Microphone
2. **Safari**: Safari > Settings > Websites > Microphone
3. **Edge**: Settings > Cookies and site permissions > Microphone

## 🌐 **Browser Compatibility**

### **Supported Browsers**
| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Excellent | Recommended |
| Edge | ✅ Good | Chromium-based |
| Safari | ⚠️ Limited | macOS/iOS only |
| Firefox | ❌ Poor | Experimental only |

### **Operating System Support**
- ✅ **Windows 10/11** - Full support
- ✅ **macOS** - Full support  
- ✅ **iOS Safari** - Limited support
- ⚠️ **Android Chrome** - Variable support
- ❌ **Linux** - Limited browser support

## 🔍 **Testing Steps**

### **1. Basic Test**
```bash
1. Open browser developer tools (F12)
2. Go to Console tab
3. Click the microphone button
4. Look for error messages starting with 🎤
```

### **2. Microphone Test**
```bash
1. Try a simple "Hello" command
2. Check if browser shows microphone active indicator
3. Verify microphone works in other apps
```

### **3. Network Test**
```bash
1. Check internet connection
2. Try other voice-enabled websites
3. Test on different networks (WiFi vs cellular)
```

## ⚙️ **Advanced Troubleshooting**

### **Check Browser Console**
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Click microphone button and look for errors
4. Common error patterns:
   - `network` - Internet/HTTPS issue
   - `not-allowed` - Permission denied
   - `audio-capture` - Hardware issue
   - `service-not-allowed` - HTTPS required

### **Test Commands**
Try these test commands to verify functionality:

#### **Simple Tests**
```bash
"hello"
"test"
"play music"
```

#### **Tool Tests**
```bash
"check microphone status"
"start microphone"
"get clipboard content"
```

### **Hardware Troubleshooting**
1. **Test microphone** in other applications
2. **Check microphone levels** in system settings
3. **Try different microphone** if available
4. **Restart browser** completely

## 🛠️ **Developer Debug Mode**

### **Enable Debug Logging**
Add this to browser console to see detailed logs:
```javascript
// Enable verbose speech recognition logging
window.speechDebug = true;
localStorage.setItem('voiceDebug', 'true');
```

### **Common Error Codes**
| Error | Meaning | Solution |
|-------|---------|----------|
| `network` | Internet/server issue | Check connection, use HTTPS |
| `not-allowed` | Permission denied | Grant microphone access |
| `audio-capture` | Hardware failure | Check microphone hardware |
| `no-speech` | Nothing heard | Speak louder/clearer |
| `service-not-allowed` | API blocked | Use HTTPS, check browser |

## 🔄 **Reset Everything**

If nothing works, try this complete reset:

### **1. Clear Browser Data**
```bash
1. Chrome: Settings > Privacy > Clear browsing data
2. Safari: Develop > Empty Caches
3. Edge: Settings > Privacy > Clear browsing data
```

### **2. Reset Permissions**
```bash
1. Go to site settings
2. Reset all permissions to default
3. Refresh and re-grant microphone access
```

### **3. Restart Browser**
```bash
1. Completely close browser
2. Restart browser
3. Navigate back to the site
4. Grant permissions again
```

## 📞 **Still Having Issues?**

### **Fallback Options**
1. **Type your commands** - all features work with text
2. **Use supported browser** - switch to Chrome/Edge
3. **Check system microphone** - test in other apps

### **Report Issues**
If you continue having problems:
1. Note your **browser and version**
2. Record any **console error messages**
3. Try the **troubleshooting steps** above
4. Note what **error messages** you see

### **Quick Workaround**
**All voice commands work as typed text!** Simply type what you would say:
- Instead of saying "play music" → type "play music"
- Instead of saying "send message to John" → type "send message to John"

---

**🎤 Voice input should work smoothly once properly configured!**

*Most issues are related to browser permissions or network connectivity. Follow the steps above to resolve them.* 