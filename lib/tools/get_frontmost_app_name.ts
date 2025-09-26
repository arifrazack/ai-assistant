import { exec } from 'child_process';

export async function getFrontmostAppName(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`, (err, stdout) => {
      if (err) {
        return reject("Failed to get frontmost app name");
      }
      resolve(stdout.trim());
    });
  });
} 