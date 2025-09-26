# 🖥️ Desktop App Setup Guide

This guide shows you how to run your OpenAI Chat App as a **native desktop application** using Electron.

## 📋 **What You Get**

- ✅ **Native desktop app** that runs without a browser
- ✅ **Auto-starts backend server** - no manual setup needed  
- ✅ **Self-contained** - everything runs in one app
- ✅ **Cross-platform** - works on macOS, Windows, and Linux
- ✅ **Proper app menus** and native OS integration

## 🚀 **Quick Start (Desktop App)**

### 1. Make sure backend is configured
Your `backend/.env` file should exist with your OpenAI API key:
```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 2. Run the desktop app in development
```bash
npm run electron:dev
```

This will:
- Start the backend server (port 5001)
- Start the Next.js dev server (port 3000)
- Open the desktop app window
- Show developer tools for debugging

### 3. Run just the desktop app (if servers are already running)
```bash
npm run electron
```

## 📦 **Building for Distribution**

### Development Build
```bash
npm run build:electron
```

### Production Distribution
```bash
npm run dist
```

This creates installers in the `dist/` folder:
- **macOS**: `.dmg` file
- **Windows**: `.exe` installer 
- **Linux**: `.AppImage` file

## 🔧 **Desktop App Features**

### **Automatic Process Management**
- Backend server starts automatically
- Frontend builds and serves automatically  
- All processes clean up when you quit the app

### **Native App Experience**
- Appears in dock/taskbar like any other app
- Native menus (File, Edit, View, etc.)
- Standard keyboard shortcuts work
- Opens external links in your default browser

### **Security**
- Web security enabled
- Node integration disabled for safety
- Context isolation enabled

## 🗂️ **Project Structure (Desktop)**

```
├── electron/
│   └── main.js              # Main Electron process
├── backend/                 # Node.js backend (auto-started)
├── pages/                   # Next.js frontend
├── out/                     # Built static files (production)
├── dist/                    # Built desktop apps
└── package.json             # Electron scripts and config
```

## 🛠️ **Development vs Production**

### **Development Mode** (`npm run electron:dev`)
- Runs Next.js dev server (hot reload)
- Backend runs with nodemon (auto-restart)
- DevTools open automatically
- All development features enabled

### **Production Mode** (`npm run dist`)
- Next.js built as static files
- Backend runs as optimized Node.js process
- No DevTools
- Smaller, faster, self-contained

## 🐛 **Troubleshooting Desktop App**

### App won't start
- Check that backend/.env exists with valid OpenAI key
- Make sure ports 3000 and 5001 are available
- Try killing any existing processes: `pkill -f electron`

### Backend connection errors
- The desktop app handles backend startup automatically
- If issues persist, check the console output for backend errors
- Make sure your OpenAI API key is valid

### Build failures
- Run `npm run build` first to check for frontend issues
- Make sure all dependencies are installed: `npm install`
- Check that backend/.env file exists

## 🎯 **Available Scripts**

| Command | Purpose |
|---------|---------|
| `npm run electron:dev` | Run desktop app in development (auto-starts everything) |
| `npm run electron` | Run just the Electron wrapper |
| `npm run build:electron` | Build the app for testing |
| `npm run dist` | Build installers for distribution |

## 💡 **Tips**

- **Development**: Use `npm run electron:dev` - it handles everything
- **Testing**: Use `npm run dist` to create a real installer to test
- **Sharing**: The files in `dist/` are ready to share with others
- **Updates**: Just rebuild and redistribute - users install the new version

Your chat app now runs as a proper desktop application! 🎉 