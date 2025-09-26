// Utility functions for the backend server

// Initialize contacts on server startup
async function initializeServer() {
  try {
    console.log('🚀 Initializing server...');
    
    // Initialize contacts system (download and cache all contacts)
    const { initializeApp } = require('./init-contacts');
    await initializeApp();
    
    console.log('✅ Server initialization complete');
  } catch (error) {
    console.error('❌ Server initialization failed:', error.message);
    console.log('⚠️  Contacts may not be available, but server will continue...');
  }
}

// Check if user wants to stop processing
function checkForStopRequest(clarification) {
  const clarificationLower = clarification.toLowerCase().trim();
  
  // Only stop if they clearly mean to stop - must be at the start, end, or standalone
  const explicitStopPatterns = [
    /^stop$/,           // Just "stop"
    /^stop\./,          // "stop."
    /^stop\s/,          // "stop " (followed by other words)
    /\sstop$/,          // " stop" (at the end)
    /^cancel$/,         // Just "cancel" 
    /^quit$/,           // Just "quit"
    /^abort$/,          // Just "abort"
    /^never mind$/,     // "never mind"
    /^nevermind$/,      // "nevermind"
    /^forget it$/,      // "forget it"
    /^give up$/         // "give up"
  ];
  
  return explicitStopPatterns.some(pattern => pattern.test(clarificationLower));
}

// Format error response
function formatErrorResponse(message, statusCode = 500) {
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
}

// Format success response
function formatSuccessResponse(data, message = 'Request completed successfully') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  initializeServer,
  checkForStopRequest,
  formatErrorResponse,
  formatSuccessResponse
}; 