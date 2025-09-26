export interface DriveDownloadFileInput {
  fileId: string;
}

export async function downloadDriveFile(input: DriveDownloadFileInput): Promise<any> {
  const { fileId } = input;
  
  try {
    // Call backend to download file
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    const response = await fetch(`${backendUrl}/api/drive/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      // 🔴 Step 1: Log the raw error response to debug
      console.error("🔴 Drive Tool - Raw response status:", response.status);
      console.error("🔴 Drive Tool - Raw response body:", result);
      
      // Step 2: Extract detailed error message from enhanced backend response
      let fullErrorMessage = 'Google Drive Error: Unknown error occurred';
      
      if (result.details) {
        // Backend provided detailed error message
        fullErrorMessage = `Google Drive Error: ${result.details}`;
      } else if (result.error) {
        // Fallback to main error field
        fullErrorMessage = result.error.includes('Google Drive API Error:') 
          ? result.error 
          : `Google Drive Error: ${result.error}`;
      } else {
        // Last resort - use status code
        fullErrorMessage = `Google Drive Error: HTTP ${response.status} - ${response.statusText || 'Unknown error'}`;
      }
      
      console.error('Drive Tool - Processed error message:', fullErrorMessage);
      
      // Create enhanced error object
      const enhancedError = new Error(fullErrorMessage);
      (enhancedError as any).originalError = result;
      (enhancedError as any).statusCode = response.status;
      (enhancedError as any).errorDetails = result.errorDetails;
      
      throw enhancedError;
    }
    
    return {
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      mimeType: result.mimeType,
      content: result.content,
      size: result.size,
      message: `✅ Successfully downloaded file: ${result.fileName || fileId}`,
      downloadedAt: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error('Drive download file error:', error);
    
    // Check if this is a fetch/network error (before reaching backend)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error(`Google Drive Network Error: Unable to connect to Google Drive service. Please check your internet connection.`);
      (networkError as any).originalError = error;
      throw networkError;
    }
    
    // If it's already our enhanced error from above, preserve it completely
    if (error.message.includes('Google Drive Error:') || error.message.includes('Google Drive API Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, wrap with context but preserve original
    const unexpectedError = new Error(`Google Drive Unexpected Error: ${error.message || 'Unknown error occurred'}`);
    (unexpectedError as any).originalError = error;
    throw unexpectedError;
  }
} 