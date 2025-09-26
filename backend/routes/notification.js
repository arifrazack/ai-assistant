const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// POST /api/notification/send - Send system notification
router.post('/send', async (req, res) => {
  try {
    const { message, title = "Assistant Notification", subtitle } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    // Escape quotes and special characters for AppleScript
    const escapeForAppleScript = (str) => {
      if (!str) return '';
      return str.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
    };

    const escapedTitle = escapeForAppleScript(title);
    const escapedMessage = escapeForAppleScript(message);
    const escapedSubtitle = subtitle ? escapeForAppleScript(subtitle) : '';

    // Build AppleScript command for macOS notification
    let appleScript = `display notification "${escapedMessage}" with title "${escapedTitle}"`;
    
    if (subtitle) {
      appleScript += ` subtitle "${escapedSubtitle}"`;
    }

    // Add sound for better user experience
    appleScript += ` sound name "Glass"`;

    console.log('📢 Sending notification:', { title, message, subtitle });

    // Execute the AppleScript command
    const command = `osascript -e '${appleScript}'`;
    await execAsync(command);

    const timestamp = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'Notification sent successfully',
      title: title,
      message: message,
      subtitle: subtitle,
      timestamp: timestamp
    });

  } catch (error) {
    // Log the raw error to debug notification system
    console.error("🔴 Raw Notification error:", error);
    
    // Determine error type and create appropriate response
    let errorMessage = 'Failed to send notification';
    let errorDetails = {};
    
    if (error.code === 'ENOENT') {
      errorMessage = 'osascript command not found - notifications not supported on this system';
      errorDetails = {
        errorType: 'system_not_supported',
        code: error.code,
        message: 'AppleScript/osascript is required for notifications on macOS'
      };
    } else if (error.code && error.signal) {
      errorMessage = `Notification command failed with code ${error.code}`;
      errorDetails = {
        errorType: 'command_failed',
        code: error.code,
        signal: error.signal,
        stderr: error.stderr
      };
    } else {
      errorDetails = {
        errorType: 'unknown_error',
        message: error.message,
        stack: error.stack
      };
    }

    console.error("🔴 Processed notification error:", { errorMessage, errorDetails });

    res.status(500).json({
      success: false,
      error: `Notification Error: ${errorMessage}`,
      details: errorMessage,
      errorDetails: {
        originalError: error.message,
        responseData: { error: errorDetails },
        statusCode: 500,
        toolName: 'notification',
        errorType: 'api_error',
        specificDetails: errorDetails
      }
    });
  }
});

module.exports = router;