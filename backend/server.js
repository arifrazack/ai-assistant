const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const gmailRoutes = require('./routes/gmail');
const sheetsRoutes = require('./routes/sheets');
const driveRoutes = require('./routes/drive');
const calendarRoutes = require('./routes/calendar');
const notificationRoutes = require('./routes/notification');
const chatRoutes = require('./routes/chat');
const statusRoutes = require('./routes/status');

// Import utilities
const { initializeServer } = require('./lib/utils');

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disable Express response buffering for SSE
app.use((req, res, next) => {
  if (req.path.includes('/status/stream')) {
    res.set({
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Google API routes
app.use('/api/gmail', gmailRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/calendar', calendarRoutes);

// System routes
app.use('/api/notification', notificationRoutes);

// Chat routes
app.use('/api', chatRoutes);

// Status routes for real-time updates
app.use('/api/status', statusRoutes.router);

// Get available models endpoint
app.get('/api/models', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    const models = await openai.models.list();
    const chatModels = models.data.filter(model => 
      model.id.includes('gpt') || model.id.includes('chat')
    );

    return res.status(200).json({
      success: true,
      models: chatModels.map(model => ({
        id: model.id,
        created: model.created,
        owned_by: model.owned_by
      }))
    });

  } catch (error) {
    console.error('Error fetching models:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch available models'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'POST /api/chat',
      'POST /api/chat/clarify',
      'GET /api/models'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🤖 Models endpoint: http://localhost:${PORT}/api/models`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not found in environment variables');
  }
  
  // Initialize contacts and other systems
  await initializeServer();
}); 