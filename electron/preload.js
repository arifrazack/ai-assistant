console.log("🔧 Preload script loaded");
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Recording functionality
  startRecording: (options) => ipcRenderer.invoke('start-recording', options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  
  // Event listeners
  onRecordingStatus: (callback) => ipcRenderer.on('recording-status', callback),
  onTranscriptionResult: (callback) => ipcRenderer.on('transcription-result', callback),
  onTriggerMicrophone: (callback) => ipcRenderer.on('trigger-microphone', callback),
  
  // Remove event listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Notch window management
  expandNotch: () => ipcRenderer.invoke('expand-notch'),
  collapseNotch: () => ipcRenderer.invoke('collapse-notch'),
  hideNotch: () => ipcRenderer.invoke('hide-notch'),
  showNotch: () => ipcRenderer.invoke('show-notch'),
      resizeNotch: (deltaX, deltaY, resizeDirection) => ipcRenderer.invoke('resize-notch', deltaX, deltaY, resizeDirection),
  moveNotch: (deltaX, deltaY) => ipcRenderer.invoke('move-notch', deltaX, deltaY),
  
  // Renderer ready signal
  rendererReady: () => ipcRenderer.send('renderer-ready')
}); 