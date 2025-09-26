const express = require('express');
const router = express.Router();
const { GoogleAuthManager } = require('../lib/auth/GoogleAuthManager');
const fs = require('fs').promises;
const path = require('path');

// Path for storing user tokens (in production, use a database)
const TOKENS_FILE = path.join(__dirname, '../data/google_tokens.json');

// Initialize Google Auth Manager
const getGoogleAuthManager = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }
  
  return new GoogleAuthManager(clientId, clientSecret, redirectUri);
};

// Helper functions for token storage
const saveTokens = async (userId, tokens) => {
  try {
    let allTokens = {};
    try {
      const data = await fs.readFile(TOKENS_FILE, 'utf8');
      allTokens = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, start with empty object
    }
    
    allTokens[userId] = {
      ...tokens,
      updatedAt: new Date().toISOString()
    };
    
    // Ensure data directory exists
    await fs.mkdir(path.dirname(TOKENS_FILE), { recursive: true });
    await fs.writeFile(TOKENS_FILE, JSON.stringify(allTokens, null, 2));
    
    console.log(`✅ Saved Google tokens for user: ${userId}`);
  } catch (error) {
    console.error('❌ Failed to save Google tokens:', error);
    throw error;
  }
};

const loadTokens = async (userId) => {
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf8');
    const allTokens = JSON.parse(data);
    return allTokens[userId] || null;
  } catch (error) {
    console.log('No stored Google tokens found');
    return null;
  }
};

const deleteTokens = async (userId) => {
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf8');
    const allTokens = JSON.parse(data);
    delete allTokens[userId];
    await fs.writeFile(TOKENS_FILE, JSON.stringify(allTokens, null, 2));
    console.log(`✅ Deleted Google tokens for user: ${userId}`);
  } catch (error) {
    console.error('❌ Failed to delete Google tokens:', error);
  }
};

// Routes

// GET /api/auth/google/login - Start OAuth flow
router.get('/google/login', (req, res) => {
  try {
    const authManager = getGoogleAuthManager();
    
    // Choose scopes based on query parameters
    let scopes;
    if (req.query.full === 'true') {
      scopes = GoogleAuthManager.getFullGoogleScopes();
    } else if (req.query.gmail === 'true') {
      scopes = GoogleAuthManager.getGmailScopes();
    } else {
      scopes = GoogleAuthManager.getProfileScopes();
    }
    
    const authUrl = authManager.generateAuthUrl(scopes);
    
    console.log('🔗 Generated Google auth URL with scopes:', scopes);
    res.json({ 
      success: true, 
      authUrl,
      scopes 
    });
  } catch (error) {
    console.error('❌ Error generating Google auth URL:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/auth/google/callback - Handle OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Authorization code not provided' 
      });
    }
    
    const authManager = getGoogleAuthManager();
    const tokens = await authManager.exchangeCodeForToken(code);
    
    // Get user info
    const client = await authManager.getValidClient(tokens);
    const userInfo = await authManager.getUserInfo(client);
    
    // Store tokens (using email as user ID for simplicity)
    await saveTokens(userInfo.email, tokens);
    
    // Also save under 'default' for easier frontend access
    await saveTokens('default', tokens);
    
    console.log('✅ Google OAuth successful for user:', userInfo.email);
    
    // Redirect to success page or return JSON
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=success&user=${encodeURIComponent(userInfo.email)}`);
  } catch (error) {
    console.error('❌ Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=error&message=${encodeURIComponent(error.message)}`);
  }
});

// GET /api/auth/google/status - Check authentication status
router.get('/google/status', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const tokens = await loadTokens(userId);
    
    if (!tokens) {
      return res.json({ 
        success: true, 
        authenticated: false 
      });
    }
    
    const authManager = getGoogleAuthManager();
    const client = await authManager.getValidClient(tokens);
    const userInfo = await authManager.getUserInfo(client);
    
    res.json({
      success: true,
      authenticated: true,
      user: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified_email: userInfo.verified_email
      },
      scopes: tokens.scope?.split(' ') || [],
      hasGmailAccess: tokens.scope?.includes('gmail') || false,
      hasSheetsAccess: tokens.scope?.includes('spreadsheets') || false,
      hasDriveAccess: tokens.scope?.includes('drive') || false,
      hasCalendarAccess: tokens.scope?.includes('calendar') || false
    });
  } catch (error) {
    console.error('❌ Error checking Google auth status:', error);
    res.json({ 
      success: true, 
      authenticated: false,
      error: error.message 
    });
  }
});

// POST /api/auth/google/logout - Revoke tokens and logout
router.post('/google/logout', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const tokens = await loadTokens(userId);
    
    if (tokens) {
      const authManager = getGoogleAuthManager();
      await authManager.revokeToken(tokens);
      await deleteTokens(userId);
    }
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('❌ Error during Google logout:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/auth/google/user - Get current user info
router.get('/google/user', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const tokens = await loadTokens(userId);
    
    if (!tokens) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const authManager = getGoogleAuthManager();
    const client = await authManager.getValidClient(tokens);
    const userInfo = await authManager.getUserInfo(client);
    
    res.json({
      success: true,
      user: userInfo
    });
  } catch (error) {
    console.error('❌ Error getting Google user info:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/auth/google/client - Get authenticated Google client for API calls
router.get('/google/client', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const tokens = await loadTokens(userId);
    
    if (!tokens) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const authManager = getGoogleAuthManager();
    const client = await authManager.getValidClient(tokens);
    
    // Return client credentials for API usage
    res.json({
      success: true,
      client: {
        credentials: client.credentials
      }
    });
  } catch (error) {
    console.error('❌ Error getting Google client:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router; 