import { exec } from 'child_process';

export async function getActiveTabTitle(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Try Safari first, then Arc, then Chrome
    const safariScript = `
      tell application "Safari"
        if frontmost then
          return name of current tab of front window
        else
          return "Safari is not the frontmost application"
        end if
      end tell
    `;
    
    const arcScript = `
      tell application "Arc"
        if frontmost then
          return title of active tab of front window
        else
          return "Arc is not the frontmost application"
        end if
      end tell
    `;
    
    const chromeScript = `
      tell application "Google Chrome"
        if frontmost then
          return title of active tab of front window
        else
          return "Chrome is not the frontmost application"
        end if
      end tell
    `;
    
    // Try each browser in order
    exec(`osascript -e '${safariScript}'`, (safariErr, safariStdout) => {
      if (!safariErr && safariStdout.trim() && !safariStdout.includes("not the frontmost")) {
        resolve(`Active tab title: ${safariStdout.trim()}`);
        return;
      }
      
      exec(`osascript -e '${arcScript}'`, (arcErr, arcStdout) => {
        if (!arcErr && arcStdout.trim() && !arcStdout.includes("not the frontmost")) {
          resolve(`Active tab title: ${arcStdout.trim()}`);
          return;
        }
        
        exec(`osascript -e '${chromeScript}'`, (chromeErr, chromeStdout) => {
          if (!chromeErr && chromeStdout.trim() && !chromeStdout.includes("not the frontmost")) {
            resolve(`Active tab title: ${chromeStdout.trim()}`);
            return;
          }
          
          reject("No supported browser (Safari/Arc/Chrome) is currently active");
        });
      });
    });
  });
} 