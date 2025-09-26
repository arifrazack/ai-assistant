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

// POST /api/sheets/append - Append row to Google Sheets
router.post('/append', async (req, res) => {
  try {
    const { spreadsheetId, range, values } = req.body;
    const userId = req.body.userId || 'default';

    if (!spreadsheetId || !range || !values) {
      return res.status(400).json({
        success: false,
        error: 'spreadsheetId, range, and values are required'
      });
    }

    if (!Array.isArray(values)) {
      return res.status(400).json({
        success: false,
        error: 'values must be an array'
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

    // Create Sheets API client
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Append the row
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [values]
      }
    });

    res.json({
      success: true,
      spreadsheetId,
      updatedRange: result.data.updates?.updatedRange,
      updatedRows: result.data.updates?.updatedRows,
      updatedColumns: result.data.updates?.updatedColumns,
      updatedCells: result.data.updates?.updatedCells,
      values
    });

  } catch (error) {
    // Log the raw error to debug Sheets API responses
    console.error("🔴 Raw Sheets API error:", error);
    console.error("🔴 Error.response.data:", error?.response?.data);
    
    // Extract detailed error information
    let detailedError = 'Unknown Sheets error occurred';
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

    console.error('Sheets append error - Final processed error:', detailedError);
    
    res.status(errorCode).json({
      success: false,
      error: `Google Sheets API Error: ${detailedError}`,
      details: detailedError,
      errorDetails: {
        originalError: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        toolName: 'sheets_append_row',
        errorType: 'api_error',
        specificDetails: errorDetails
      }
    });
  }
});

module.exports = router; 