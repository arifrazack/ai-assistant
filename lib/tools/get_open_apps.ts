import { exec } from 'child_process';

export async function getOpenApps(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e 'tell application "System Events" to get name of (processes where background only is false)'`, (err, stdout) => {
      if (err) return reject("Failed to list apps");
      resolve(stdout.split(',').map(app => app.trim()));
    });
  });
} 