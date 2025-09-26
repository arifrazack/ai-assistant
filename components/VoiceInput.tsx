import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneController, MicrophoneState, RecordingOptions } from '../lib/tools/microphone_control';

// Early registration to ensure we catch the global shortcut immediately
if (typeof window !== 'undefined' && window.electronAPI) {
  window.electronAPI.rendererReady?.();
  console.log('🎙️ Early renderer-ready signal sent');
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isEnabled?: boolean;
  className?: string;
  recordingOptions?: RecordingOptions;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ 
  onTranscript, 
  isEnabled = true,
  className = '',
  recordingOptions = {}
}) => {
  const [micState, setMicState] = useState<MicrophoneState>({
    isRecording: false,
    isSupported: false,
    transcript: '',
    confidence: 0,
    status: 'idle'
  });
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isClient, setIsClient] = useState(false);
  const micController = useRef<MicrophoneController | null>(null);

  const startListening = async () => {
    console.log('🎙️ startListening called - micController:', !!micController.current, 'isEnabled:', isEnabled);
    if (!micController.current || !isEnabled) {
      console.log('🎙️ startListening early return - micController missing or disabled');
      return;
    }

    console.log('🎙️ About to call micController.startListening...');
    try {
      const success = await micController.current.startListening(
        (text: string, confidence: number) => {
          setTranscript(text);
          onTranscript(text);
          console.log(`🎤 Voice input: "${text}" (confidence: ${confidence})`);
          setStatusMessage('Transcription completed!');
          
          // Auto-clear status message after a few seconds
          setTimeout(() => {
            setStatusMessage('');
            setTranscript('');
          }, 3000);
        },
        (error: string) => {
          console.error('🎤 Voice input error:', error);
          setMicState(prev => ({ ...prev, isRecording: false }));
          setStatusMessage(`Error: ${error}`);
          
          // Clear error message after delay
          setTimeout(() => setStatusMessage(''), 5000);
        },
        (state: MicrophoneState) => {
          setMicState(prevState => ({ 
            ...state, 
            transcript: prevState.transcript, 
            confidence: prevState.confidence 
          }));
          
          // Update status message based on recording state
          switch (state.status) {
            case 'recording':
              setStatusMessage('🎤 Recording...');
              break;
            case 'processing':
              setStatusMessage('⚙️ Processing...');
              break;
            case 'completed':
              setStatusMessage('✅ Ready');
              setTimeout(() => {
                setMicState(prevState => ({ ...prevState, status: 'idle' }));
                setStatusMessage('');
              }, 2000);
              break;
            case 'stopped':
              setStatusMessage('⏹️ Stopped');
              break;
            case 'error':
              setStatusMessage('❌ Error');
              break;
            default:
              setStatusMessage('');
          }
        },
        {
          duration: 6000, // 6 seconds for notch interface
          sampleRate: "16000",
          channels: "1",
          exitOnSilence: 4, // 4 seconds silence for faster interaction
          ...recordingOptions
        }
      );
  
      console.log('🎙️ micController.startListening returned success:', success);
      if (!success) {
        setMicState(prev => ({ ...prev, isRecording: false }));
        setStatusMessage('Failed to start recording');
      }
      } catch (error) {
        console.error('🎙️ Error in startListening:', error);
        setMicState(prev => ({ ...prev, isRecording: false }));
        setStatusMessage('Error starting recording');
      }
    };

  useEffect(() => {
    // Set client flag to prevent SSR issues
    setIsClient(true);
    
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      micController.current = new MicrophoneController();
      setMicState(micController.current.getState());
      
      // Listen for global shortcut trigger from main process
      const handleGlobalShortcut = async () => {
        console.log('🎙️ Global shortcut triggered - starting microphone');
        
        if (!micController.current) {
          console.log('🎙️ No mic controller available');
          return;
        }
        
        // Always get fresh state from controller
        const currentState = micController.current.getState();
        console.log('🎙️ Fresh controller state:', currentState);
        console.log('🎙️ isEnabled:', isEnabled);
        
        if (!currentState.isRecording && isEnabled) {
          console.log('🎙️ Starting listening via global shortcut');
          try {
            await startListening();
            console.log('🎙️ startListening completed successfully');
          } catch (error) {
            console.error('🎙️ Error in startListening:', error);
          }
        } else {
          console.log('🎙️ Not starting - already recording:', currentState.isRecording, 'or disabled:', !isEnabled);
        }
      };

      console.log('🎙️ VoiceInput component mounted, setting up global shortcut listener');
      
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('🎙️ Setting up global shortcut listener in renderer');
        console.log('🎙️ Available electronAPI methods:', Object.keys(window.electronAPI));
        
        // Signal to main process that renderer is ready
        if (window.electronAPI.rendererReady) {
          window.electronAPI.rendererReady();
        console.log('🎙️ Sent renderer-ready signal to main process');
        }
        
        // Set up the microphone trigger callback using the new API
        if (window.electronAPI.onTriggerMicrophone) {
          window.electronAPI.onTriggerMicrophone((event: any, data?: any) => {
            console.log('🎧 Mic trigger received in renderer!', data);
          handleGlobalShortcut();
        });
        }
        
        // Listen for recording status updates for UI feedback
        if (window.electronAPI.onRecordingStatus) {
          window.electronAPI.onRecordingStatus((event: any, status: any) => {
          console.log('🎙️ Recording status received:', status);
        });
        }
        
        console.log('🎙️ Global shortcut listener set up successfully');
      } else {
        console.log('🎙️ Electron API not available for global shortcut');
      }
      
      return () => {
        if (micController.current) {
          micController.current.stopListening();
          micController.current.cleanup();
        }
        
        // Clean up event listeners
        if (typeof window !== 'undefined' && window.electronAPI?.removeAllListeners) {
          window.electronAPI.removeAllListeners('trigger-microphone');
        }
      };
    }
  }, []);

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className="voice-loading">
          🎤
      </div>
    );
  }

  const stopListening = async () => {
    if (micController.current) {
      await micController.current.stopListening();
      setTranscript('');
      setStatusMessage('Recording stopped');
    }
  };

  const toggleListening = (e?: React.MouseEvent) => {
    // Prevent form submission if this button is inside a form
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (micState.isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!micState.isSupported) {
    return (
      <div className={`voice-input-unsupported ${className}`}>
        <button 
          type="button"
          disabled 
          className="notch-mic-button mic-unsupported"
          title="Voice input requires the Electron desktop app"
        >
          🎤❌
        </button>
      </div>
    );
  }

  return (
    <div className={`notch-voice-input ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={!isEnabled}
        className={`notch-mic-button ${micState.isRecording ? 'recording' : 'idle'} ${!isEnabled ? 'disabled' : ''}`}
        title={micState.isRecording ? 'Recording - click to stop' : 'Click to start voice input'}
      >
        {micState.isRecording ? '⏹️' : '🎙️'}
      </button>

      <style jsx>{`
        .notch-voice-input {
          display: flex;
          align-items: center;
        }

        .notch-mic-button {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: rgba(255, 255, 255, 0.8);
        }

        .notch-mic-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          transform: scale(1.1);
        }

        .notch-mic-button.recording {
          background: rgba(255, 59, 48, 0.8);
          border-color: rgba(255, 59, 48, 1);
          animation: pulse 1.5s infinite;
        }

        .notch-mic-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mic-unsupported {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .voice-loading {
          font-size: 10px;
          opacity: 0.7;
          color: rgba(255, 255, 255, 0.6);
        }

        .voice-input-unsupported {
          display: flex;
          align-items: center;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VoiceInput; 