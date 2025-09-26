# 🚀 AI Assistant Setup Guide

This guide will walk you through setting up your AI Assistant from scratch.

## 📋 Prerequisites

### System Requirements
- **macOS** (recommended for full functionality)
- **Node.js** 18+ and npm
- **Git** for version control
- **Terminal** access

### API Keys Required
- **OpenAI API Key** (required)
- **Google OAuth Credentials** (for Google services)

---

## 🔧 Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/arifrazack/ai-assistant.git
cd ai-assistant

# Install all dependencies (frontend + backend)
npm run full-install
```

### 2. Environment Configuration

#### Frontend Environment
```bash
# Copy example file
cp env.example .env

# Edit with your values
nano .env
```

**Frontend `.env` contents:**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_DEBUG=false
NEXT_PUBLIC_DEV_MODE=true
```

#### Backend Environment
```bash
# Copy example file
cp backend/env.example backend/.env

# Edit with your API keys
nano backend/.env
```

**Backend `backend/.env` contents:**
```env
# OpenAI (REQUIRED)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Google OAuth (REQUIRED for Google services)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# Server Configuration
PORT=5001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### 3. API Keys Setup

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key and paste it in `backend/.env` as `OPENAI_API_KEY`

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. **Enable Required APIs:**
   - Google Calendar API
   - Gmail API
   - Google Drive API
   - Google Sheets API

4. **Create OAuth 2.0 Credentials:**
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:5001/api/auth/google/callback`
   - Copy **Client ID** and **Client Secret** to `backend/.env`

### 4. Voice Recognition Setup (Optional)

```bash
# Download and compile Whisper.cpp
npm run setup-whisper

# This will:
# 1. Clone whisper.cpp repository
# 2. Compile for your system
# 3. Download base English model
# 4. Set up whisper-cli executable
```

**Note:** Voice recognition works best on macOS. Windows/Linux have limited support.

### 5. System Permissions (macOS)

```bash
# Check and request accessibility permissions
npm run check-accessibility
```

**Manual Steps:**
1. **System Preferences** → **Security & Privacy** → **Privacy**
2. **Accessibility**: Add Terminal and your AI Assistant app
3. **Screen Recording**: Add Terminal (for screenshot tools)
4. **Microphone**: Allow microphone access for voice input

### 6. Initialize Contacts Database

```bash
# Create initial contacts database
npm run init-contacts

# This creates backend/data/contacts.json with sample data
# You can edit this file to add your actual contacts
```

---

## 🎯 Running the Application

### Development Mode (Recommended)

```bash
# Start everything with hot reload
npm run electron:dev
```

This command:
1. Starts the backend server (port 5001)
2. Starts the frontend dev server (port 3000)
3. Launches Electron app when servers are ready

### Manual Start (for debugging)

```bash
# Terminal 1: Start backend
npm run backend

# Terminal 2: Start frontend
npm run dev

# Terminal 3: Start Electron (after servers are running)
npm run electron
```

### Production Mode

```bash
# Build and run
npm run build
npm run electron
```

---

## ✅ Verification

### 1. Check Backend
Open http://localhost:5001/api/status in browser. Should see:
```json
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "services": {
    "openai": "connected",
    "google": "configured"
  }
}
```

### 2. Check Frontend
Open http://localhost:3000 in browser. Should see the AI Assistant interface.

### 3. Test Voice Input
1. Click the microphone icon in the notch
2. Speak a command: "What time is it?"
3. Should see transcription and response

### 4. Test Tools
Try these commands:
- "Take a screenshot"
- "What's on my calendar today?"
- "Send a test message to myself"

---

## 🐛 Troubleshooting

### Common Issues

#### "OpenAI API key not configured"
- Check `backend/.env` has correct `OPENAI_API_KEY`
- Restart backend server after adding key
- Verify key is valid at OpenAI platform

#### "Google OAuth not working"
- Verify all 4 Google APIs are enabled
- Check redirect URI matches exactly: `http://localhost:5001/api/auth/google/callback`
- Ensure Client ID and Secret are correct

#### Voice input not working
- Run `npm run setup-whisper` to install voice recognition
- Check microphone permissions in System Preferences
- macOS only: Enable accessibility permissions

#### Electron window not appearing
- Check if servers are running (backend on 5001, frontend on 3000)
- Look for error messages in terminal
- Try `npm run electron` manually after servers start

#### "Module not found" errors
- Run `npm run full-install` to reinstall dependencies
- Clear node_modules: `rm -rf node_modules backend/node_modules`
- Reinstall: `npm run full-install`

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm run electron:dev

# Check backend logs
cd backend && npm run dev

# Check system permissions
npm run check-accessibility
```

### Reset Everything

```bash
# Clean install
rm -rf node_modules backend/node_modules
npm run full-install

# Reset configuration
rm .env backend/.env
cp env.example .env
cp backend/env.example backend/.env

# Reset databases
rm -rf backend/data/
npm run init-contacts
```

---

## 🔒 Security Notes

### Environment Variables
- Never commit `.env` files to version control
- Use strong, unique JWT_SECRET in production
- Rotate API keys regularly

### Permissions
- Only grant necessary system permissions
- Review accessibility permissions periodically
- Use OAuth scopes minimally (only required permissions)

### Network
- Backend runs on localhost:5001 (not exposed externally)
- All API keys stored locally, never transmitted
- Voice processing happens locally (privacy-first)

---

## 📞 Getting Help

### Before Asking for Help
1. Check this setup guide
2. Review [Troubleshooting](#troubleshooting) section
3. Search [existing issues](https://github.com/arifrazack/ai-assistant/issues)

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community help
- **Documentation**: Check README.md and other docs

### Providing Information
When reporting issues, include:
- Operating system and version
- Node.js version (`node --version`)
- Complete error messages
- Steps to reproduce
- Configuration (without API keys)

---

## 🎉 You're Ready!

Once setup is complete, you should have:
- ✅ AI Assistant running in a floating notch window
- ✅ Voice recognition working (Shift+Alt+M globally)
- ✅ Google services connected
- ✅ 40+ automation tools available
- ✅ Real-time status updates

**Try your first command:** "Hello, what can you help me with today?"

Happy automating! 🚀
