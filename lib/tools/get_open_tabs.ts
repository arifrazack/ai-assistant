import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export async function getOpenTabs(browser: 'Safari' | 'Google Chrome' | 'Arc' | 'default' = 'default'): Promise<string[]> {
  
  // Auto-detect browser if 'default' is specified (defaults to Arc)
  if (browser === 'default') {
    browser = await detectActiveBrowser();
  }
  
  const tempScriptPath = join(tmpdir(), `get_tabs_${Date.now()}.scpt`);
  
  let script = '';
  
  if (browser === 'Safari') {
    script = `tell application "Safari"
      set tabInfo to {}
      try
          repeat with w in windows
              repeat with t in tabs of w
                  try
                      set tabName to name of t
                      set tabURL to URL of t
                      set end of tabInfo to tabName & " | " & tabURL
                  on error
                      set end of tabInfo to "Unknown Tab | about:blank"
                  end try
              end repeat
          end repeat
      on error
          return {"No Safari windows open"}
      end try
      return tabInfo
    end tell`;
  } else if (browser === 'Google Chrome') {
    script = `tell application "Google Chrome"
      set tabInfo to {}
      try
          repeat with w in windows
              repeat with t in tabs of w
                  try
                      set tabTitle to title of t
                      set tabURL to URL of t
                      set end of tabInfo to tabTitle & " | " & tabURL
                  on error
                      set end of tabInfo to "Unknown Tab | about:blank"
                  end try
              end repeat
          end repeat
      on error
          return {"No Chrome windows open"}
      end try
      return tabInfo
    end tell`;
  } else if (browser === 'Arc') {
    script = `tell application "Arc"
      set tabInfo to {}
      try
          repeat with w in windows
              repeat with t in tabs of w
                  try
                      set tabTitle to title of t
                      set tabURL to URL of t
                      set end of tabInfo to tabTitle & " | " & tabURL
                  on error
                      set end of tabInfo to "Unknown Tab | about:blank"
                  end try
              end repeat
          end repeat
      on error
          return {"No Arc windows open"}
      end try
      return tabInfo
    end tell`;
  } else {
    throw new Error(`Unsupported browser: ${browser}. Supported browsers: Safari, Google Chrome, Arc`);
  }

  try {
    await fs.writeFile(tempScriptPath, script, 'utf8');
    
    return new Promise((resolve, reject) => {
      exec(`osascript "${tempScriptPath}"`, { timeout: 10000 }, async (err, stdout, stderr) => {
        // Clean up temp file
        try {
          await fs.unlink(tempScriptPath);
        } catch (unlinkErr) {
          console.log('Warning: Failed to delete temp get tabs script file');
        }
        
        if (err) {
          console.error('Get tabs error:', err.message);
          return reject(`Failed to get open tabs from ${browser}: ${err.message}`);
        }
        
        try {
          // Parse the AppleScript list output
          const tabsOutput = stdout.trim();
          if (tabsOutput.includes('No') && tabsOutput.includes('windows open')) {
            resolve([`No ${browser} windows currently open`]);
          } else {
            // Split the output and clean it up
            const tabs = tabsOutput.split(', ').map(tab => tab.trim()).filter(tab => tab.length > 0);
            resolve(tabs);
          }
        } catch (parseError) {
          console.error('Error parsing tabs:', parseError);
          resolve([`Could not parse ${browser} tabs`]);
        }
      });
    });
    
  } catch (fileErr) {
    console.error('Failed to create temp get tabs script:', fileErr);
    throw new Error(`Failed to prepare get tabs script: ${fileErr instanceof Error ? fileErr.message : String(fileErr)}`);
  }
}

// Auto-detect which browser is currently active/running
async function detectActiveBrowser(): Promise<'Safari' | 'Google Chrome' | 'Arc'> {
  return new Promise((resolve) => {
    // Check running processes in order of preference: Arc > Chrome > Safari
    const browserChecks = [
      { name: 'Arc', applescript: 'Arc' },
      { name: 'Google Chrome', applescript: 'Google Chrome' },
      { name: 'Safari', applescript: 'Safari' }
    ];
    
    async function checkBrowser(index: number): Promise<void> {
      if (index >= browserChecks.length) {
        // Default to Arc if none are found
        resolve('Arc');
        return;
      }
      
      const browser = browserChecks[index];
      
      exec(`osascript -e 'tell application "System Events" to exists (processes where name is "${browser.applescript}")'`, (err, stdout) => {
        if (!err && stdout.trim() === 'true') {
          // Browser is running, check if it has windows
          exec(`osascript -e 'tell application "${browser.applescript}" to count windows'`, (winErr, winStdout) => {
            if (!winErr && parseInt(winStdout.trim()) > 0) {
              resolve(browser.name as 'Safari' | 'Google Chrome' | 'Arc');
            } else {
              // Browser is running but no windows, try next
              checkBrowser(index + 1);
            }
          });
        } else {
          // Browser not running, try next
          checkBrowser(index + 1);
        }
      });
    }
    
    checkBrowser(0);
  });
} 