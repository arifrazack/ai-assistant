import { exec } from 'child_process';

// Advanced Spotify Control Tool
export async function spotifyControl(action: string = 'toggle'): Promise<string> {
  try {
    // Ensure Spotify is running
    const isRunning = await ensureSpotifyRunning();
    if (!isRunning) {
      return "Spotify is not available or installed";
    }

    switch (action.toLowerCase()) {
      case 'toggle':
      case 'playpause':
        return await toggleSpotifyPlayback();
      case 'play':
        return await spotifyPlay();
      case 'pause':
        return await spotifyPause();
      case 'status':
        return await getSpotifyStatus();
      case 'next':
        return await spotifyNext();
      case 'previous':
      case 'prev':
        return await spotifyPrevious();
      default:
        return `Unknown Spotify action: ${action}. Available: toggle, play, pause, status, next, previous`;
    }
  } catch (error: any) {
    return `Spotify control error: ${error.message || error}`;
  }
}

// Ensure Spotify is running
async function ensureSpotifyRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if Spotify is already running
    exec(`osascript -e 'tell application "System Events" to exists (processes where name is "Spotify")'`, (err, out) => {
      if (!err && out.trim() === 'true') {
        resolve(true);
        return;
      }
      
      // Try to launch Spotify
      exec(`osascript -e 'tell application "Spotify" to activate'`, (launchErr) => {
        if (!launchErr) {
          // Give it a moment to start up
          setTimeout(() => resolve(true), 1000);
        } else {
          resolve(false);
        }
      });
    });
  });
}

// Toggle Spotify playback
async function toggleSpotifyPlayback(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Get current state
    exec(`osascript -e 'tell application "Spotify" to player state'`, (stateErr, stateOut) => {
      const currentState = stateOut?.trim();
      
      // Toggle play/pause
      exec(`osascript -e 'tell application "Spotify" to playpause'`, async (err) => {
        if (err) {
          reject(`Failed to toggle Spotify: ${err.message}`);
          return;
        }
        
        const wasPlaying = currentState === 'playing';
        const newState = wasPlaying ? 'paused' : 'playing';
        
        if (!wasPlaying) {
          // Get track info when starting to play
          try {
            const trackInfo = await getSpotifyTrackInfo();
            resolve(`Spotify is now ${newState} - ${trackInfo}`);
          } catch {
            resolve(`Spotify is now ${newState}`);
          }
        } else {
          resolve(`Spotify is now ${newState}`);
        }
      });
    });
  });
}

// Play Spotify
async function spotifyPlay(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    exec(`osascript -e 'tell application "Spotify" to play'`, async (err) => {
      if (err) {
        reject(`Failed to play Spotify: ${err.message}`);
        return;
      }
      
      try {
        const trackInfo = await getSpotifyTrackInfo();
        resolve(`Spotify is now playing - ${trackInfo}`);
      } catch {
        resolve("Spotify is now playing");
      }
    });
  });
}

// Pause Spotify
async function spotifyPause(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e 'tell application "Spotify" to pause'`, (err) => {
      if (err) {
        reject(`Failed to pause Spotify: ${err.message}`);
        return;
      }
      resolve("Spotify is now paused");
    });
  });
}

// Get Spotify status
async function getSpotifyStatus(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    exec(`osascript -e 'tell application "Spotify" to player state'`, async (err, out) => {
      if (err) {
        reject(`Failed to get Spotify status: ${err.message}`);
        return;
      }
      
      const state = out.trim();
      
      if (state === 'playing') {
        try {
          const trackInfo = await getSpotifyTrackInfo();
          const position = await getSpotifyPosition();
          resolve(`Spotify is playing: ${trackInfo}${position ? ` (${position})` : ''}`);
        } catch {
          resolve("Spotify is playing");
        }
      } else if (state === 'paused') {
        try {
          const trackInfo = await getSpotifyTrackInfo();
          resolve(`Spotify is paused: ${trackInfo}`);
        } catch {
          resolve("Spotify is paused");
        }
      } else {
        resolve(`Spotify state: ${state}`);
      }
    });
  });
}

// Next track
async function spotifyNext(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    exec(`osascript -e 'tell application "Spotify" to next track'`, async (err) => {
      if (err) {
        reject(`Failed to skip to next track: ${err.message}`);
        return;
      }
      
      // Wait a bit for the track to change
      setTimeout(async () => {
        try {
          const trackInfo = await getSpotifyTrackInfo();
          resolve(`Skipped to next track - ${trackInfo}`);
        } catch {
          resolve("Skipped to next track");
        }
      }, 500);
    });
  });
}

// Previous track
async function spotifyPrevious(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    exec(`osascript -e 'tell application "Spotify" to previous track'`, async (err) => {
      if (err) {
        reject(`Failed to skip to previous track: ${err.message}`);
        return;
      }
      
      // Wait a bit for the track to change
      setTimeout(async () => {
        try {
          const trackInfo = await getSpotifyTrackInfo();
          resolve(`Skipped to previous track - ${trackInfo}`);
        } catch {
          resolve("Skipped to previous track");
        }
      }, 500);
    });
  });
}

// Get current track information
function getSpotifyTrackInfo(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '
      tell application "Spotify"
        set trackName to name of current track
        set trackArtist to artist of current track
        set trackAlbum to album of current track
        return trackName & " by " & trackArtist & " (" & trackAlbum & ")"
      end tell
    '`, (err, out) => {
      if (err) reject(err);
      else resolve(out.trim());
    });
  });
}

// Get playback position
function getSpotifyPosition(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '
      tell application "Spotify"
        set currentPos to player position
        set trackDuration to duration of current track
        set posMinutes to (currentPos div 60) as integer
        set posSeconds to (currentPos mod 60) as integer
        set durMinutes to (trackDuration div 60) as integer
        set durSeconds to (trackDuration mod 60) as integer
        return posMinutes & ":" & (posSeconds as string) & " / " & durMinutes & ":" & (durSeconds as string)
      end tell
    '`, (err, out) => {
      if (err) reject(err);
      else resolve(out.trim());
    });
  });
} 