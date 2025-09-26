import { exec } from 'child_process';

export async function playPauseMusic(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // First, try to detect which music app is currently playing
      const activeApp = await getActiveMusicApp();
      
      if (activeApp) {
        const result = await controlMusicApp(activeApp);
        resolve(result);
      } else {
        // No app is playing, try to start with preference for Spotify, then Apple Music
        const availableApp = await findAvailableMusicApp();
        if (availableApp) {
          const result = await controlMusicApp(availableApp);
          resolve(result);
        } else {
          reject("No music apps (Spotify or Apple Music) found");
        }
      }
    } catch (error: any) {
      reject(`Failed to control music: ${error.message || error}`);
    }
  });
}

// Detect which music app is currently playing
function getActiveMusicApp(): Promise<string | null> {
  return new Promise((resolve) => {
    // Check Spotify first
    exec(`osascript -e 'tell application "Spotify" to player state'`, (spotifyErr, spotifyOut) => {
      if (!spotifyErr && spotifyOut.trim() === 'playing') {
        resolve('Spotify');
        return;
      }
      
      // Check Apple Music
      exec(`osascript -e 'tell application "Music" to player state'`, (musicErr, musicOut) => {
        if (!musicErr && musicOut.trim() === 'playing') {
          resolve('Music');
          return;
        }
        
        // Check if either app is paused but was recently active
        if (!spotifyErr && spotifyOut.trim() === 'paused') {
          resolve('Spotify');
          return;
        }
        
        if (!musicErr && musicOut.trim() === 'paused') {
          resolve('Music');
          return;
        }
        
        resolve(null);
      });
    });
  });
}

// Find an available music app (preference: Spotify > Apple Music)
function findAvailableMusicApp(): Promise<string | null> {
  return new Promise((resolve) => {
    // Check if Spotify is running
    exec(`osascript -e 'tell application "System Events" to exists (processes where name is "Spotify")'`, (err, out) => {
      if (!err && out.trim() === 'true') {
        resolve('Spotify');
        return;
      }
      
      // Check if Apple Music is available
      exec(`osascript -e 'tell application "System Events" to exists (processes where name is "Music")'`, (err2, out2) => {
        if (!err2 && out2.trim() === 'true') {
          resolve('Music');
          return;
        }
        
        // Try to launch Spotify first (if installed)
        exec(`osascript -e 'tell application "Spotify" to activate'`, (spotifyErr) => {
          if (!spotifyErr) {
            resolve('Spotify');
            return;
          }
          
          // Fall back to Apple Music
          exec(`osascript -e 'tell application "Music" to activate'`, (musicErr) => {
            if (!musicErr) {
              resolve('Music');
              return;
            }
            
            resolve(null);
          });
        });
      });
    });
  });
}

// Control specific music app
function controlMusicApp(app: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Get current state first
    exec(`osascript -e 'tell application "${app}" to player state'`, (stateErr, stateOut) => {
      const currentState = stateOut?.trim();
      
      // Toggle play/pause
      exec(`osascript -e 'tell application "${app}" to playpause'`, (err) => {
        if (err) {
          reject(`Failed to control ${app}: ${err.message}`);
          return;
        }
        
        // Determine new state
        const wasPlaying = currentState === 'playing';
        const newState = wasPlaying ? 'paused' : 'playing';
        
        // Get track info if now playing
        if (!wasPlaying) {
          getTrackInfo(app).then(trackInfo => {
            resolve(`${app} is now ${newState}${trackInfo ? ` - ${trackInfo}` : ''}`);
          }).catch(() => {
            resolve(`${app} is now ${newState}`);
          });
        } else {
          resolve(`${app} is now ${newState}`);
        }
      });
    });
  });
}

// Get current track information
function getTrackInfo(app: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (app === 'Spotify') {
      exec(`osascript -e 'tell application "Spotify" to name of current track & " by " & artist of current track'`, (err, out) => {
        if (err) reject(err);
        else resolve(out.trim());
      });
    } else if (app === 'Music') {
      exec(`osascript -e 'tell application "Music" to name of current track & " by " & artist of current track'`, (err, out) => {
        if (err) reject(err);
        else resolve(out.trim());
      });
    } else {
      reject('Unknown app');
    }
  });
} 