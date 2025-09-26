import { exec } from 'child_process';

export async function openUrlInNewTab(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!url) {
      return reject("URL is required for open_url_in_new_tab tool");
    }
    
    // Try Safari first, then Arc, then Chrome
    const safariScript = `
      tell application "Safari"
        tell front window
          make new tab with properties {URL:"${url}"}
        end tell
        return "URL opened in new Safari tab"
      end tell
    `;
    
    const arcScript = `
      tell application "Arc"
        tell front window
          make new tab with properties {URL:"${url}"}
        end tell
        return "URL opened in new Arc tab"
      end tell
    `;
    
    const chromeScript = `
      tell application "Google Chrome"
        tell front window
          make new tab with properties {URL:"${url}"}
        end tell
        return "URL opened in new Chrome tab"
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
          
          reject("Failed to open URL in any supported browser (Safari/Arc/Chrome)");
        });
      });
    });
  });
} 