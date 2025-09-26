import { exec } from 'child_process';

export async function getClipboard(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e 'the clipboard'`, (err, stdout) => {
      if (err) return reject("Failed to get clipboard content");
      resolve(stdout.trim());
    });
  });
} 