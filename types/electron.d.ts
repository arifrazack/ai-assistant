declare global {
  interface Window {
    electronAPI?: {
      // Recording functionality
      startRecording: (options?: any) => Promise<any>;
      stopRecording: () => Promise<any>;
      
      // Event listeners
      onRecordingStatus: (callback: (event: any, status: any) => void) => void;
      onTranscriptionResult: (callback: (event: any, result: any) => void) => void;
      onTriggerMicrophone: (callback: (event: any, data?: any) => void) => void;
      
      // Remove event listeners
      removeAllListeners: (channel: string) => void;
      
      // Renderer ready signal
      rendererReady: () => void;
      
      // Window management
      expandNotch: () => Promise<void>;
      collapseNotch: () => Promise<void>;
      hideNotch: () => Promise<void>;
      showNotch: () => Promise<void>;
      resizeNotch: (deltaX: number, deltaY: number, resizeDirection?: string) => void;
      moveNotch: (deltaX: number, deltaY: number) => void;
    };
  }
}

export {}; 