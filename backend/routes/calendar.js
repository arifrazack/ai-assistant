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

// POST /api/calendar/create - Create event in Google Calendar
router.post('/create', async (req, res) => {
  try {
    const { summary, start, end, description, location } = req.body;
    const userId = req.body.userId || 'default';

    if (!summary || !start || !end) {
      return res.status(400).json({
        success: false,
        error: 'summary, start, and end are required'
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

    // Create Calendar API client
    const calendar = google.calendar({ version: 'v3', auth: client });

    // Create event object - always expect ISO string dates from variable extraction
    const event = {
      summary,
      start: {
        dateTime: start, // start should always be ISO string like "2025-08-06T19:00:00"
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: end, // end should always be ISO string like "2025-08-06T20:00:00"  
        timeZone: 'America/Los_Angeles',
      },
      ...(description && { description }),
      ...(location && { location }),
    };

    // Create the event
    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });

    res.json({
      success: true,
      eventId: result.data.id,
      htmlLink: result.data.htmlLink,
      summary: result.data.summary,
      start: result.data.start,
      end: result.data.end,
      location: result.data.location,
      description: result.data.description
    });

  } catch (error) {
    // Log the raw error to debug Calendar API responses
    console.error("🔴 Raw Calendar API error:", error);
    console.error("🔴 Error.response.data:", error?.response?.data);
    
    // Extract detailed error information
    let detailedError = 'Unknown Calendar error occurred';
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

    console.error('Calendar create error - Final processed error:', detailedError);
    
    res.status(errorCode).json({
      success: false,
      error: `Calendar API Error: ${detailedError}`,
      details: detailedError,
      errorDetails: {
        originalError: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        toolName: 'calendar_create_event',
        errorType: 'api_error',
        specificDetails: errorDetails
      }
    });
  }
});

module.exports = router; 