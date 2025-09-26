import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Settings.module.css';

interface GoogleAuthStatus {
  isAuthenticated: boolean;
  email?: string;
  scopes?: string[];
  error?: string;
}

export default function Settings() {
  const [authStatus, setAuthStatus] = useState<GoogleAuthStatus>({ isAuthenticated: false });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'check_google_auth',
          inputs: {}
        })
      });

      const data = await response.json();
      
      if (data.success && data.result) {
        // Parse the result string to extract auth info
        const resultText = data.result;
        if (resultText.includes('✅ Google account is connected')) {
          const emailMatch = resultText.match(/Email: ([^\n]+)/);
          const scopesMatch = resultText.match(/Scopes: ([^\n]+)/);
          
          setAuthStatus({
            isAuthenticated: true,
            email: emailMatch ? emailMatch[1] : 'Unknown',
            scopes: scopesMatch ? scopesMatch[1].split(', ') : []
          });
        } else {
          setAuthStatus({ isAuthenticated: false });
        }
      } else {
        setAuthStatus({ isAuthenticated: false });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthStatus({ 
        isAuthenticated: false, 
        error: 'Failed to check authentication status' 
      });
    }
  };

  const handleConnect = async (fullAccess = false) => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'connect_google',
          inputs: {
            gmail_access: true,
            full_access: fullAccess
          }
        })
      });

      const data = await response.json();
      
      if (data.success && data.result) {
        const resultText = data.result;
        if (resultText.includes('http')) {
          // Extract URL and open it
          const urlMatch = resultText.match(/(https?:\/\/[^\s]+)/);
          if (urlMatch) {
            const authUrl = urlMatch[1];
            window.open(authUrl, '_blank');
            setMessage('✅ Authentication window opened. Please complete the authorization process and return here.');
            
            // Check auth status after a delay
            setTimeout(() => {
              checkAuthStatus();
            }, 3000);
          }
        } else {
          setMessage(resultText);
        }
      } else {
        setMessage(`❌ ${data.error || 'Failed to connect Google account'}`);
      }
    } catch (error) {
      console.error('Error connecting Google:', error);
      setMessage('❌ Error connecting to Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'disconnect_google',
          inputs: {}
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(data.result);
        setAuthStatus({ isAuthenticated: false });
      } else {
        setMessage(`❌ ${data.error || 'Failed to disconnect Google account'}`);
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      setMessage('❌ Error disconnecting from Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI Assistant Settings</title>
        <meta name="description" content="AI Assistant Settings and Configuration" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <div className={styles.settingsCard}>
          <h1 className={styles.title}>AI Assistant Settings</h1>
          
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Google Account Integration</h2>
            
            <div className={styles.authStatus}>
              {authStatus.isAuthenticated ? (
                <div className={styles.connectedStatus}>
                  <div className={styles.statusIndicator}>
                    <span className={styles.connectedDot}></span>
                    <span className={styles.statusText}>Connected</span>
                  </div>
                  {authStatus.email && (
                    <div className={styles.accountInfo}>
                      <p><strong>Email:</strong> {authStatus.email}</p>
                      {authStatus.scopes && authStatus.scopes.length > 0 && (
                        <div className={styles.scopesInfo}>
                          <p><strong>Permissions:</strong></p>
                          <ul className={styles.scopesList}>
                            {authStatus.scopes.map((scope, index) => (
                              <li key={index} className={styles.scopeItem}>{scope}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.disconnectedStatus}>
                  <div className={styles.statusIndicator}>
                    <span className={styles.disconnectedDot}></span>
                    <span className={styles.statusText}>Not Connected</span>
                  </div>
                  <p className={styles.authDescription}>
                    Connect your Google account to enable Gmail, Calendar, Sheets, and Drive integration.
                  </p>
                </div>
              )}
            </div>

            {message && (
              <div className={styles.message}>
                {message}
              </div>
            )}

            <div className={styles.authActions}>
              {authStatus.isAuthenticated ? (
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className={`${styles.button} ${styles.disconnectButton}`}
                >
                  {isLoading ? 'Disconnecting...' : 'Disconnect Google Account'}
                </button>
              ) : (
                <div className={styles.connectOptions}>
                  <button
                    onClick={() => handleConnect(false)}
                    disabled={isLoading}
                    className={`${styles.button} ${styles.connectButton}`}
                  >
                    {isLoading ? 'Connecting...' : 'Connect Gmail Only'}
                  </button>
                  <button
                    onClick={() => handleConnect(true)}
                    disabled={isLoading}
                    className={`${styles.button} ${styles.connectFullButton}`}
                  >
                    {isLoading ? 'Connecting...' : 'Connect Full Access (Gmail + Calendar + Drive + Sheets)'}
                  </button>
                </div>
              )}
            </div>
            
            <div className={styles.refreshSection}>
              <button
                onClick={checkAuthStatus}
                disabled={isLoading}
                className={`${styles.button} ${styles.refreshButton}`}
              >
                {isLoading ? 'Refreshing...' : 'Refresh Status'}
              </button>
            </div>
          </div>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Changes will be applied immediately. You can close this window after making changes.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}