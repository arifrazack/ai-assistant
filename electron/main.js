const { app, BrowserWindow, Menu, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let micInstance = null;
let rendererReady = false;

// Keep a global reference of the window object
let mainWindow;

// Ensure temp directory exists
const ensureTempDir = () => {
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

const createWindow = async () => {
  // Get primary display dimensions for positioning
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Notch positioning - try to restore saved position or use default
  const notchWidth = 300;
  const notchHeight = 45;
  
  // Try to restore saved position
  let savedPosition;
  try {
    const fs = require('fs');
    const path = require('path');
    const positionPath = path.join(__dirname, 'notch-position.json');
    if (fs.existsSync(positionPath)) {
      savedPosition = JSON.parse(fs.readFileSync(positionPath, 'utf8'));
    }
  } catch (e) {
    console.log('No saved position found, using default');
  }
  
  const notchX = savedPosition?.x || Math.floor((screenWidth - notchWidth) / 2);
  const notchY = savedPosition?.y || 8; // Close to the actual notch area
  
  // Create the notch-style browser window
  mainWindow = new BrowserWindow({
    width: notchWidth,
    height: notchHeight,
    x: notchX,
    y: notchY,
    frame: false,              // Remove window frame
    transparent: true,         // Enable transparency
    alwaysOnTop: true,        // Keep above other windows
    resizable: true,         // Prevent resizing
    hasShadow: false,         // Remove shadow for clean look
    focusable: true,          // Allow focus for input interaction
    skipTaskbar: true,        // Don't show in taskbar/dock
    vibrancy: 'ultra-dark',   // macOS blur effect
    visualEffectState: 'active', // Keep vibrancy active
    movable: true,            // Allow window to be moved
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Don't show until ready
  });

  // Remove window from appearing in mission control/spaces
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { 
      visibleOnFullScreen: true 
    });
  }

  // Save position when window is moved
  mainWindow.on('moved', () => {
    const position = mainWindow.getBounds();
    try {
      const fs = require('fs');
      const path = require('path');
      const positionPath = path.join(__dirname, 'notch-position.json');
      fs.writeFileSync(positionPath, JSON.stringify({ x: position.x, y: position.y }));
    } catch (e) {
      console.error('Failed to save window position:', e);
    }
  });

  // Always load from development server when running in development
  const findNextJSPort = async () => {
    const http = require('http');
    const ports = [3000, 3001, 3002, 3003]; // Try these ports in order
    
    for (const port of ports) {
      try {
        const isRunning = await new Promise((resolve) => {
          const req = http.get(`http://localhost:${port}`, (res) => {
            resolve(res.statusCode === 200);
          });
          req.on('error', () => resolve(false));
          req.setTimeout(1000, () => {
            req.abort();
            resolve(false);
          });
        });
        
        if (isRunning) {
          console.log(`✅ Found Next.js running on port ${port}`);
          return `http://localhost:${port}`;
        }
      } catch (error) {
        // Continue to next port
      }
    }
    
    // Fallback to 3000 if none found
    console.log('⚠️ No Next.js server found, defaulting to port 3000');
    return 'http://localhost:3000';
  };

  const startUrl = await findNextJSPort();

  console.log('Loading Notch UI:', startUrl);
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✨ Notch window displayed');
    
    // Open DevTools in development (commented out for cleaner notch experience)
    // mainWindow.webContents.openDevTools();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Allow focus for input interaction when expanded
  // Note: Focus is now allowed so users can type in input fields

  // Handle mouse enter/leave for expand/collapse
  mainWindow.on('enter-full-screen', () => {
    console.log('Window entered full screen');
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // Add IPC handlers for window state management
  ipcMain.handle('expand-notch', () => {
    const expandedHeight = 500;
    const currentBounds = mainWindow.getBounds();
    mainWindow.setBounds({
      ...currentBounds,
      height: expandedHeight
      // Keep current x and y position
    });
    // Enable resizing when expanded
    mainWindow.setResizable(true);
  });

  ipcMain.handle('collapse-notch', () => {
    const currentBounds = mainWindow.getBounds();
    mainWindow.setBounds({
      ...currentBounds,
      height: notchHeight
      // Keep current x and y position
    });
    // Disable resizing when collapsed
    mainWindow.setResizable(false);
  });

  ipcMain.handle('hide-notch', () => {
    mainWindow.hide();
  });

  ipcMain.handle('show-notch', () => {
    mainWindow.show();
  });

  // Add this temporarily to electron/main.js in the resize-notch handler
ipcMain.handle('resize-notch', (event, deltaX, deltaY, resizeDirection) => {
  console.log(`🎯 ELECTRON: resize-notch called with deltaX=${deltaX}, deltaY=${deltaY}, direction=${resizeDirection}`);
  
  const currentBounds = mainWindow.getBounds();
  console.log(`📏 Current bounds:`, currentBounds);
  
  const screenSize = screen.getPrimaryDisplay().workAreaSize;
  
  let newBounds = { ...currentBounds };
  
  // Apply width changes (for right edge and corner resizing)
  if (deltaX !== 0) {
    console.log(`↔️ Applying horizontal resize: ${deltaX}`);
    newBounds.width = Math.max(250, Math.min(screenSize.width * 0.8, currentBounds.width + deltaX));
  }
  
  // Apply height changes with different logic based on resize direction
  if (deltaY !== 0) {
    console.log(`↕️ Applying vertical resize: ${deltaY}, direction: ${resizeDirection}`);
    if (resizeDirection === 'top') {
      // Resizing from top: adjust both Y position and height
      const newHeight = Math.max(150, Math.min(screenSize.height * 0.8, currentBounds.height - deltaY));
      const heightDiff = newHeight - currentBounds.height;
      newBounds.height = newHeight;
      newBounds.y = currentBounds.y - heightDiff;
      console.log(`🔝 Top resize: newHeight=${newHeight}, newY=${newBounds.y}`);
    } else {
      // Resizing from bottom or corner: only adjust height
      newBounds.height = Math.max(150, Math.min(screenSize.height * 0.8, currentBounds.height + deltaY));
      console.log(`🔽 Bottom resize: newHeight=${newBounds.height}`);
    }
  }
  
  console.log(`🎨 Setting new bounds:`, newBounds);
  mainWindow.setBounds(newBounds);
  console.log(`✅ Bounds set complete`);

  
});

  ipcMain.handle('move-notch', (event, deltaX, deltaY) => {
    const currentBounds = mainWindow.getBounds();
    mainWindow.setBounds({
      ...currentBounds,
      x: currentBounds.x + deltaX,
      y: currentBounds.y + deltaY
    });
  });
};

const checkServersAndCreateWindow = async () => {
  console.log('Checking if servers are running...');
  
  // Simple check to see if servers are responding
  try {
    const http = require('http');
    
    // Check if backend is running
    const backendCheck = new Promise((resolve) => {
      const req = http.get('http://localhost:5001/health', (res) => {
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.abort();
        resolve(false);
      });
    });
    
    // Check if frontend is running  
    const frontendCheck = new Promise(async (resolve) => {
      const ports = [3000, 3001, 3002, 3003];
      
      for (const port of ports) {
        try {
          const req = http.get(`http://localhost:${port}`, (res) => {
            resolve(true);
            return;
          });
          req.on('error', () => {});
          req.setTimeout(1000, () => {
            req.abort();
          });
          
          // Wait a bit for this request to complete
          await new Promise(r => setTimeout(r, 100));
          
        } catch (error) {
          // Continue to next port
        }
      }
      
      resolve(false);
    });
    
    const [backendReady, frontendReady] = await Promise.all([backendCheck, frontendCheck]);
    
    if (backendReady && frontendReady) {
      console.log('✅ Both servers are running, creating window...');
      setTimeout(createWindow, 500);
    } else {
      console.log('⚠️  Servers not ready yet, retrying in 2 seconds...');
      console.log(`Backend ready: ${backendReady}, Frontend ready: ${frontendReady}`);
      setTimeout(checkServersAndCreateWindow, 2000);
    }
    
  } catch (error) {
    console.error('Error checking servers:', error);
    setTimeout(checkServersAndCreateWindow, 2000);
  }
};

// IPC handlers for microphone recording using SoX directly
ipcMain.handle("start-recording", async (event, options = {}) => {
  try {
    const tempDir = ensureTempDir();
    const outputFile = path.join(tempDir, 'input.wav');
    
    // Clean up any existing recording
    if (micInstance) {
      if (micInstance.kill) {
        micInstance.kill('SIGTERM');
      }
      micInstance = null;
    }

    // Use SoX directly to avoid CoreAudio buffer issues
    const duration = (options.duration || 8000) / 1000; // Convert to seconds
    const sampleRate = options.sampleRate || "16000";
    
    console.log('🎤 Starting ffmpeg recording for', duration, 'seconds');

    // Notify frontend that recording started
    mainWindow.webContents.send("recording-status", { 
      status: "recording", 
      message: "Recording started..." 
    });

    // Use ffmpeg for recording (much better macOS CoreAudio support)
    // Use ":1" for MacBook Air Microphone (device 1) instead of ":0" (Steam Speakers)
    const command = `ffmpeg -f avfoundation -i ":1" -ac 1 -ar ${sampleRate} -t ${duration} -y "${outputFile}"`;
    console.log('🎤 Executing ffmpeg command:', command);
    
    micInstance = exec(command, (error, stdout, stderr) => {
      console.log('🎤 ffmpeg recording completed');
      
      // Reset micInstance since recording is done (whether success or error)
      micInstance = null;
      
      if (error && error.code !== 255) {
        // Code 255 is normal when ffmpeg is killed by SIGTERM after completing
        console.error('🎤 ffmpeg recording error:', error);
        console.error('🎤 ffmpeg stderr:', stderr);
        
        mainWindow.webContents.send("recording-status", { 
          status: "error", 
          message: `Recording failed: ${error.message}` 
        });
        return;
      }
      
      console.log('🎤 ffmpeg stdout:', stdout);
      
      // Check if file was created and has content
      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        console.log(`🎤 Audio file created: ${stats.size} bytes`);
        
        if (stats.size > 1000) { // At least 1KB suggests actual audio data
          // Notify frontend that recording ended and processing started
          mainWindow.webContents.send("recording-status", { 
            status: "processing", 
            message: "Processing audio..." 
          });
          
          // Transcribe the audio
          transcribeAudio(outputFile);
        } else {
          mainWindow.webContents.send("recording-status", { 
            status: "error", 
            message: "No audio data captured. Please check microphone." 
          });
        }
      } else {
        mainWindow.webContents.send("recording-status", { 
          status: "error", 
          message: "Recording file not created. Check microphone permissions." 
        });
      }
    });

    return { success: true, message: "Recording started with ffmpeg" };
    
  } catch (error) {
    console.error('🎤 Error starting ffmpeg recording:', error);
    
    let errorMessage = "Failed to start recording";
    if (error.message.includes('spawn')) {
      errorMessage = "ffmpeg not found. Please install ffmpeg: brew install ffmpeg";
    } else {
      errorMessage = `Recording error: ${error.message}`;
    }
    
    mainWindow.webContents.send("recording-status", { 
      status: "error", 
      message: errorMessage 
    });
    
    return { success: false, message: errorMessage };
  }
});

ipcMain.handle("stop-recording", async (event) => {
  try {
    if (micInstance) {
      micInstance.kill('SIGTERM');
      micInstance = null;
      
      mainWindow.webContents.send("recording-status", { 
        status: "stopped", 
        message: "Recording stopped" 
      });
      
      return { success: true, message: "Recording stopped" };
    } else {
      return { success: false, message: "No active recording" };
    }
  } catch (error) {
    console.error('🎤 Error stopping recording:', error);
    return { success: false, message: `Error stopping recording: ${error.message}` };
  }
});

// Track when renderer is ready to receive events
ipcMain.on('renderer-ready', () => {
  console.log("🖼️ Renderer reported ready!");
  rendererReady = true;
});

function transcribeAudio(audioFile) {
  const tempDir = path.dirname(audioFile);
  // whisper-cli creates filename.wav.txt instead of filename.txt
  const textFile = audioFile + '.txt';
  const modelsDir = path.join(__dirname, '..', 'models');
  const modelFile = path.join(modelsDir, 'ggml-base.en.bin');
  
  // Check if whisper model exists
  if (!fs.existsSync(modelFile)) {
    const errorMsg = `Whisper model not found at ${modelFile}. Please download the whisper.cpp model (ggml-base.en.bin) and place it in the models directory.`;
    console.error('🎤 ' + errorMsg);
    
    mainWindow.webContents.send("recording-status", { 
      status: "error", 
      message: "Whisper model not found. Please set up whisper.cpp models." 
    });
    
    // Try to use OpenAI Whisper API as fallback
    transcribeWithOpenAI(audioFile);
    return;
  }
  
  // Try to find whisper.cpp executable (prefer whisper-cli over deprecated main)
  const possiblePaths = [
    path.join(__dirname, '..', 'whisper-cli'),
    path.join(__dirname, '..', 'whisper.cpp', 'build', 'bin', 'whisper-cli'),
    path.join(__dirname, '..', 'main'),  // fallback to deprecated main
    './whisper-cli',
    './main',
    'whisper-cli',
    'whisper'
  ];
  
  let whisperCmd = null;
  for (const cmdPath of possiblePaths) {
    try {
      if (fs.existsSync(cmdPath) || cmdPath.includes('./') || !cmdPath.includes('/')) {
        whisperCmd = cmdPath;
        console.log('🎤 Found whisper executable:', whisperCmd);
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!whisperCmd) {
    whisperCmd = './whisper-cli'; // Default fallback
  }
  
  const command = `"${whisperCmd}" -m "${modelFile}" -f "${audioFile}" --output-txt`;
  
  console.log('🎤 Transcribing with command:', command);
  
  exec(command, { cwd: tempDir }, (error, stdout, stderr) => {
    if (error) {
      console.error('🎤 Transcription error:', error);
      console.error('🎤 Stderr:', stderr);
      
      mainWindow.webContents.send("recording-status", { 
        status: "error", 
        message: `Transcription failed: ${error.message}. Trying OpenAI fallback...` 
      });
      
      // Fallback to OpenAI Whisper API
      transcribeWithOpenAI(audioFile);
      return;
    }
    
    console.log('🎤 Whisper stdout:', stdout);
    
    try {
      const text = fs.readFileSync(textFile, "utf8").trim();
      console.log("🎙️ Transcribed text:", JSON.stringify(text));
      console.log("🎙️ Text length:", text.length);
      console.log("🎙️ Text bytes:", Buffer.from(text, 'utf8').length);
      
      if (text && text.length > 0) {
        mainWindow.webContents.send("transcription-result", { 
          transcript: text, 
          confidence: 0.9 
        });
        
        mainWindow.webContents.send("recording-status", { 
          status: "completed", 
          message: "Transcription completed" 
        });
      } else {
        mainWindow.webContents.send("recording-status", { 
          status: "error", 
          message: "No speech detected" 
        });
      }
      
      // Clean up temp files
      try {
        fs.unlinkSync(audioFile);
        fs.unlinkSync(textFile);
      } catch (e) {
        console.log('🎤 Could not clean up temp files:', e.message);
      }
      
    } catch (readError) {
      console.error('🎤 Error reading transcription result:', readError);
      mainWindow.webContents.send("recording-status", { 
        status: "error", 
        message: "Could not read transcription result" 
      });
    }
  });
}

// Fallback to OpenAI Whisper API
function transcribeWithOpenAI(audioFile) {
  mainWindow.webContents.send("recording-status", { 
    status: "processing", 
    message: "Using OpenAI Whisper API..." 
  });
  
  // This would require OpenAI API key and implementation
  // For now, just send an error
  mainWindow.webContents.send("recording-status", { 
    status: "error", 
    message: "Local whisper.cpp not available and OpenAI fallback not implemented. Please install whisper.cpp." 
  });
}

// App event handlers
app.whenReady().then(() => {
    // Register global shortcut for microphone (Shift+Option+M)
  console.log('🎙️ Attempting to register global shortcut Shift+Alt+M...');
  const ret = globalShortcut.register('Shift+Alt+M', () => {
    console.log('🎙️ Mic triggered from anywhere with Shift+Option+M!');

    if (!rendererReady) {
      console.warn("⚠️ Renderer not ready yet, mic trigger ignored.");
      return;
    }

    if (micInstance) {
      console.log('🎙️ Recording already in progress, ignoring global shortcut');
      return;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('🎙️ Sending trigger-microphone event to renderer');
      mainWindow.webContents.send('trigger-microphone');
      mainWindow.webContents.send('recording-status', {
        status: "global_shortcut_triggered",
        message: "Global shortcut detected"
      });
      console.log('🎙️ Events sent to renderer');
    } else {
      console.log('🎙️ Main window not available for global shortcut');
    }
  });
  
  if (!ret) {
    console.log('⚠️ Failed to register global shortcut Shift+Option+M');
  } else {
    console.log('✅ Global shortcut Shift+Option+M registered successfully');
  }
  
  // Test if shortcut is registered
  console.log('🎙️ Is shortcut registered?', globalShortcut.isRegistered('Shift+Alt+M'));

  // Set app menu
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        role: 'window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(null);
  }

  // Check if servers are running and create window when ready
  checkServersAndCreateWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Note: We're not managing backend/frontend processes in this version
  // They should be started separately with npm run dev:all
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
  console.log('🔧 Global shortcuts unregistered');
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 