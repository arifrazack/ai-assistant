import { exec } from 'child_process';
import path from 'path';

const axcliPath = path.resolve(__dirname, '../../mac/axcli/.build/release/axcli');

export async function getFrontWindowContents(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if axcli is available
    exec(`which axcli || test -f ${axcliPath}`, (checkErr) => {
      if (checkErr) {
        return reject("axcli not found. Please install axcli for advanced window content access.");
      }
      
      // Try system axcli first, then local build
      const command = `axcli get-frontmost-window-text || ${axcliPath} get-frontmost-window-text`;
      
      console.log('📖 Getting frontmost window contents...');
      
      exec(command, { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Front window contents error:', err.message);
          return reject(`Failed to get frontmost window contents: ${err.message}`);
        }
        
        const contents = stdout.trim();
        if (!contents) {
          resolve("No readable content found in frontmost window");
        } else {
          console.log(`✅ Retrieved ${contents.length} characters from frontmost window`);
          resolve(contents);
        }
      });
    });
  });
}

// Fallback function using AppleScript if axcli is not available
export async function getFrontWindowContentsAppleScript(): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = `
      tell application "System Events"
        try
          set frontApp to name of first application process whose frontmost is true
          tell application process frontApp
            set windowContents to value of text areas of windows
            if windowContents is not {} then
              return item 1 of windowContents as string
            else
              return "No text content available"
            end if
          end tell
        on error errMsg
          return "Could not access window contents: " & errMsg
        end try
      end tell
    `;
    
    console.log('📖 Getting frontmost window contents (AppleScript fallback)...');
    
    exec(`osascript -e '${script}'`, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('AppleScript front window error:', err.message);
        return reject(`Failed to get window contents: ${err.message}`);
      }
      
      const contents = stdout.trim();
      console.log(`✅ Retrieved window contents via AppleScript: ${contents.length} characters`);
      resolve(contents);
    });
  });
} 