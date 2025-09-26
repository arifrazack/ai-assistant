import { exec } from 'child_process';

export async function copySelectedTextToClipboard(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use Cmd+C to copy selected text to clipboard
    const script = `
      tell application "System Events"
        key code 8 using {command down}
        delay 0.1
        return the clipboard
      end tell
    `;
    
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        return reject("Failed to copy selected text to clipboard");
      }
      const clipboardContent = stdout.trim();
      if (!clipboardContent) {
        resolve("No text was selected to copy");
      } else {
        resolve(clipboardContent);
      }
    });
  });
} 