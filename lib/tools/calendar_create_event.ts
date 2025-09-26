export interface CalendarCreateEventInput {
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

export async function createCalendarEvent(input: CalendarCreateEventInput): Promise<any> {
  const { summary, start, end, description, location } = input;
  
  try {
    // Call backend to create event
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    const response = await fetch(`${backendUrl}/api/calendar/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        start,
        end,
        description,
        location
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      // 🔴 Step 1: Log the raw error response to debug
      console.error("🔴 Calendar Tool - Raw response status:", response.status);
      console.error("🔴 Calendar Tool - Raw response body:", result);
      
      // Step 2: Extract detailed error message from enhanced backend response
      let fullErrorMessage = 'Calendar Event Error: Unknown error occurred';
      
      if (result.details) {
        // Backend provided detailed error message
        fullErrorMessage = `Calendar Event Error: ${result.details}`;
      } else if (result.error) {
        // Fallback to main error field
        fullErrorMessage = result.error.includes('Calendar API Error:') 
          ? result.error 
          : `Calendar Event Error: ${result.error}`;
      } else {
        // Last resort - use status code
        fullErrorMessage = `Calendar Event Error: HTTP ${response.status} - ${response.statusText || 'Unknown error'}`;
      }
      
      console.error('Calendar Tool - Processed error message:', fullErrorMessage);
      
      // Create enhanced error object
      const enhancedError = new Error(fullErrorMessage);
      (enhancedError as any).originalError = result;
      (enhancedError as any).statusCode = response.status;
      (enhancedError as any).errorDetails = result.errorDetails;
      
      throw enhancedError;
    }
    
    return {
      success: true,
      eventId: result.eventId,
      htmlLink: result.htmlLink,
      summary: result.summary,
      start: result.start,
      end: result.end,
      location: result.location,
      description: result.description,
      message: `✅ Calendar event created successfully: ${summary}`,
      calendarUrl: result.htmlLink
    };
    
  } catch (error: any) {
    console.error('Calendar create event error:', error);
    
    // Check if this is a fetch/network error (before reaching backend)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error(`Calendar Network Error: Unable to connect to Calendar service. Please check your internet connection.`);
      (networkError as any).originalError = error;
      throw networkError;
    }
    
    // If it's already our enhanced error from above, preserve it completely
    if (error.message.includes('Calendar Event Error:') || error.message.includes('Calendar API Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, wrap with context but preserve original
    const unexpectedError = new Error(`Calendar Unexpected Error: ${error.message || 'Unknown error occurred'}`);
    (unexpectedError as any).originalError = error;
    throw unexpectedError;
  }
} 