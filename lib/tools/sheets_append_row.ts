export interface SheetsAppendRowInput {
  spreadsheetId: string;
  range: string;
  values: string[];
}

export async function appendRowToSheet(input: SheetsAppendRowInput): Promise<any> {
  const { spreadsheetId, range, values } = input;
  
  try {
    // Call backend to append row
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    const response = await fetch(`${backendUrl}/api/sheets/append`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spreadsheetId,
        range,
        values
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      // 🔴 Step 1: Log the raw error response to debug
      console.error("🔴 Sheets Tool - Raw response status:", response.status);
      console.error("🔴 Sheets Tool - Raw response body:", result);
      
      // Step 2: Extract detailed error message from enhanced backend response
      let fullErrorMessage = 'Google Sheets Error: Unknown error occurred';
      
      if (result.details) {
        // Backend provided detailed error message
        fullErrorMessage = `Google Sheets Error: ${result.details}`;
      } else if (result.error) {
        // Fallback to main error field
        fullErrorMessage = result.error.includes('Google Sheets API Error:') 
          ? result.error 
          : `Google Sheets Error: ${result.error}`;
      } else {
        // Last resort - use status code
        fullErrorMessage = `Google Sheets Error: HTTP ${response.status} - ${response.statusText || 'Unknown error'}`;
      }
      
      console.error('Sheets Tool - Processed error message:', fullErrorMessage);
      
      // Create enhanced error object
      const enhancedError = new Error(fullErrorMessage);
      (enhancedError as any).originalError = result;
      (enhancedError as any).statusCode = response.status;
      (enhancedError as any).errorDetails = result.errorDetails;
      
      throw enhancedError;
    }
    
    return {
      success: true,
      spreadsheetId: result.spreadsheetId,
      tableRange: result.tableRange,
      updatedRows: result.updates?.updatedRows || 0,
      updatedColumns: result.updates?.updatedColumns || 0,
      updatedCells: result.updates?.updatedCells || 0,
      message: `✅ Successfully added row to Google Sheets: ${values.join(', ')}`
    };
    
  } catch (error: any) {
    console.error('Sheets append row error:', error);
    
    // Check if this is a fetch/network error (before reaching backend)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error(`Google Sheets Network Error: Unable to connect to Google Sheets service. Please check your internet connection.`);
      (networkError as any).originalError = error;
      throw networkError;
    }
    
    // If it's already our enhanced error from above, preserve it completely
    if (error.message.includes('Google Sheets Error:') || error.message.includes('Google Sheets API Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, wrap with context but preserve original
    const unexpectedError = new Error(`Google Sheets Unexpected Error: ${error.message || 'Unknown error occurred'}`);
    (unexpectedError as any).originalError = error;
    throw unexpectedError;
  }
} 