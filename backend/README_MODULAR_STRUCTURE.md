# Backend Modular Structure

This document describes the new modular architecture of the backend server after refactoring from a monolithic structure.

## Directory Structure

```
backend/
├── server.js                 # Main server entry point
├── lib/                      # Core business logic modules
│   ├── toolRegistry.js       # Centralized tool definitions
│   ├── intentClassifier.js   # User intent analysis
│   ├── toolSelector.js       # Tool selection and dependency logic
│   ├── variableExtractor.js  # Parameter extraction from messages
│   ├── toolExecutor.js       # Tool execution orchestration
│   ├── responseGenerator.js  # Natural language response generation
│   ├── errorHandler.js       # Advanced error handling and recovery
│   └── utils.js              # Common utility functions
└── routes/                   # API route handlers
    ├── auth.js               # Authentication routes
    ├── gmail.js              # Gmail API routes
    ├── calendar.js           # Google Calendar routes
    ├── drive.js              # Google Drive routes
    ├── sheets.js             # Google Sheets routes
    └── chat.js               # Chat processing routes
```

## 🚀 **Complete Error Handling System (Updated)**

The system now implements **comprehensive end-to-end error handling** that preserves detailed error information from Google APIs all the way to the frontend:

### **1. Backend API Routes Enhanced Error Handling**

All Google API routes (Gmail, Calendar, Sheets, Drive) now:

**Before (Generic Errors)**:
```javascript
} catch (error) {
  console.error('Gmail send error:', error);
  res.status(500).json({
    success: false,
    error: error.message
  });
}
```

**After (Detailed Error Capture)**:
```javascript
} catch (error) {
  console.error("🔴 Raw Gmail API error:", error);
  console.error("🔴 Error.response.data:", error?.response?.data);
  
  // Extract detailed error information
  let detailedError = 'Unknown Gmail error occurred';
  let errorCode = 500;
  let errorDetails = null;
  
  if (error.response) {
    errorCode = error.response.status || 500;
    const responseData = error.response.data;
    
    if (responseData?.error?.message) {
      detailedError = responseData.error.message;
      errorDetails = responseData.error;
    }
  }
  
  res.status(errorCode).json({
    success: false,
    error: `Gmail API Error: ${detailedError}`,
    details: detailedError,
    errorDetails: {
      originalError: error.message,
      responseData: error.response?.data,
      statusCode: error.response?.status,
      toolName: 'gmail_send_email',
      errorType: 'api_error',
      specificDetails: errorDetails
    }
  });
}
```

### **2. Frontend Tools Enhanced Error Handling**

All frontend tools now:

**Before (Generic Frontend Errors)**:
```javascript
throw new Error(`Failed to send email: ${error.message}`);
```

**After (Preserve Detailed Backend Errors)**:
```javascript
// Log raw response for debugging
console.error("🔴 Gmail Tool - Raw response status:", response.status);
console.error("🔴 Gmail Tool - Raw response body:", result);

// Extract detailed error message from enhanced backend response
let fullErrorMessage = 'Gmail Send Error: Unknown error occurred';

if (result.details) {
  // Backend provided detailed error message
  fullErrorMessage = `Gmail Send Error: ${result.details}`;
} else if (result.error) {
  fullErrorMessage = result.error.includes('Gmail API Error:') 
    ? result.error 
    : `Gmail Send Error: ${result.error}`;
}

// Create enhanced error object
const enhancedError = new Error(fullErrorMessage);
(enhancedError as any).originalError = result;
(enhancedError as any).statusCode = response.status;
(enhancedError as any).errorDetails = result.errorDetails;

throw enhancedError;
```

### **3. Main API Handler Fixed**

The `/api/tools.ts` handler was the **critical missing piece** - it was swallowing all detailed errors:

**Before (Error Swallowing)**:
```javascript
} catch (error: any) {
  return res.status(500).json({
    success: false,
    error: error.message || error.toString()  // ❌ Lost all details!
  });
}
```

**After (Error Preservation)**:
```javascript
} catch (error: any) {
  // Log raw error for debugging
  console.error("🔴 Tools API - Raw tool execution error:", error);
  
  // Preserve detailed error information from enhanced tools
  let errorMessage = error.message || 'Unknown tool execution error';
  let statusCode = error.statusCode || 500;
  let errorDetails = error.errorDetails || null;
  
  return res.status(statusCode).json({
    success: false,
    error: errorMessage,
    tool: req.body?.tool || 'unknown',
    errorDetails: errorDetails || {
      originalError: error.originalError?.message || error.message,
      toolName: req.body?.tool || 'unknown',
      errorType: 'execution_error',
      specificDetails: error.originalError || null,
      statusCode: statusCode
    }
  });
}
```

### **4. Complete Error Flow Examples**

**Gmail "Invalid To header" Error Flow**:

1. **Google Gmail API** returns:
   ```json
   {
     "error": {
       "message": "Invalid To header",
       "code": 400
     }
   }
   ```

