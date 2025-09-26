const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { GoogleAuthManager } = require('../lib/auth/GoogleAuthManager');
const fs = require('fs').promises;
const path = require('path');

// Path for storing user tokens
const TOKENS_FILE = path.join(__dirname, '../data/google_tokens.json');

// Helper function to load tokens
const loadTokens = async (userId) => {
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf8');
    const allTokens = JSON.parse(data);
    return allTokens[userId] || null;
  } catch (error) {
    return null;
  }
};

// Initialize Google Auth Manager
const getGoogleAuthManager = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  return new GoogleAuthManager(clientId, clientSecret, redirectUri);
};

// POST /api/gmail/send - Send email via Gmail
router.post('/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    const userId = req.body.userId || 'default';

    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'to, subject, and body are required'
      });
    }

    // Load user tokens
    const tokens = await loadTokens(userId);
    if (!tokens) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Google. Please connect your Google account first.'
      });
    }

    // Check if user has Gmail access
    if (!tokens.scope?.includes('gmail')) {
      return res.status(403).json({
        success: false,
        error: 'Gmail access not granted. Please reconnect your Google account with Gmail permissions.'
      });
    }

    // Get authenticated client
    const authManager = getGoogleAuthManager();
    const client = await authManager.getValidClient(tokens);

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: client });

    // Create email message
    const raw = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`
    ).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send the email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: raw
      }
    });

    res.json({
      success: true,
      messageId: result.data.id,
      threadId: result.data.threadId,
      to,
      subject
    });

  } catch (error) {
    // 🔴 Step 1: Log the raw error to see what we're getting
    console.error("🔴 Raw Gmail send error:", error);
    console.error("🔴 Error.response.data:", error?.response?.data);
    console.error("🔴 Error.message:", error?.message);
    console.error("🔴 Full error object:", JSON.stringify(error, null, 2));
    
    // Step 2: Extract detailed error information
    let detailedError = 'Unknown Gmail error occurred';
    let errorCode = 500;
    let errorDetails = null;
    
    if (error.response) {
      // Gmail API returned an HTTP error response
      errorCode = error.response.status || 500;
      const responseData = error.response.data;
      
      if (responseData?.error) {
        if (typeof responseData.error === 'string') {
          detailedError = responseData.error;
        } else if (responseData.error.message) {
          detailedError = responseData.error.message;
        } else {
          detailedError = JSON.stringify(responseData.error);
        }
        errorDetails = responseData.error;
      } else if (typeof responseData === 'string') {
        detailedError = responseData;
      } else {
        detailedError = JSON.stringify(responseData);
        errorDetails = responseData;
      }
    } else if (error.message) {
      // Network or other error
      detailedError = error.message;
      if (error.message.includes('ECONNREFUSED')) {
        detailedError = 'Network connection failed - unable to reach Gmail servers';
      } else if (error.message.includes('timeout')) {
        detailedError = 'Request timed out while connecting to Gmail';
      }
    }

    console.error('Gmail send error - Final processed error:', detailedError);
    
    res.status(errorCode).json({
      success: false,
      error: `Gmail API Error: ${detailedError}`,
      details: detailedError,
      errorDetails: {
        originalError: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        toolName: 'gmail_send_email',
        variables: { to: req.body.to, subject: req.body.subject ? '[REDACTED]' : null, bodyLength: req.body.body ? req.body.body.length : 0 },
        errorType: 'api_error',
        specificDetails: errorDetails
      }
    });
  }
});

module.exports = router; 