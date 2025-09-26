import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function openBrowserTab(url: string, browser?: string): Promise<string> {
  try {
    console.log(`🌐 Opening URL: ${url} in browser: ${browser || 'default (Arc)'}`);
    
    // Validate URL
    if (!url || url.trim() === '') {
      throw new Error('Browser Tab Error: Missing website URL to open');
    }
    
    // Add https:// if no protocol is specified
    let formattedUrl = url.trim();
    if (!formattedUrl.match(/^https?:\/\//i)) {
      // Check if it looks like a domain (contains a dot)
      if (formattedUrl.includes('.') || formattedUrl.includes('localhost')) {
        formattedUrl = `https://${formattedUrl}`;
      } else {
        // Might be a search term instead of a URL
        throw new Error(`Browser Tab Error: Invalid URL format: "${url}". Please provide a valid website URL (e.g., "google.com" or "https://example.com")`);
      }
    }
    
    console.log(`📝 Formatted URL: ${formattedUrl}`);
    
    let command: string;
    
    // Browser selection with enhanced error handling
    switch (browser?.toLowerCase()) {
      case 'chrome':
      case 'google chrome':
        command = `open -a "Google Chrome" "${formattedUrl}"`;
        break;
      case 'safari':
        command = `open -a "Safari" "${formattedUrl}"`;
        break;
      case 'arc':
        command = `open -a "Arc" "${formattedUrl}"`;
        break;
      case 'default':
      case undefined:
      case null:
        command = `open -a "Arc" "${formattedUrl}"`;  // Default to Arc
        break;
      default:
        throw new Error(`Browser Tab Error: Unsupported browser: "${browser}". Supported browsers: Arc (default), Safari, Chrome`);
    }
    
    console.log(`🚀 Executing command: ${command}`);
    
    try {
      await execAsync(command);
      return `✅ Successfully opened ${formattedUrl} in ${browser || 'Arc browser'}`;
    } catch (execError: any) {
      console.error('Browser execution error:', execError);
      
      // Parse specific execution errors
      const errorMessage = execError.message || execError.toString();
      
      if (errorMessage.includes('Application not found') || errorMessage.includes('Unable to find application')) {
        const requestedBrowser = browser || 'Arc';
        throw new Error(`Browser Tab Error: ${requestedBrowser} browser is not installed or not found on your system. Please install ${requestedBrowser} or try a different browser.`);
      } else if (errorMessage.includes('Permission denied')) {
        throw new Error(`Browser Tab Error: Permission denied when trying to open browser. Please check system permissions.`);
      } else if (errorMessage.includes('Invalid URL') || errorMessage.includes('malformed')) {
        throw new Error(`Browser Tab Error: Invalid or malformed URL: "${formattedUrl}". Please check the URL format.`);
      } else {
        throw new Error(`Browser Tab Execution Error: ${errorMessage}`);
      }
    }
    
  } catch (error: any) {
    console.error('Open browser tab error:', error);
    
    // If it's already a detailed error from above, preserve it
    if (error.message.includes('Browser Tab Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, add context
    throw new Error(`Browser Tab Unexpected Error: ${error.message || 'Unknown error occurred while opening browser tab'}`);
  }
}

// Helper function to open URL in default browser
export async function openUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      // Add https:// if no protocol specified
      url = `https://${url}`;
    }
    
    console.log(`🌐 Opening ${url} in default browser`);
    
    exec(`open "${url}"`, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`URL open error:`, err.message);
        return reject(`Failed to open URL: ${err.message}`);
      }
      
      console.log(`✅ Successfully opened ${url} in default browser`);
      resolve(`✅ Opened ${url} in default browser`);
    });
  });
} 