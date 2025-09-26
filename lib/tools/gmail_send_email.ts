export interface GmailSendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export async function sendGmailEmail(input: GmailSendEmailInput): Promise<any> {
  const { to, subject, body } = input;
  
  try {
    // Call backend to send email
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    const response = await fetch(`${backendUrl}/api/gmail/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        body
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      // 🔴 Step 1: Log the raw error response to debug
      console.error("🔴 Gmail Tool - Raw response status:", response.status);
      console.error("🔴 Gmail Tool - Raw response body:", result);
      
      // Step 2: Extract detailed error message from enhanced backend response
      let fullErrorMessage = 'Gmail Send Error: Unknown error occurred';
      
      if (result.details) {
        // Backend provided detailed error message
        fullErrorMessage = `Gmail Send Error: ${result.details}`;
      } else if (result.error) {
        // Fallback to main error field
        fullErrorMessage = result.error.includes('Gmail API Error:') 
          ? result.error 
          : `Gmail Send Error: ${result.error}`;
      } else {
        // Last resort - use status code
        fullErrorMessage = `Gmail Send Error: HTTP ${response.status} - ${response.statusText || 'Unknown error'}`;
      }
      
      console.error('Gmail Tool - Processed error message:', fullErrorMessage);
      
      // Create enhanced error object
      const enhancedError = new Error(fullErrorMessage);
      (enhancedError as any).originalError = result;
      (enhancedError as any).statusCode = response.status;
      (enhancedError as any).errorDetails = result.errorDetails;
      
      throw enhancedError;
    }
    
    return {
      success: true,
      messageId: result.messageId,
      threadId: result.threadId,
      message: `✅ Email sent successfully to ${to}`,
      to,
      subject
    };
    
  } catch (error: any) {
    console.error('Gmail send email error:', error);
    
    // Check if this is a fetch/network error (before reaching backend)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error(`Gmail Network Error: Unable to connect to Gmail service. Please check your internet connection.`);
      (networkError as any).originalError = error;
      throw networkError;
    }
    
    // If it's already our enhanced error from above, preserve it completely
    if (error.message.includes('Gmail Send Error:') || error.message.includes('Gmail API Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, wrap with context but preserve original
    const unexpectedError = new Error(`Gmail Unexpected Error: ${error.message || 'Unknown error occurred'}`);
    (unexpectedError as any).originalError = error;
    throw unexpectedError;
  }
} 