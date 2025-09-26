import { exec } from 'child_process';

export async function pasteTextIntoFrontApp(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!text) {
      return reject("Text is required for paste_text_into_front_app tool");
    }
    
    // First set the clipboard, then paste
    const script = `
      tell application "System Events"
        set the clipboard to "${text.replace(/"/g, '\\"')}"
        delay 0.1
        key code 9 using {command down}
      end tell
    `;
    
    exec(`osascript -e '${script}'`, (err) => {
      if (err) {
        return reject("Failed to paste text into frontmost application");
      }
      resolve(`Pasted text into frontmost application: "${text}"`);
    });
  });
} 