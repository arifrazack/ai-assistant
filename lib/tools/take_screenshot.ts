import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

// Take a screenshot of the current screen and return base64 data
export async function takeScreenshot(): Promise<string> {
  console.log('📷 Taking screenshot of current screen...');
  
  try {
    const tempPath = `/tmp/screenshot-${Date.now()}.png`;
    
    // Use macOS screencapture command to take screenshot
    await execAsync(`screencapture -x "${tempPath}"`);
    console.log('📷 Screenshot captured to:', tempPath);
    
    // Read the screenshot file and convert to base64
    const screenshotBuffer = fs.readFileSync(tempPath);
    const base64Data = screenshotBuffer.toString('base64');
    
    // Clean up the temporary file
    fs.unlinkSync(tempPath);
    console.log('📷 Screenshot converted to base64 and temp file cleaned up');
    
    return base64Data;
  } catch (error: any) {
    console.error('❌ Screenshot capture failed:', error);
    throw new Error(`Screenshot capture failed: ${error.message}`);
  }
} 