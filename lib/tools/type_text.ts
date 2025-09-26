import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function typeText(text: string): Promise<string> {
  try {
    console.log(`⌨️  Typing text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    // Validate text input
    if (!text || text.trim() === '') {
      throw new Error('Type Text Error: Missing text to type. Please provide the text content you want to enter.');
    }
    
    const textToType = text.trim();
    
    // Use osascript to type text via AppleScript for better reliability
    const applescript = `
      tell application "System Events"
        keystroke "${textToType.replace(/"/g, '\\"')}"
      end tell
    `;
    
    try {
      await execAsync(`osascript -e '${applescript}'`);
      return `✅ Successfully typed text: "${textToType.substring(0, 100)}${textToType.length > 100 ? '...' : ''}"`;
    } catch (execError: any) {
      console.error('Type text execution error:', execError);
      
      // Parse specific execution errors
      const errorMessage = execError.message || execError.toString();
      
      if (errorMessage.includes('not authorized') || errorMessage.includes('accessibility')) {
        throw new Error(`Type Text Error: Accessibility permissions required. Please grant accessibility permissions to this application in System Preferences > Security & Privacy > Privacy > Accessibility.`);
      } else if (errorMessage.includes('No user interaction allowed')) {
        throw new Error(`Type Text Error: No user interaction allowed. Please ensure you have an active application window to type into.`);
      } else if (errorMessage.includes('permission denied')) {
        throw new Error(`Type Text Error: Permission denied. Please check system accessibility permissions.`);
      } else if (errorMessage.includes('timeout')) {
        throw new Error(`Type Text Error: Operation timed out. Please try again or ensure the target application is responsive.`);
      } else {
        throw new Error(`Type Text Execution Error: ${errorMessage}`);
      }
    }
    
  } catch (error: any) {
    console.error('Type text error:', error);
    
    // If it's already a detailed error from above, preserve it
    if (error.message.includes('Type Text Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, add context
    throw new Error(`Type Text Unexpected Error: ${error.message || 'Unknown error occurred while typing text'}`);
  }
} 