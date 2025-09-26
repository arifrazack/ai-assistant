import { exec } from 'child_process';

export async function searchGoogle(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!query) {
      return reject("Search query is required for search_google tool");
    }
    
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
    
    // Try Safari first, then Arc, then Chrome
    const safariScript = `
      tell application "Safari"
        tell front window
          make new tab with properties {URL:"${searchUrl}"}
        end tell
        return "Google search opened in new Safari tab"
      end tell
    `;
    
    const arcScript = `
      tell application "Arc"
        tell front window
          make new tab with properties {URL:"${searchUrl}"}
        end tell
        return "Google search opened in new Arc tab"
      end tell
    `;
    
    const chromeScript = `
      tell application "Google Chrome"
        tell front window
          make new tab with properties {URL:"${searchUrl}"}
        end tell
        return "Google search opened in new Chrome tab"
      end tell
    `;
    
    // Try each browser in order
    exec(`osascript -e '${safariScript}'`, (safariErr, safariStdout) => {
      if (!safariErr) {
        resolve(safariStdout.trim());
        return;
      }
      
      exec(`osascript -e '${arcScript}'`, (arcErr, arcStdout) => {
        if (!arcErr) {
          resolve(arcStdout.trim());
          return;
        }
        
        exec(`osascript -e '${chromeScript}'`, (chromeErr, chromeStdout) => {
          if (!chromeErr) {
            resolve(chromeStdout.trim());
            return;
          }
          
          reject("Failed to perform Google search in any supported browser (Safari/Arc/Chrome)");
        });
      });
    });
  });
} 