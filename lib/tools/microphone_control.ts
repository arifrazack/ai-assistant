// Microphone and Speech Recognition Control using Electron + whisper.cpp
export interface MicrophoneState {
  isRecording: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  status: string;
}

export interface RecordingOptions {
  duration?: number; // Recording duration in milliseconds
  sampleRate?: string; // Sample rate (default: 16000)
  channels?: string; // Number of channels (default: 1)
  exitOnSilence?: number; // Stop after N seconds of silence
}

export class MicrophoneController {
  private isListening = false;
  private currentStatus = 'idle';
  private onResult: ((transcript: string, confidence: number) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private onStateChange: ((state: MicrophoneState) => void) | null = null;

  constructor() {
    this.initializeElectronAPI();
  }

  private initializeElectronAPI() {
    if (typeof window === 'undefined' || !(window as any).electronAPI) {
      console.warn('Electron API not available - running in browser mode');
      return;
    }

    const electronAPI = (window as any).electronAPI;

    // Listen for transcription results
    electronAPI.onTranscriptionResult((event: any, result: { transcript: string; confidence: number }) => {
      console.log('🎤 Transcription received:', result);
      console.log('🎤 Setting isListening to false and status to completed');
      this.isListening = false;
      this.currentStatus = 'completed';
      console.log('🎤 New state after transcription:', { isListening: this.isListening, status: this.currentStatus });
      this.notifyStateChange();
      
      if (this.onResult && result.transcript) {
        this.onResult(result.transcript, result.confidence || 0.9);
      }
    });

    // Listen for recording status updates
    electronAPI.onRecordingStatus((event: any, status: { status: string; message: string }) => {
      console.log('🎤 Recording status:', status);
      
      this.currentStatus = status.status;
      
      switch (status.status) {
        case 'recording':
          this.isListening = true;
          break;
        case 'stopped':
        case 'completed':
        case 'processing':
          this.isListening = false;
          break;
        case 'error':
          this.isListening = false;
          if (this.onError) {
            this.onError(status.message);
          }
          break;
      }
      
      this.notifyStateChange();
    });
  }

  public async startListening(
    onResult: (transcript: string, confidence: number) => void,
    onError?: (error: string) => void,
    onStateChange?: (state: MicrophoneState) => void,
    options?: RecordingOptions
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !(window as any).electronAPI) {
      if (onError) {
        onError('Microphone recording requires the Electron app. Web browser recording is not supported in this version.');
      }
      return false;
    }

    // Check if already listening
    if (this.isListening) {
      console.log('🎤 Already recording, stopping first...');
      await this.stopListening();
      return false;
    }

    this.onResult = onResult;
    this.onError = onError || null;
    this.onStateChange = onStateChange || null;

    try {
      console.log('🎤 Starting Electron-based recording...');
      
      // Reset status when starting new recording
      this.currentStatus = 'idle';
      
      console.log('🎤 Attempting to start recording with options:', options);
      const result = await (window as any).electronAPI.startRecording({
        duration: options?.duration || 5000,
        sampleRate: options?.sampleRate || "16000",
        channels: options?.channels || "1",
        exitOnSilence: options?.exitOnSilence || 2
      });

      if (result.success) {
        this.isListening = true;
        this.currentStatus = 'recording';
        this.notifyStateChange();
        return true;
      } else {
        if (onError) onError(result.message);
        return false;
      }
    } catch (error: any) {
      console.error('🎤 Error starting Electron recording:', error);
      const errorMessage = `Failed to start recording: ${error.message || error}`;
      if (onError) onError(errorMessage);
      return false;
    }
  }

  public async stopListening(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI && this.isListening) {
      try {
        await (window as any).electronAPI.stopRecording();
        this.isListening = false;
        this.currentStatus = 'stopped';
        this.notifyStateChange();
      } catch (error) {
        console.error('🎤 Error stopping recording:', error);
      }
    }
  }

  public getState(): MicrophoneState {
    const state = {
      isRecording: this.isListening,
      isSupported: typeof window !== 'undefined' && !!(window as any).electronAPI,
      transcript: '',
      confidence: 0,
      status: this.currentStatus
    };
    console.log('🎙️ MicrophoneController.getState():', state);
    return state;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  public cleanup(): void {
    // Clean up event listeners when component unmounts
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.removeAllListeners('transcription-result');
      (window as any).electronAPI.removeAllListeners('recording-status');
    }
  }
}

// Test microphone access for Electron
export async function testMicrophoneAccess(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  if ((window as any).electronAPI) {
    // In Electron, assume microphone is available if API is present
    return true;
  }
  
  // Fallback browser test (though not used in this version)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('🎤 Microphone access test failed:', error);
    return false;
  }
}

// Simple microphone control functions for the tool system
export async function startMicrophone(options?: RecordingOptions): Promise<string> {
  if (typeof window === 'undefined') {
    return "Microphone not available in server environment";
  }

  if (!(window as any).electronAPI) {
    return "Microphone recording requires the Electron app. Please use the desktop version.";
  }

  const hasAccess = await testMicrophoneAccess();
  if (!hasAccess) {
    return "Microphone not available. Please check your system audio settings.";
  }

  return "Microphone ready for Electron-based recording with whisper.cpp transcription.";
}

export async function stopMicrophone(): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    try {
      await (window as any).electronAPI.stopRecording();
      return "Microphone recording stopped.";
    } catch (error) {
      return `Error stopping microphone: ${error}`;
    }
  }
  return "Microphone stopped.";
}

export async function getMicrophoneStatus(): Promise<string> {
  if (typeof window === 'undefined') {
    return "Microphone status: Not available (server environment)";
  }

  if (!(window as any).electronAPI) {
    return "Microphone status: Requires Electron app for whisper.cpp integration";
  }

  return "Microphone status: Ready for high-quality transcription via whisper.cpp";
} 