2. **Backend Route** (`/api/gmail/send`) captures and enhances:
   ```json
   {
     "success": false,
     "error": "Gmail API Error: Invalid To header",
     "details": "Invalid To header",
     "errorDetails": {
       "originalError": "Request failed with status code 400",
       "responseData": { "error": { "message": "Invalid To header", "code": 400 } },
       "statusCode": 400,
       "toolName": "gmail_send_email",
       "errorType": "api_error",
       "specificDetails": { "message": "Invalid To header", "code": 400 }
     }
   }
   ```

3. **Frontend Tool** preserves and passes through:
   ```javascript
   throw new Error("Gmail Send Error: Invalid To header");
   // + enhanced error properties
   ```

4. **Main API Handler** preserves for backend processing:
   ```json
   {
     "success": false,
     "error": "Gmail Send Error: Invalid To header",
     "tool": "gmail_send_email",
     "errorDetails": { /* full context preserved */ }
   }
   ```

5. **Backend Error Handler** classifies and generates specific clarification:
   ```javascript
   // Recognizes "Invalid To header" → classifies as "missing_recipient"
   // Generates: "I need to send an email but I'm missing the recipient..."
   ```

6. **Frontend Card** displays targeted message:
   > 📧 "I need to send an email but I'm missing the recipient. Please provide a valid email address or contact name. For example, you could say 'john@example.com' or 'John Smith'. Would you like to try again?"

## Enhanced Error Classification

The new modular structure includes a sophisticated error handling system that provides specific, actionable error messages:

### Error Classification
- **Gmail Errors**: "Invalid To header", "Missing subject", "Authentication required", "Invalid email format"
- **Calendar Errors**: "Invalid date format", "Missing event title", "Permission denied", "Event conflicts"
- **Contact Errors**: "Contact not found", "Multiple contacts found", "Invalid contact format"
- **Browser Errors**: "Browser not installed", "Invalid URL format", "Permission denied"
- **App Errors**: "App not found", "App not installed", "Missing app name"
- **Authentication Errors**: "Token expired", "Permission denied", "Account not connected"
- **Network Errors**: "Connection timeout", "Service unavailable", "DNS resolution failed"

### Frontend Error Integration
The frontend now receives structured error data that includes:

```json
{
  "success": false,
  "needsClarification": true,
  "toolFailed": "gmail_send_email",
  "clarificationRequest": "I need to send an email but I'm missing the recipient...",
  "errorDetails": {
    "tool": "gmail_send_email",
    "classification": {
      "errorType": "missing_recipient",
      "specificDetails": "Invalid To header",
      "userActionRequired": "Please provide a valid email address or contact name",
      "suggestedFixes": ["john@example.com", "John Smith"]
    }
  }
}
```

## 🎯 **Result: Perfect Error Chain**

Now when a Gmail API returns `"Invalid To header"`, users get:

> 📧 **"I need to send an email but I'm missing the recipient. Please provide a valid email address or contact name. For example, you could say 'john@example.com' or 'John Smith'. Would you like to try again?"**

Instead of:
> ❌ **"Something went wrong"** or **"Request failed with status code 500"**

The error handling system now works **end-to-end**: **Google APIs** → **Backend Routes** → **Frontend Tools** → **Main API Handler** → **Error Classification** → **Specific User Messages** 🎉

## Benefits of Modular Structure

### 1. **Maintainability**
- Each module has a single, clear responsibility
- Changes to one component don't affect others
- Easier to locate and fix bugs

### 2. **Testability**
- Each module can be unit tested independently
- Mock dependencies easily for isolated testing
- Better test coverage and reliability

### 3. **Scalability**
- Easy to add new tools or modify existing ones
- Tool registry system allows dynamic tool management
- Horizontal scaling of individual components

### 4. **Error Handling**
- Comprehensive error classification and recovery
- Detailed logging for debugging
- User-friendly error messages with actionable guidance

### 5. **Code Reusability**
- Common utilities shared across modules
- Consistent patterns across the codebase
- Easy to extract and reuse components

## Module Descriptions

### toolRegistry.js
Centralized repository of all available tools with their configurations, parameters, and descriptions.

### intentClassifier.js
Uses AI to analyze user messages and determine the underlying intent (e.g., "send email", "create event").

### toolSelector.js
Complex logic for selecting appropriate tools based on intent, handling conditional logic, and managing tool dependencies.

### variableExtractor.js
Intelligent extraction of parameters needed by tools from user messages, with both regex and AI-powered extraction.

### toolExecutor.js
Orchestrates tool execution with support for parallel, sequential, and conditional execution patterns. Now includes **detailed error capture and classification**.

### responseGenerator.js
Generates natural language responses based on tool execution results and original user intent.

### errorHandler.js
Advanced error recovery system with **specific error classification**, retry mechanisms, and **targeted clarification requests**.

### utils.js
Common utilities for server initialization, request validation, and response formatting.

## API Routes

### chat.js
Main chat processing endpoints that tie together all the AI processing modules.

### Google API Routes (gmail.js, calendar.js, drive.js, sheets.js)
All now implement **enhanced error handling** that captures and preserves detailed API error information.

## Migration Notes

The refactoring maintains complete backward compatibility while improving:
- Code organization and maintainability
- **Error handling and user experience**
- Performance through better separation of concerns
- **End-to-end error visibility and debugging**
- Testing and debugging capabilities

All existing functionality remains intact with **significantly improved error handling and user feedback**. 