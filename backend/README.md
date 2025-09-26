# Node.js Backend for Next.js OpenAI Chat App

Express.js backend server that provides OpenAI integration for the chat application.

## Features

- 🤖 OpenAI API integration with multiple model support
- 🔒 Secure API key management
- 🌐 CORS enabled for frontend communication
- 📝 Comprehensive error handling
- 🔍 Health check endpoint
- 📊 Usage tracking and logging

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in this directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Run the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Health Check
```http
GET /health
```
Returns server status and timestamp.

### Chat Completion
```http
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "type": "text",
  "model": "gpt-3.5-turbo"
}
```

### Available Models
```http
GET /api/models
```
Returns list of available OpenAI models.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | Your OpenAI API key |
| `PORT` | No | 5001 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `FRONTEND_URL` | No | http://localhost:3000 | Allowed frontend origin |

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid API key)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `501` - Not Implemented (audio processing)

## Future Expansion Points

This backend is designed for easy extension:

- **Audio Processing**: Add speech-to-text endpoints
- **Authentication**: Add user management and JWT tokens
- **Database**: Add conversation history storage
- **Websockets**: Add real-time communication
- **Rate Limiting**: Add request rate limiting per user
- **Caching**: Add response caching for efficiency
- **File Processing**: Add document/image processing endpoints 