import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

interface GoogleAuthProps {
  onAuthChange?: (authenticated: boolean, user?: GoogleUser) => void;
  requestGmailAccess?: boolean;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ 
  onAuthChange, 
  requestGmailAccess = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [error, setError] = useState<string>('');
  const [authenticated, setAuthenticated] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

  // Check authentication status on component mount
  useEffect(() => {
    // Set client flag to prevent SSR issues
    setIsClient(true);
    
    // Only run on client side
    if (typeof window !== 'undefined') {
      checkAuthStatus();
      
      // Check URL for auth callback parameters
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      const userEmail = urlParams.get('user');
      const errorMessage = urlParams.get('message');

      if (authStatus === 'success' && userEmail) {
        console.log('✅ Google OAuth successful for:', userEmail);
        checkAuthStatus(); // Refresh status
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (authStatus === 'error' && errorMessage) {
        setError(decodeURIComponent(errorMessage));
        console.error('❌ Google OAuth error:', errorMessage);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/auth/google/status`);
      
      if (response.data.success && response.data.authenticated) {
        setUser(response.data.user);
        setAuthenticated(true);
        setError('');
        
        if (onAuthChange) {
          onAuthChange(true, response.data.user);
        }
      } else {
        setUser(null);
        setAuthenticated(false);
        
        if (onAuthChange) {
          onAuthChange(false);
        }
      }
    } catch (error: any) {
      console.error('Error checking auth status:', error);
      setUser(null);
      setAuthenticated(false);
      
      if (onAuthChange) {
        onAuthChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (requestGmailAccess) {
        params.append('gmail', 'true');
      }
      
      const response = await axios.get(
        `${backendUrl}/api/auth/google/login?${params.toString()}`
      );
      
      if (response.data.success && response.data.authUrl) {
        // Redirect to Google OAuth (only on client)
        if (typeof window !== 'undefined') {
          window.location.href = response.data.authUrl;
        }
      } else {
        setError('Failed to initiate Google authentication');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      setError('');
      
      await axios.post(`${backendUrl}/api/auth/google/logout`, {
        userId: user?.email || 'default'
      });
      
      setUser(null);
      setAuthenticated(false);
      
      if (onAuthChange) {
        onAuthChange(false);
      }
      
      console.log('✅ Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      setError('Logout failed');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state during SSR or when loading
  if (!isClient || loading) {
    return (
      <div className="google-auth loading">
        <div className="spinner">🔄</div>
        <span>{!isClient ? 'Initializing...' : 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="google-auth">
      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button 
            onClick={() => setError('')}
            className="error-close"
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      {authenticated && user ? (
        <div className="user-info">
          <div className="user-profile">
            <img 
              src={user.picture} 
              alt={user.name}
              className="user-avatar"
            />
            <div className="user-details">
              <h3 className="user-name">{user.name}</h3>
              <p className="user-email">{user.email}</p>
              {user.verified_email && (
                <span className="verified-badge">✅ Verified</span>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="logout-button"
            disabled={loading}
          >
            Disconnect Google
          </button>
        </div>
      ) : (
        <div className="login-section">
          <div className="login-info">
            <h3>Connect Your Google Account</h3>
            <p>
              {requestGmailAccess 
                ? 'Connect your Google account to access Gmail features and get personalized assistance.'
                : 'Connect your Google account for a personalized experience.'
              }
            </p>
            
            {requestGmailAccess && (
              <div className="permissions-info">
                <p><strong>Gmail Access Includes:</strong></p>
                <ul>
                  <li>📧 Read your emails</li>
                  <li>✍️ Compose and send emails</li>
                  <li>🔍 Search your inbox</li>
                  <li>📊 Email analytics and insights</li>
                </ul>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogin}
            className="google-login-button"
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            
            {requestGmailAccess 
              ? 'Connect Google & Gmail' 
              : 'Sign in with Google'
            }
          </button>
        </div>
      )}

      <style jsx>{`
        .google-auth {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin: 1rem 0;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 2rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #c33;
        }

        .error-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #c33;
          padding: 0;
          margin-left: 1rem;
        }

        .user-info {
          text-align: center;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .user-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2px solid #e0e0e0;
        }

        .user-details {
          text-align: left;
          flex: 1;
        }

        .user-name {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .user-email {
          margin: 0.25rem 0;
          color: #666;
          font-size: 0.9rem;
        }

        .verified-badge {
          font-size: 0.8rem;
          color: #28a745;
          font-weight: 500;
        }

        .logout-button {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.3s ease;
        }

        .logout-button:hover:not(:disabled) {
          background: #c82333;
        }

        .logout-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-section {
          text-align: center;
        }

        .login-info h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-size: 1.3rem;
        }

        .login-info > p {
          color: #666;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .permissions-info {
          background: #f0f8ff;
          border: 1px solid #b6d7ff;
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
          text-align: left;
        }

        .permissions-info p {
          margin: 0 0 0.5rem 0;
          font-weight: 600;
          color: #333;
        }

        .permissions-info ul {
          margin: 0;
          padding-left: 1.5rem;
          color: #555;
        }

        .permissions-info li {
          margin: 0.25rem 0;
        }

        .google-login-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          background: white;
          border: 2px solid #dadce0;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          color: #3c4043;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          max-width: 300px;
          margin: 0 auto;
        }

        .google-login-button:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #c1c7cd;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .google-login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .google-icon {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default GoogleAuth; 