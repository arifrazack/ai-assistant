# 🤖 AI Assistant - Intelligent Desktop Assistant

A sophisticated AI-powered personal assistant with a sleek, notch-inspired floating interface for macOS. Built with Next.js, Electron, and OpenAI, featuring voice recognition, context-aware processing, and 40+ automation tools.

![AI Assistant Demo](docs/demo.gif)

## ✨ Features

### 🎯 Core Capabilities
- **🎤 Voice Input**: Local speech recognition with Whisper.cpp (Shift+Alt+M globally)
- **🧠 Context-Aware AI**: Analyzes screenshots and selected text automatically
- **🛠️ 40+ Tools**: Calendar, email, browser automation, system control, and more
- **⚡ Real-time Updates**: Live status via Server-Sent Events
- **🔄 Multi-step Workflows**: Sequential and parallel task execution
- **💬 Natural Language**: Understands complex, multi-part requests

### 🖥️ Interface
- **🌟 Notch-Style UI**: Floating translucent window near macOS notch
- **🎨 Hover to Expand**: 45px collapsed → 180px expanded
- **🔄 Auto-hide**: Intelligently minimizes when not in use
- **🌈 Native Effects**: macOS vibrancy and blur effects

### 🔧 Automation Tools
- **📅 Calendar**: Create Google Calendar events
- **📧 Communication**: Send emails, iMessages, start FaceTime calls
- **🌐 Browser**: Google search, open URLs, web scraping with Playwright
- **💻 System**: Type text, click positions, take screenshots, control apps
- **📊 Productivity**: Google Sheets, Drive, Apple Notes integration
- **🎵 Media**: Music control, volume adjustment, notifications

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **macOS** (primary platform - Windows/Linux have limited functionality)
- **OpenAI API Key** for AI processing
- **Google OAuth** credentials for Google services integration

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arifrazack/ai-assistant.git
   cd ai-assistant
   ```

2. **Install dependencies**
   ```bash
   npm run full-install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp .env.example .env
   cp backend/.env.example backend/.env
   
   # Edit with your actual API keys
   nano .env
   nano backend/.env
   ```

4. **Set up voice recognition (optional)**
   ```bash
   npm run setup-whisper
   ```

5. **Initialize contacts database**
   ```bash
   npm run init-contacts
   ```

### Running the Application

```bash
# Development mode (recommended)
npm run electron:dev

# Or run components separately
npm run dev:all    # Backend + Frontend servers
npm run electron   # Electron app (requires servers running)
```

The app will open as a floating notch-style window at the top of your screen.

## 🔧 Configuration

### Environment Variables

Create `.env` in the root directory:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

Create `backend/.env`:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Google OAuth (for Calendar, Gmail, Drive, Sheets)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# Server Configuration
PORT=5001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs: Calendar, Gmail, Drive, Sheets
4. Create OAuth 2.0 credentials
5. Add `http://localhost:5001/api/auth/google/callback` as redirect URI

### OpenAI API Setup

