import { exec } from 'child_process';

export async function setVolume(volume: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e 'set volume output volume ${volume}'`, (err) => {
      if (err) return reject("Failed to set volume");
      resolve("Volume set to " + volume);
    });
  });
}

// Enhanced volume control with relative changes
export async function controlVolume(params: { volume?: number, action?: string, level?: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    // If absolute volume is specified
    if (params.volume !== undefined) {
      const volume = Math.max(0, Math.min(100, params.volume));
      exec(`osascript -e 'set volume output volume ${volume}'`, (err) => {
        if (err) return reject("Failed to set volume");
        resolve(`Volume set to ${volume}`);
      });
      return;
    }
    
    // If relative change is specified
    if (params.action && params.level !== undefined) {
      // First get current volume
      exec(`osascript -e 'output volume of (get volume settings)'`, (err, stdout) => {
        if (err) return reject("Failed to get current volume");
        
        const currentVolume = parseInt(stdout.trim());
        let newVolume = currentVolume;
        
        if (params.action === 'up') {
          newVolume = Math.min(100, currentVolume + params.level);
        } else if (params.action === 'down') {
          newVolume = Math.max(0, currentVolume - params.level);
        }
        
        exec(`osascript -e 'set volume output volume ${newVolume}'`, (err) => {
          if (err) return reject("Failed to adjust volume");
          resolve(`Volume adjusted from ${currentVolume} to ${newVolume}`);
        });
      });
      return;
    }
    
    reject("Invalid volume control parameters");
  });
} 