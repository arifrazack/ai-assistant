import { exec } from 'child_process';

export async function getSelectedText(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Try to get selected text using AppleScript
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        tell process frontApp
          set selectedText to (get value of attribute "AXSelectedText" of window 1)
          if selectedText is not missing value then
            return selectedText
          else
            return ""
          end if
        end tell
      end tell
    `;
    
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        return reject("Failed to get selected text - no text selected or app doesn't support selection");
      }
      const text = stdout.trim();
      if (!text) {
        resolve("No text is currently selected");
      } else {
        resolve(text);
      }
    });
  });
} 