1. Sign up at [OpenAI](https://platform.openai.com/)
2. Create an API key
3. Add to `backend/.env` as `OPENAI_API_KEY`

## 📖 Usage

### Basic Commands
- **Voice Input**: Press `Shift+Alt+M` from anywhere
- **Text Input**: Click the notch to expand and type
- **Hover Expand**: Move mouse over notch for full interface

### Example Commands
```
"Add meeting with John tomorrow at 3pm and send him a message"
"Search Google for React tutorials and open the first result"
"Create a calendar event for lunch on Friday at noon"
"Send an email to sarah@company.com about the project update"
"Take a screenshot and save it to desktop"
"What's on my calendar today?"
```

### Multi-step Workflows
The assistant understands complex requests:
- **Sequential**: "Create a report and email it to my team"
- **Parallel**: "Add three events to my calendar and message John"
- **Context-aware**: "Summarize this" (analyzes selected text/screenshot)

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Electron      │    │   Next.js       │    │   Express.js    │
│   Desktop App   │◄──►│   Frontend      │◄──►│   Backend       │
│                 │    │                 │    │                 │
│ • Window Mgmt   │    │ • React UI      │    │ • AI Pipeline   │
│ • Global Keys   │    │ • SSE Client    │    │ • Tool Executor │
│ • Voice Input   │    │ • Real-time UI  │    │ • Google APIs   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### AI Processing Pipeline
1. **Context Capture**: Screenshot analysis + selected text
2. **Preprocessing**: Intelligent prompt enhancement with context embedding
3. **Intent Classification**: Dynamic tool selection and execution planning
4. **Variable Extraction**: LLM-powered parameter extraction with validation
5. **Tool Execution**: Sequential/parallel execution with real-time updates

### Key Technologies
- **Frontend**: Next.js 14, React 18, TypeScript
- **Desktop**: Electron 27 with security best practices
- **Backend**: Express.js, Node.js
- **AI**: OpenAI GPT-3.5/4, local Whisper.cpp
- **APIs**: Google Calendar/Gmail/Drive/Sheets, Apple system APIs
- **Real-time**: Server-Sent Events (SSE)

## 🛠️ Development

### Project Structure
```
├── components/              # React components
│   ├── NotchUI.tsx         # Main interface
│   ├── VoiceInput.tsx      # Speech recognition
│   └── GoogleAuth.tsx      # Authentication
├── electron/               # Electron main process
│   ├── main.js            # Window management
│   └── preload.js         # Security bridge
├── backend/               # Express.js backend
│   ├── routes/           # API endpoints
│   ├── lib/              # Core processing
│   └── data/             # Configuration
├── lib/tools/            # 40+ automation tools
├── pages/                # Next.js pages
└── styles/               # CSS modules
```

### Development Commands
```bash
# Install all dependencies
npm run full-install

# Development with hot reload
npm run electron:dev

# Individual components
npm run backend          # Backend only
npm run dev             # Frontend only
npm run electron        # Electron only

# Setup commands
npm run setup-whisper  # Voice recognition
npm run init-contacts   # Contact database
npm run check-accessibility  # System permissions

# Build for production
npm run build:electron
npm run dist
```

### Adding New Tools

1. Create tool file in `lib/tools/`:
```typescript
// lib/tools/my_new_tool.ts
export async function myNewTool(param1: string, param2: number) {
  // Tool implementation
  return { success: true, result: "Tool executed" };
}
```

2. Register in `lib/tool_registry.ts`:
```typescript
export const TOOL_REGISTRY = {
  // ... existing tools
  'my_new_tool': {
    description: 'Does something useful',
    parameters: {
      param1: { type: 'string', required: true },
      param2: { type: 'number', required: false, default: 10 }
    }
  }
};
```

3. Add to API router in `pages/api/tools.ts`

## 🔒 Security

### Electron Security
- **Context Isolation**: Prevents code injection
- **No Node Integration**: Secure renderer process
- **Preload Scripts**: Controlled API exposure
- **Input Validation**: All IPC communications validated

### Data Privacy
- **Local Voice Processing**: Speech recognition via local Whisper.cpp
- **Secure Token Storage**: OAuth tokens encrypted locally
- **No Data Collection**: All processing happens locally
- **Environment Isolation**: Sensitive data in environment variables

## 🐛 Troubleshooting

### Common Issues

**Voice input not working:**
```bash
# Check Whisper.cpp installation
npm run setup-whisper

# Verify microphone permissions
npm run check-accessibility
```

**Google APIs not working:**
- Verify OAuth credentials in `backend/.env`
- Check redirect URI matches Google Console
- Ensure required APIs are enabled

**Window positioning issues:**
- Check display scaling settings
- Reset position: Delete `electron/notch-position.json`

**Build failures:**
```bash
# Clean install
rm -rf node_modules backend/node_modules
npm run full-install
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run electron:dev

# Backend logs
cd backend && npm run dev

# Check system permissions
npm run check-accessibility
```

## 📦 Building & Distribution

### Development Build
```bash
npm run build
npm run electron
```

### Production Build
```bash
# Build for current platform
npm run build:electron

# Create installer
npm run dist
```

### Supported Platforms
- **macOS**: Full functionality with native integrations
- **Windows**: Basic functionality (limited system integration)
- **Linux**: Basic functionality (limited system integration)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new tools
- Update documentation for new features
- Ensure security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for GPT API
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) for local speech recognition
- [Google APIs](https://developers.google.com/) for productivity integrations
- [Electron](https://www.electronjs.org/) for desktop framework
- [Next.js](https://nextjs.org/) for React framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/arifrazack/ai-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/arifrazack/ai-assistant/discussions)
- **Documentation**: [Wiki](https://github.com/arifrazack/ai-assistant/wiki)

---

**Built with ❤️ for seamless AI assistance**