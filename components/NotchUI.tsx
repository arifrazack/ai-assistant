import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import dynamic from 'next/dynamic'
import styles from './NotchUI.module.css'

// Lazy load VoiceInput only when needed
const VoiceInput = dynamic(() => import('./VoiceInput'), {
  ssr: false,
  loading: () => <div className={styles.voiceLoading}>🎤</div>
});

interface NotchUIProps {
  className?: string;
}

interface AnalysisData {
  intent: string;
  tone: string; 
  toolsUsed: boolean;
  tools: string[];
  toolResults: any[];
}

interface ConfirmationData {
  tool: string;
  parameters: Record<string, any>;
  message: string;
}

// Memoized components to reduce re-renders
const StatusIndicator = React.memo(({ isLoading }: { isLoading: boolean }) => (
  <div className={styles.statusIndicator}>
    {isLoading ? (
      <div className={styles.loadingSpinner}>⟳</div>
    ) : (
      <div className={styles.statusDot} />
    )}
  </div>
));

const ToolBadges = React.memo(({ tools }: { tools: string[] }) => (
  <div className={styles.toolsUsed}>
    {tools.map((tool, index) => (
      <span key={index} className={styles.toolBadge}>{tool}</span>
    ))}
  </div>
));

export default function NotchUI({ className }: NotchUIProps) {
  // Optimized state management - combine related states
  const [uiState, setUIState] = useState({
    isExpanded: false,
    isHovered: false,
    isLoading: false,
    userManuallyClosed: false,
    showRetryInput: false
  });

  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusHistory, setStatusHistory] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null)
  const [editingParameters, setEditingParameters] = useState<Record<string, any>>({})
  const [lastResponseId, setLastResponseId] = useState<string>('')
  const [retryContext, setRetryContext] = useState<any>(null)
  const [retryMessage, setRetryMessage] = useState('')
  
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout>()
  const eventSourceRef = useRef<EventSource | null>(null)

  // Debug status changes
  useEffect(() => {
    console.log('🔍 Status state changed:', {
      statusMessage,
      statusHistoryLength: statusHistory.length,
      statusHistory,
      response: response ? `"${response}"` : 'none',
      responseLength: response?.length || 0,
      shouldShowStatus: (statusHistory.length > 0 || statusMessage) && !response,
      renderCondition: response || statusMessage || statusHistory.length > 0
    })
  }, [statusMessage, statusHistory, response])

  // Initialize SSE connection for real-time status updates
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'
    const sseUrl = `${backendUrl}/api/status/stream`
    console.log('📡 Attempting SSE connection to:', sseUrl)
    
    try {
      const eventSource = new EventSource(sseUrl)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('📡 SSE connection established successfully')
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📡 SSE message received:', data)
          
                  if (data.type === 'connected') {
          console.log('📡 SSE connected with ID:', data.connectionId)
        } else if (data.type === 'heartbeat') {
          // Ignore heartbeat messages
          return
                } else if (data.type === 'status') {
          // Add status message to history and set as current
          let statusMsg = ''
          switch (data.status) {
            case 'analyzing_context':
              statusMsg = 'Analyzing context...'
              break
            case 'analyzing_prompt':
              statusMsg = 'Analyzing prompt...'
              break
            case 'executing_tools':
              statusMsg = 'Executing tools...'
              break
            default:
              statusMsg = data.message
          }
          
          console.log('🔄 Adding to status history:', statusMsg)
          setStatusMessage(statusMsg)
          setStatusHistory(prev => {
            // Avoid duplicates
            const newHistory = prev[prev.length - 1] !== statusMsg ? [...prev, statusMsg] : prev
            console.log('📊 Status history updated:', newHistory)
            return newHistory
          })
        } else if (data.type === 'tool') {
          // Add tool status to history and set as current
          const toolName = data.toolName.replace(/_/g, ' ')
          let statusMsg = ''
          
          switch (data.status) {
            case 'started':
              statusMsg = `Running ${toolName}...`
              break
            case 'success':
              statusMsg = `✅ ${toolName} completed`
              break
            case 'failed':
              statusMsg = `❌ ${toolName} failed`
              break
          }
          
          if (statusMsg) {
            console.log('🔄 Adding tool status to history:', statusMsg)
            setStatusMessage(statusMsg)
            setStatusHistory(prev => {
              // Avoid duplicates
              const newHistory = prev[prev.length - 1] !== statusMsg ? [...prev, statusMsg] : prev
              console.log('📊 Tool status history updated:', newHistory)
              return newHistory
            })
            
            // For success messages, don't clear them immediately
            if (data.status === 'success') {
              setTimeout(() => {
                setStatusMessage('')
              }, 1500)
            }
          }
        }
        } catch (error) {
          console.error('📡 Error parsing SSE message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('📡 SSE connection error:', error)
        console.error('📡 EventSource readyState:', eventSource.readyState)
        console.error('📡 EventSource url:', eventSource.url)
      }

      return () => {
        console.log('📡 Closing SSE connection')
        eventSource.close()
        eventSourceRef.current = null
      }
    } catch (error) {
      console.error('📡 Failed to create SSE connection:', error)
    }
  }, [])

  // Memoized handlers to prevent unnecessary re-renders
  const handleCollapseClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setUIState(prev => ({ ...prev, isExpanded: false, userManuallyClosed: true }));
    
    if (window.electronAPI?.collapseNotch) {
      await window.electronAPI.collapseNotch()
    }
  }, []);

  const handleExpandClick = useCallback(async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.dragging')) {
      return;
    }
    
    if (!uiState.isExpanded) {
      setUIState(prev => ({ 
        ...prev, 
        isExpanded: true, 
        userManuallyClosed: false 
      }));
      
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
      
      if (window.electronAPI?.expandNotch) {
        await window.electronAPI.expandNotch()
      }
    }
  }, [uiState.isExpanded]);

  const handleMouseEnter = useCallback(() => {
    setUIState(prev => ({ ...prev, isHovered: true }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setUIState(prev => ({ ...prev, isHovered: false }));
  }, []);

  // Optimized mouse handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);
      
      if (deltaX > 5 || deltaY > 5) {
        hasMoved = true;
        (e.target as HTMLElement)?.closest('.notch-button')?.classList.add('dragging');
      }
    };

    const handleMouseUp = () => {
      setTimeout(() => {
        (e.target as HTMLElement)?.closest('.notch-button')?.classList.remove('dragging');
      }, 100);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);



  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, []);

  // Optimized auto-expand logic
  const autoExpand = useCallback(async () => {
    if (!uiState.isExpanded) {
      setUIState(prev => ({ 
        ...prev, 
        isExpanded: true, 
        userManuallyClosed: false 
      }));
      
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
      
      if (window.electronAPI?.expandNotch) {
        await window.electronAPI.expandNotch()
      }
    }
  }, [uiState.isExpanded]);

  // Optimized auto-expand effect
  useEffect(() => {
    const currentStateId = `${response}-${confirmation?.message || ''}-${uiState.isLoading}`
    
    if ((response || confirmation || uiState.isLoading) && 
        currentStateId !== lastResponseId && 
        !uiState.userManuallyClosed && 
        !uiState.isExpanded) {
      
      console.log('�� Auto-expanding for new content:', { response: !!response, confirmation: !!confirmation, isLoading: uiState.isLoading });
      autoExpand()
      setLastResponseId(currentStateId)
    }
    
    if (currentStateId !== lastResponseId && (response || confirmation)) {
      setUIState(prev => ({ ...prev, userManuallyClosed: false }));
      setLastResponseId(currentStateId)
    }
  }, [response, confirmation, uiState.isLoading, uiState.isExpanded, lastResponseId, uiState.userManuallyClosed, autoExpand]);

  // Optimized message sending
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || uiState.isLoading) return

    setUIState(prev => ({ ...prev, isLoading: true }));
    setResponse('')
    setStatusMessage('')
    setStatusHistory([])
    setAnalysis(null)
    setConfirmation(null)
    setRetryContext(null)
    setUIState(prev => ({ ...prev, showRetryInput: false, userManuallyClosed: false }));
    console.log('📤 Sending message from notch:', text);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'
      
      const result = await axios.post(`${backendUrl}/api/chat`, {
        message: text,
        type: 'text'
      })
      
      if (result.data.success) {
        const confirmationTools = result.data.analysis?.toolResults?.filter((tool: any) => tool.requiresConfirmation);
        
        if (confirmationTools && confirmationTools.length > 0) {
          console.log('🔒 Tools require confirmation:', confirmationTools);
          const firstConfirmation = confirmationTools[0];
          
          setConfirmation(firstConfirmation.confirmationData);
          setEditingParameters({ ...firstConfirmation.confirmationData.parameters });
          setResponse(`Please review and confirm:`);
          setAnalysis(result.data.analysis || null);
        } else {
          setResponse(result.data.response)
          // Don't clear status message immediately - let it fade naturally
          setTimeout(() => setStatusMessage(''), 500)
          setAnalysis(result.data.analysis || null)
          setConfirmation(null)
        }
      } else {
        if (result.data.retryContext) {
          console.log('🔄 Error with retry context received:', result.data);
          setRetryContext(result.data.retryContext);
          setUIState(prev => ({ ...prev, showRetryInput: true }));
          setResponse(`❌ ${result.data.error}\n\n📋 **What went wrong:**\n${result.data.analysis?.errorSummary || 'Tool execution failed'}\n\n�� **How to fix it:**\n${result.data.analysis?.solutions || 'Please provide additional clarification'}\n\n💬 **Please provide clarification below to retry:**`);
        } else {
          setResponse(result.data.error || 'Unknown error occurred');
        }
        setAnalysis(result.data.analysis || null);
        setConfirmation(null);
      }
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK') {
        setResponse('Unable to connect to backend server.')
      } else {
        setResponse(error.response?.data?.error || 'Error occurred')
      }
      setConfirmation(null)
    } finally {
      setUIState(prev => ({ ...prev, isLoading: false }));
    }
  }, [uiState.isLoading]);

  // Optimized retry handling
  const handleRetry = useCallback(async () => {
    if (!retryContext || !retryMessage.trim() || uiState.isLoading) return;

    setUIState(prev => ({ ...prev, isLoading: true, showRetryInput: false }));
    console.log('🔄 Sending retry request:', retryMessage);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
      
      const result = await axios.post(`${backendUrl}/api/chat`, {
        message: retryMessage,
        type: 'text',
        retryContext: retryContext
      });
      
      if (result.data.success) {
        const confirmationTools = result.data.analysis?.toolResults?.filter((tool: any) => tool.requiresConfirmation);
        
        if (confirmationTools && confirmationTools.length > 0) {
          console.log('🔒 Retry tools require confirmation:', confirmationTools);
          const firstConfirmation = confirmationTools[0];
          
          setConfirmation(firstConfirmation.confirmationData);
          setEditingParameters({ ...firstConfirmation.confirmationData.parameters });
          setResponse(`✅ Retry successful! Please review and confirm:`);
          setAnalysis(result.data.analysis || null);
        } else {
          setResponse(`✅ Retry successful!\n\n${result.data.response}`);
          setAnalysis(result.data.analysis || null);
          setConfirmation(null);
        }
        
        setRetryContext(null);
        setRetryMessage('');
      } else {
        if (result.data.retryContext) {
          setRetryContext(result.data.retryContext);
          setUIState(prev => ({ ...prev, showRetryInput: true }));
          setResponse(`❌ Retry failed: ${result.data.error}\n\n📋 **What went wrong:**\n${result.data.analysis?.errorSummary || 'Tool execution failed'}\n\n�� **How to fix it:**\n${result.data.analysis?.solutions || 'Please provide additional clarification'}\n\n💬 **Please provide clarification below to retry again:**`);
        } else {
          setResponse(`❌ Retry failed: ${result.data.error || 'Unknown error occurred'}`);
          setRetryContext(null);
          setUIState(prev => ({ ...prev, showRetryInput: false }));
        }
        setAnalysis(result.data.analysis || null);
        setConfirmation(null);
      }
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK') {
        setResponse('❌ Retry failed: Unable to connect to backend server.');
      } else {
        setResponse(`❌ Retry failed: ${error.response?.data?.error || 'Error occurred'}`);
      }
      setRetryContext(null);
      setUIState(prev => ({ ...prev, showRetryInput: false }));
      setConfirmation(null);
    } finally {
      setUIState(prev => ({ ...prev, isLoading: false }));
    }
  }, [retryContext, retryMessage, uiState.isLoading]);

  // Optimized confirmation handling
  const handleConfirmationAction = useCallback(async (action: 'approve' | 'deny') => {
    if (!confirmation) return;
    
    setUIState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
      
      if (action === 'deny') {
        setResponse('Action cancelled by user.');
        setConfirmation(null);
        setEditingParameters({});
        return;
      }
      
      if (action === 'approve') {
        const result = await axios.post(`${backendUrl}/api/chat/confirm-and-continue`, {
          toolName: confirmation.tool,
          parameters: editingParameters,
          originalMessage: message,
          allToolResults: analysis?.toolResults
        });
        
        if (result.data.success) {
          setResponse(result.data.response);
          
          const nextConfirmation = result.data.analysis?.toolResults?.find((tool: any) => tool.requiresConfirmation);
          
          if (nextConfirmation) {
            console.log('🔒 Next confirmation required:', nextConfirmation);
            setConfirmation(nextConfirmation.confirmationData);
            setEditingParameters({ ...nextConfirmation.confirmationData.parameters });
            setAnalysis(result.data.analysis);
          } else {
            console.log('✅ All confirmations completed');
            setConfirmation(null);
            setEditingParameters({});
            setAnalysis(null);
          }
        } else {
          // Handle detailed error analysis just like main chat flow
          if (result.data.retryContext) {
            console.log('🔄 Confirmation error with retry context received:', result.data);
            setRetryContext(result.data.retryContext);
            setUIState(prev => ({ ...prev, showRetryInput: true }));
            setResponse(`❌ ${result.data.error}\n\n📋 **What went wrong:**\n${result.data.analysis?.errorSummary || 'Tool execution failed'}\n\n🔧 **How to fix it:**\n${result.data.analysis?.solutions || 'Please provide additional clarification'}\n\n💬 **Please provide clarification below to retry:**`);
            setAnalysis(result.data.analysis || null);
          } else {
            setResponse(`❌ Action failed: ${result.data.error}`);
            setAnalysis(result.data.analysis || null);
          }
          setConfirmation(null);
          setEditingParameters({});
        }
      }
      
    } catch (error: any) {
      setResponse(`Error: ${error.response?.data?.error || error.message}`);
      setConfirmation(null);
      setEditingParameters({});
    } finally {
      setUIState(prev => ({ ...prev, isLoading: false }));
    }
  }, [confirmation, editingParameters, message, analysis]);

  // Optimized form handling
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(message)
    setMessage('')
  }, [message, sendMessage]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    console.log('🎙️ Voice transcript in notch:', transcript);
    setMessage(transcript)
    sendMessage(transcript)
  }, [sendMessage]);

  const handleSolveClick = useCallback(() => {
    const solvePrompt = "solve all questions";
    setMessage(solvePrompt);
    sendMessage(solvePrompt);
  }, [sendMessage]);



  // Memoized components to prevent unnecessary re-renders
  const collapsedButton = useMemo(() => (
    <div className={styles.notchButton}>
      <div 
        className={styles.notchMain}
        onClick={handleExpandClick}
        onMouseDown={handleMouseDown}
      >
        <StatusIndicator isLoading={uiState.isLoading} />
        <span className={styles.notchText}>AI Assistant</span>
      </div>
      <div className={styles.collapsedActions}>
        <button
          className={styles.collapsedSolveBtn}
          onClick={handleSolveClick}
          disabled={uiState.isLoading}
          title="Solve all questions"
        >
          🧠
        </button>
        <div className={styles.collapsedMicWrapper}>
          <VoiceInput 
            onTranscript={handleVoiceTranscript}
            isEnabled={!uiState.isLoading}
            className="notch-voice-collapsed"
          />
        </div>
      </div>
    </div>
  ), [handleExpandClick, handleMouseDown, handleSolveClick, handleVoiceTranscript, uiState.isLoading]);

  const handleSettingsClick = useCallback(async () => {
    // Open settings page in browser
    const settingsUrl = `${window.location.origin}/settings`;
    
    try {
      // Use the tool API to open URL in browser
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'open_url_in_new_tab',
          inputs: { url: settingsUrl }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to open settings page');
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      // Fallback to window.open
      window.open(settingsUrl, '_blank');
    }
  }, []);

  const expandedInterface = useMemo(() => (
    <div className={styles.notchExpanded}>
      <div className={styles.notchHeader}>
        <div className={styles.headerLeft}>
          <StatusIndicator isLoading={uiState.isLoading} />
          <span className={styles.notchTitle}>AI Assistant</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.settingsButton} onClick={handleSettingsClick} title="Settings">
            ⚙️
          </button>
          <button className={styles.collapseButton} onClick={handleCollapseClick}>
            ✕
          </button>
        </div>
      </div>

      

      {(response || statusMessage || statusHistory.length > 0) && (
        <div className={styles.notchResponse}>
          {/* Show status history and current status - prioritize status during processing */}
          {(statusHistory.length > 0 || statusMessage) && (
            <div className={styles.statusContainer}>
              {statusHistory.map((status, index) => (
                <div 
                  key={index} 
                  className={styles.statusHistoryItem}
                  style={{
                    opacity: index === statusHistory.length - 1 ? 1 : 0.6,
                    fontSize: index === statusHistory.length - 1 ? '14px' : '12px'
                  }}
                >
                  {status}
                </div>
              ))}
              {statusMessage && statusMessage !== statusHistory[statusHistory.length - 1] && (
                <div className={styles.statusText}>
                  {statusMessage}
                </div>
              )}
            </div>
          )}
          {response && (
            <div className={styles.responseText}>{response}</div>
          )}
          {analysis && analysis.tools && analysis.tools.length > 0 && (
            <ToolBadges tools={analysis.tools} />
          )}
        </div>
      )}



      <form onSubmit={handleSubmit} className={styles.notchInputForm}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!uiState.isLoading && message.trim()) {
                  handleSubmit(e as any);
                }
              }
            }}
            placeholder="Ask me anything..."
            className={styles.notchInput}
            disabled={uiState.isLoading}
          />
          <div className={styles.inputActions}>
            <button
              type="button"
              onClick={handleSolveClick}
              disabled={uiState.isLoading}
              className={styles.solveBtn}
              title="Solve all questions"
            >
              🧠
            </button>

            {uiState.isExpanded && (
              <div className={styles.micButtonWrapper}>
                <VoiceInput 
                  onTranscript={handleVoiceTranscript}
                  isEnabled={!uiState.isLoading}
                  className="notch-voice-button"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={uiState.isLoading || !message.trim()}
              className={styles.sendBtn}
            >
              ↵
            </button>
          </div>
        </div>
      </form>


    </div>
  ), [
    uiState.isLoading, 
    response, 
    analysis, 
    message, 
    handleSubmit, 
    handleVoiceTranscript, 
    handleCollapseClick,
    handleSettingsClick,
    handleSolveClick
  ]);

  return (
    <div 
      ref={containerRef}
      className={`${styles.notchContainer} ${uiState.isExpanded ? styles.expanded : styles.collapsed} ${className || ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hidden VoiceInput for global shortcut when collapsed */}
      {!uiState.isExpanded && (
        <div className={`${styles.voiceInputContainer} ${styles.hiddenOffscreen}`}>
          <VoiceInput 
            onTranscript={handleVoiceTranscript}
            isEnabled={!uiState.isLoading}
            className="notch-voice-hidden"
          />
        </div>
      )}

      {/* Collapsed State - Clickable Button */}
      {!uiState.isExpanded && collapsedButton}

      {/* Expanded State - Full Interface */}
      {uiState.isExpanded && expandedInterface}

      {/* Confirmation Notification */}
      {confirmation && (
        <div className={styles.confirmationNotification}>
          <div className={styles.confirmationHeader}>
            <span className={styles.confirmationIcon}>⚠️</span>
            <span className={styles.confirmationTitle}>Confirm Action</span>
          </div>
          
          <div className={styles.confirmationMessage}>
            {confirmation.message}
          </div>
          
          <div className={styles.confirmationParams}>
            {Object.entries(editingParameters).map(([key, value]) => (
              <div key={key} className={styles.paramRow}>
                <label className={styles.paramLabel}>{key.replace('_', ' ')}:</label>
                {key === 'message' || key === 'body' ? (
                  <textarea
                    value={value as string}
                    onChange={(e) => setEditingParameters({
                      ...editingParameters,
                      [key]: e.target.value
                    })}
                    className={styles.paramTextarea}
                    rows={2}
                  />
                ) : (
                  <input
                    type="text"
                    value={value as string}
                    onChange={(e) => setEditingParameters({
                      ...editingParameters,
                      [key]: e.target.value
                    })}
                    className={styles.paramInput}
                  />
                )}
              </div>
            ))}
          </div>
          
          <div className={styles.confirmationActions}>
            <button
              onClick={() => handleConfirmationAction('approve')}
              disabled={uiState.isLoading}
              className={styles.confirmBtn}
            >
              ✅ Send
            </button>
            <button
              onClick={() => handleConfirmationAction('deny')}
              disabled={uiState.isLoading}
              className={styles.denyBtn}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Retry Input */}
      {uiState.showRetryInput && (
        <div className={styles.retryInputNotification}>
          <div className={styles.retryInputHeader}>
            <span className={styles.retryInputIcon}>⚠️</span>
            <span className={styles.retryInputTitle}>Retry Required</span>
          </div>
          <div className={styles.retryInputMessage}>
            {response}
          </div>
          <div className={styles.retryInputForm}>
            <input
              type="text"
              value={retryMessage}
              onChange={(e) => setRetryMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleRetry();
                }
              }}
              placeholder="Provide clarification for retry..."
              className={styles.retryInput}
            />
            <button
              onClick={handleRetry}
              disabled={uiState.isLoading || !retryMessage.trim()}
              className={styles.retryBtn}
            >
              ↵
            </button>
          </div>
        </div>
      )}


    </div>
  )
} 