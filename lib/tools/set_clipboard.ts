import { exec } from 'child_process';

export async function setClipboard(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`echo "${text}" | pbcopy`, (err) => {
      if (err) return reject("Failed to set clipboard content");
      resolve("Clipboard content set");
    });
  });
} 