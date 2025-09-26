import { exec } from 'child_process';

export async function clickPosition(x: number, y: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`cliclick c:${x},${y}`, (err) => {
      if (err) return reject("Failed to click position");
      resolve(`Clicked at (${x}, ${y})`);
    });
  });
} 