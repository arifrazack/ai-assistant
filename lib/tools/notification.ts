export interface NotificationInput {
  message: string;
  title?: string;
  subtitle?: string;
}

export async function sendNotification(input: NotificationInput): Promise<any> {
  const { message, title = "Assistant Notification", subtitle } = input;
  
  try {
    // Call backend to send notification
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    const response = await fetch(`${backendUrl}/api/notification/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        title,
        subtitle
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      // Log the raw error response to debug
      console.error("🔴 Notification Tool - Raw response status:", response.status);
      console.error("🔴 Notification Tool - Raw response body:", result);
      
      // Extract detailed error message
      let fullErrorMessage = 'Notification Error: Unknown error occurred';
      
      if (result.details) {
        fullErrorMessage = `Notification Error: ${result.details}`;
      } else if (result.error) {
        fullErrorMessage = result.error.includes('Notification Error:') 
          ? result.error 
          : `Notification Error: ${result.error}`;
      } else {
        fullErrorMessage = `Notification Error: HTTP ${response.status} - ${response.statusText || 'Unknown error'}`;
      }
      
      // Create error object with all the details for enhanced error handling
      const error = new Error(fullErrorMessage) as any;
      error.originalError = result;
      error.statusCode = response.status;
      error.errorDetails = {
        originalError: result.error || result.details || 'Unknown notification error',
        responseData: result,
        statusCode: response.status,
        toolName: 'notification',
        errorType: 'api_error',
        specificDetails: result.errorDetails || {}
      };
      
      throw error;
    }

    return {
      success: true,
      message: `✅ Notification sent: "${message}"`,
      details: {
        title: result.title,
        message: result.message,
        subtitle: result.subtitle,
        timestamp: result.timestamp
      }
    };

  } catch (error: any) {
    console.error('🔴 Notification tool error:', error);
    
    if (error.originalError || error.errorDetails) {
      // Re-throw enhanced error for proper error handling
      throw error;
    } else {
      // Create enhanced error for unexpected errors
      const enhancedError = new Error(`Notification Error: ${error.message}`) as any;
      enhancedError.originalError = {
        success: false,
        error: error.message,
        details: 'Failed to send notification'
      };
      enhancedError.statusCode = 500;
      enhancedError.errorDetails = {
        originalError: error.message,
        responseData: null,
        statusCode: 500,
        toolName: 'notification',
        errorType: 'system_error',
        specificDetails: { stack: error.stack }
      };
      
      throw enhancedError;
    }
  }
}