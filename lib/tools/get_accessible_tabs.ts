import { exec } from 'child_process';
import path from 'path';

const axcliPath = path.resolve(__dirname, '../../mac/axcli/.build/release/axcli');

interface AccessibleTab {
  title: string;
  url: string;
  contents: string;
}

export async function getAccessibleTabs(): Promise<AccessibleTab[]> {
  return new Promise((resolve, reject) => {
    // Check if axcli is available
    exec(`which axcli || test -f ${axcliPath}`, (checkErr) => {
      if (checkErr) {
        console.log('⚠️ axcli not found, falling back to basic tab info...');
        return getAccessibleTabsFallback().then(resolve).catch(reject);
      }
      
      // Try system axcli first, then local build
      const command = `axcli get-open-tabs --json || ${axcliPath} get-open-tabs --json`;
      
      console.log('📑 Getting accessible tabs with content...');
      
      exec(command, { timeout: 15000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Accessible tabs error:', err.message);
          console.log('🔄 Falling back to basic tab method...');
          return getAccessibleTabsFallback().then(resolve).catch(reject);
        }
        
        try {
          const tabs = JSON.parse(stdout);
          if (!Array.isArray(tabs)) {
            throw new Error('Invalid tab data format');
          }
          
          console.log(`✅ Retrieved ${tabs.length} accessible tabs with content`);
          resolve(tabs);
        } catch (parseError) {
          console.error('Failed to parse accessible tabs data:', parseError);
          console.log('🔄 Falling back to basic tab method...');
          return getAccessibleTabsFallback().then(resolve).catch(reject);
        }
      });
    });
  });
}

// Fallback function using AppleScript to get basic tab info (no content)
async function getAccessibleTabsFallback(): Promise<AccessibleTab[]> {
  return new Promise((resolve, reject) => {
    const script = `
      tell application "Google Chrome"
        set tabList to {}
        try
          repeat with w in windows
            repeat with t in tabs of w
              try
                set tabTitle to title of t
                set tabURL to URL of t
                set end of tabList to tabTitle & "|||" & tabURL
              on error
                set end of tabList to "Unknown Tab|||about:blank"
              end try
            end repeat
          end repeat
        on error
          -- Try Safari if Chrome fails
          tell application "Safari"
            repeat with w in windows
              repeat with t in tabs of w
                try
                  set tabTitle to name of t
                  set tabURL to URL of t
                  set end of tabList to tabTitle & "|||" & tabURL
                on error
                  set end of tabList to "Unknown Tab|||about:blank"
                end try
              end repeat
            end repeat
          end tell
        end try
        
        return tabList
      end tell
    `;
    
    console.log('📑 Getting basic tab information (fallback)...');
    
    exec(`osascript -e '${script}'`, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('Fallback accessible tabs error:', err.message);
        return reject(`Failed to get tab information: ${err.message}`);
      }
      
      try {
        const tabsOutput = stdout.trim();
        const tabs: AccessibleTab[] = [];
        
        if (tabsOutput) {
          const tabLines = tabsOutput.split(', ').filter(line => line.includes('|||'));
          
          for (const line of tabLines) {
            const [title, url] = line.split('|||');
            tabs.push({
              title: title.trim(),
              url: url.trim(),
              contents: "Content extraction not available (axcli required)"
            });
          }
        }
        
        console.log(`✅ Retrieved ${tabs.length} basic tabs (no content)`);
        resolve(tabs);
      } catch (parseError) {
        console.error('Error parsing basic tab data:', parseError);
        resolve([{
          title: "Error retrieving tabs",
          url: "about:blank",
          contents: "Could not access browser tabs"
        }]);
      }
    });
  });
}

// Helper function to search tabs by content
export async function searchTabsByContent(query: string): Promise<AccessibleTab[]> {
  try {
    const allTabs = await getAccessibleTabs();
    const matchingTabs = allTabs.filter(tab => 
      tab.title.toLowerCase().includes(query.toLowerCase()) ||
      tab.url.toLowerCase().includes(query.toLowerCase()) ||
      tab.contents.toLowerCase().includes(query.toLowerCase())
    );
    
    console.log(`🔍 Found ${matchingTabs.length} tabs matching "${query}"`);
    return matchingTabs;
  } catch (error) {
    console.error('Error searching tabs by content:', error);
    throw error;
  }
} 