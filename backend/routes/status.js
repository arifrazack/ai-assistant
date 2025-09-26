const express = require('express');
const router = express.Router();

// Store active SSE connections
const activeConnections = new Map();

// SSE endpoint for real-time status updates
router.get('/stream', (req, res) => {
  const connectionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  // Set SSE headers with explicit chunked encoding
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', connectionId })}\n\n`);
  if (res.flush) {
    res.flush();
  }

  // Store connection
  activeConnections.set(connectionId, res);
  
  console.log(`📡 SSE connection established: ${connectionId}`);

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    if (activeConnections.has(connectionId)) {
      try {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
        if (res.flush) {
          res.flush();
        }
      } catch (error) {
        console.error(`📡 Heartbeat failed for ${connectionId}:`, error);
        clearInterval(heartbeat);
        activeConnections.delete(connectionId);
      }
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // Send heartbeat every 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    activeConnections.delete(connectionId);
    console.log(`📡 SSE connection closed: ${connectionId}`);
  });

  req.on('error', (err) => {
    console.error(`📡 SSE connection error for ${connectionId}:`, err);
    clearInterval(heartbeat);
    activeConnections.delete(connectionId);
  });

  // Handle server shutdown
  res.on('close', () => {
    clearInterval(heartbeat);
    activeConnections.delete(connectionId);
    console.log(`📡 SSE response closed: ${connectionId}`);
  });
});

// Function to broadcast status to all connected clients
function broadcastStatus(status, message, details = {}) {
  // Use setImmediate to ensure this runs in the next tick, not blocked by current request
  setImmediate(() => {
    const statusUpdate = {
      type: 'status',
      status,
      message,
      timestamp: new Date().toISOString(),
      ...details
    };

    const data = `data: ${JSON.stringify(statusUpdate)}\n\n`;
    
    // Send to all active connections
    const connectionsToRemove = [];
    for (const [connectionId, res] of activeConnections) {
      try {
        if (res.writable) {
          res.write(data);
          // Force immediate flush to client - multiple approaches
          if (res.flush) {
            res.flush();
          }
          // Also try socket-level flush if available
          if (res.socket && res.socket.uncork) {
            res.socket.uncork();
          }
          // Force immediate transmission
          if (res.flushHeaders) {
            res.flushHeaders();
          }
        } else {
          connectionsToRemove.push(connectionId);
        }
      } catch (error) {
        console.error(`📡 Failed to send status to ${connectionId}:`, error);
        connectionsToRemove.push(connectionId);
      }
    }
    
    // Clean up broken connections
    connectionsToRemove.forEach(connectionId => {
      activeConnections.delete(connectionId);
    });
    
    console.log(`📡 Broadcasted status: ${status} - ${message} at ${new Date().toISOString()}`);
  });
}

// Function to broadcast tool execution updates
function broadcastToolUpdate(toolName, status, result = null, error = null) {
  // Use setImmediate to ensure this runs in the next tick, not blocked by current request
  setImmediate(() => {
    const toolUpdate = {
      type: 'tool',
      toolName,
      status, // 'started', 'success', 'failed'
      result,
      error,
      timestamp: new Date().toISOString()
    };

    const data = `data: ${JSON.stringify(toolUpdate)}\n\n`;
    
    const connectionsToRemove = [];
    for (const [connectionId, res] of activeConnections) {
      try {
        if (res.writable) {
          res.write(data);
          // Force immediate flush to client - multiple approaches
          if (res.flush) {
            res.flush();
          }
          // Also try socket-level flush if available
          if (res.socket && res.socket.uncork) {
            res.socket.uncork();
          }
          // Force immediate transmission
          if (res.flushHeaders) {
            res.flushHeaders();
          }
        } else {
          connectionsToRemove.push(connectionId);
        }
      } catch (error) {
        console.error(`📡 Failed to send tool update to ${connectionId}:`, error);
        connectionsToRemove.push(connectionId);
      }
    }
    
    // Clean up broken connections
    connectionsToRemove.forEach(connectionId => {
      activeConnections.delete(connectionId);
    });
    
    console.log(`📡 Broadcasted tool update: ${toolName} - ${status}`);
  });
}

// Export functions for use in other modules
module.exports = {
  router,
  broadcastStatus,
  broadcastToolUpdate
};