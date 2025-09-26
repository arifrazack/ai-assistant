import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function searchWeb(query: string, browser: string = 'Safari'): Promise<string> {
  try {
    console.log(`🔍 Searching for: "${query}" using ${browser}`);
    
    // Validate search query
    if (!query || query.trim() === '') {
      throw new Error('Web Search Error: Missing search query. Please provide search terms.');
    }
    
    const trimmedQuery = query.trim();
    
    // Create Google search URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmedQuery)}`;
    console.log(`🌐 Search URL: ${searchUrl}`);
    
    let command: string;
    
    // Browser selection with enhanced error handling
    switch (browser.toLowerCase()) {
      case 'chrome':
      case 'google chrome':
        command = `open -a "Google Chrome" "${searchUrl}"`;
        break;
      case 'safari':
        command = `open -a "Safari" "${searchUrl}"`;
        break;
      case 'arc':
        command = `open -a "Arc" "${searchUrl}"`;
        break;
      case 'default':
        command = `open -a "Safari" "${searchUrl}"`;  // Default to Safari for web search
        break;
      default:
        throw new Error(`Web Search Error: Unsupported browser: "${browser}". Supported browsers: Safari (default), Chrome, Arc`);
    }
    
    console.log(`🚀 Executing search command: ${command}`);
    
    try {
      await execAsync(command);
      return `✅ Successfully searched for "${trimmedQuery}" in ${browser} browser`;
    } catch (execError: any) {
      console.error('Web search execution error:', execError);
      
      // Parse specific execution errors
      const errorMessage = execError.message || execError.toString();
      
      if (errorMessage.includes('Application not found') || errorMessage.includes('Unable to find application')) {
        throw new Error(`Web Search Error: ${browser} browser is not installed or not found on your system. Please install ${browser} or try a different browser (Safari, Chrome, Arc).`);
      } else if (errorMessage.includes('Permission denied')) {
        throw new Error(`Web Search Error: Permission denied when trying to open browser for search. Please check system permissions.`);
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        throw new Error(`Web Search Error: Network connection issue while trying to search. Please check your internet connection.`);
      } else {
        throw new Error(`Web Search Execution Error: ${errorMessage}`);
      }
    }
    
  } catch (error: any) {
    console.error('Search web error:', error);
    
    // If it's already a detailed error from above, preserve it
    if (error.message.includes('Web Search Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, add context
    throw new Error(`Web Search Unexpected Error: ${error.message || 'Unknown error occurred while searching the web'}`);
  }
}

export async function searchYoutube(query: string, browser: string = 'Safari'): Promise<string> {
  try {
    console.log(`🎬 Searching YouTube for: "${query}" using ${browser}`);
    
    // Validate search query
    if (!query || query.trim() === '') {
      throw new Error('YouTube Search Error: Missing search query. Please provide search terms.');
    }
    
    const trimmedQuery = query.trim();
    
    // Create YouTube search URL
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmedQuery)}`;
    console.log(`🌐 YouTube URL: ${searchUrl}`);
    
    let command: string;
    
    // Browser selection with enhanced error handling
    switch (browser.toLowerCase()) {
      case 'chrome':
      case 'google chrome':
        command = `open -a "Google Chrome" "${searchUrl}"`;
        break;
      case 'safari':
        command = `open -a "Safari" "${searchUrl}"`;
        break;
      case 'arc':
        command = `open -a "Arc" "${searchUrl}"`;
        break;
      case 'default':
        command = `open -a "Safari" "${searchUrl}"`;  // Default to Safari
        break;
      default:
        throw new Error(`YouTube Search Error: Unsupported browser: "${browser}". Supported browsers: Safari (default), Chrome, Arc`);
    }
    
    console.log(`🚀 Executing YouTube search: ${command}`);
    
    try {
      await execAsync(command);
      return `✅ Successfully searched YouTube for "${trimmedQuery}" in ${browser} browser`;
    } catch (execError: any) {
      console.error('YouTube search execution error:', execError);
      
      // Parse specific execution errors
      const errorMessage = execError.message || execError.toString();
      
      if (errorMessage.includes('Application not found') || errorMessage.includes('Unable to find application')) {
        throw new Error(`YouTube Search Error: ${browser} browser is not installed or not found on your system. Please install ${browser} or try a different browser.`);
      } else if (errorMessage.includes('Permission denied')) {
        throw new Error(`YouTube Search Error: Permission denied when trying to open browser for YouTube search. Please check system permissions.`);
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        throw new Error(`YouTube Search Error: Network connection issue while trying to search YouTube. Please check your internet connection.`);
      } else {
        throw new Error(`YouTube Search Execution Error: ${errorMessage}`);
      }
    }
    
  } catch (error: any) {
    console.error('Search YouTube error:', error);
    
    // If it's already a detailed error from above, preserve it
    if (error.message.includes('YouTube Search Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, add context
    throw new Error(`YouTube Search Unexpected Error: ${error.message || 'Unknown error occurred while searching YouTube'}`);
  }
} 