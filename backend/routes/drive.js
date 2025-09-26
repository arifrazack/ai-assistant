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

// POST /api/drive/download - Download file from Google Drive
router.post('/download', async (req, res) => {
  try {
    const { fileId } = req.body;
    const userId = req.body.userId || 'default';

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'fileId is required'
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

    // Get authenticated client
    const authManager = getGoogleAuthManager();
    const client = await authManager.getValidClient(tokens);

    // Create Drive API client
    const drive = google.drive({ version: 'v3', auth: client });

    // Get file metadata first
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'name,mimeType,size'
    });

    // Download the file content
    const result = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { 
      responseType: 'stream' 
    });

    // Convert stream to string/buffer
    let content = '';
    const chunks = [];
    
    return new Promise((resolve, reject) => {
      result.data.on('data', (chunk) => {
        chunks.push(chunk);
        // For text files, also build string content
        if (fileMetadata.data.mimeType?.startsWith('text/') || 
            fileMetadata.data.mimeType?.includes('json') ||
            fileMetadata.data.mimeType?.includes('xml')) {
          content += chunk.toString('utf8');
        }
      });
      
      result.data.on('end', () => {
        res.json({
          success: true,
          fileId,
          fileName: fileMetadata.data.name,
          mimeType: fileMetadata.data.mimeType,
          size: fileMetadata.data.size,
          content: content || null,
          buffer: Buffer.concat(chunks).toString('base64') // Send as base64 string
        });
        resolve();
      });
      
      result.data.on('error', (error) => {
        console.error('Drive download error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
        reject(error);
      });
    });

  } catch (error) {
    // Log the raw error to debug Drive API responses
    console.error("🔴 Raw Drive API error:", error);
    console.error("🔴 Error.response.data:", error?.response?.data);
    
    // Extract detailed error information
    let detailedError = 'Unknown Drive error occurred';
    let errorCode = 500;
    let errorDetails = null;
    
    if (error.response) {
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
      }
    } else if (error.message) {
      detailedError = error.message;
    }

    console.error('Drive download error - Final processed error:', detailedError);
    
    res.status(errorCode).json({
      success: false,
      error: `Google Drive API Error: ${detailedError}`,
      details: detailedError,
      errorDetails: {
        originalError: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        toolName: 'drive_download_file',
        errorType: 'api_error',
        specificDetails: errorDetails
      }
    });
  }
});

module.exports = router; 