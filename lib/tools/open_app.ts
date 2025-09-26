import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function openApp(appName: string): Promise<string> {
  try {
    console.log(`🚀 Opening app: ${appName}`);
    
    // Validate app name
    if (!appName || appName.trim() === '') {
      throw new Error('Open App Error: Missing app name. Please specify which application to open (e.g., "Notes", "Safari", "Calculator").');
    }
    
    const trimmedAppName = appName.trim();
    
    try {
      await execAsync(`open -a "${trimmedAppName}"`);
      return `✅ Successfully opened ${trimmedAppName}`;
    } catch (execError: any) {
      console.error('App execution error:', execError);
      
      // Parse specific execution errors
      const errorMessage = execError.message || execError.toString();
      
      if (errorMessage.includes('Application not found') || errorMessage.includes('Unable to find application')) {
        throw new Error(`Open App Error: Application "${trimmedAppName}" not found or not installed on your system. Please check the app name spelling or try a different app (e.g., "Notes", "Safari", "Calculator", "Mail").`);
      } else if (errorMessage.includes('Permission denied')) {
        throw new Error(`Open App Error: Permission denied when trying to open "${trimmedAppName}". Please check system permissions.`);
      } else if (errorMessage.includes('does not exist')) {
        throw new Error(`Open App Error: "${trimmedAppName}" does not exist on your system. Try common apps like "Notes", "Safari", "Calculator", or "Mail".`);
      } else {
        throw new Error(`Open App Execution Error: ${errorMessage}`);
      }
    }
    
  } catch (error: any) {
    console.error('Open app error:', error);
    
    // If it's already a detailed error from above, preserve it
    if (error.message.includes('Open App Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, add context
    throw new Error(`Open App Unexpected Error: ${error.message || 'Unknown error occurred while opening application'}`);
  }
} 