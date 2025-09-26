// Note: This requires installing Playwright: npm install playwright
// Then install browsers: npx playwright install

export async function browseWebPlaywright(goal: string): Promise<string> {
  try {
    // Dynamic import to handle cases where Playwright isn't installed
    const { chromium } = await import('playwright');
    
    console.log(`🤖 Starting automated browsing for: ${goal}`);
    
    const browser = await chromium.launch({ 
      headless: false, // Set to true for headless browsing
      timeout: 30000 
    });
    
    const page = await browser.newPage();
    
    try {
      // Navigate to Google
      console.log('🌐 Opening Google...');
      await page.goto('https://www.google.com', { waitUntil: 'networkidle' });
      
      // Accept cookies if prompt appears
      try {
        await page.click('button:has-text("Accept all")', { timeout: 3000 });
      } catch {
        // Cookie prompt might not appear, continue
      }
      
      // Search for the goal
      console.log(`🔍 Searching for: ${goal}`);
      await page.fill('input[name="q"], textarea[name="q"]', goal);
      await page.keyboard.press('Enter');
      
      // Wait for results
      await page.waitForTimeout(3000);
      await page.waitForSelector('h3', { timeout: 10000 });
      
      // Extract search results
      const searchResults = await page.$$eval('h3', (elements) => 
        elements.slice(0, 5).map(el => el.textContent || '').filter(text => text.length > 0)
      );
      
      // Get page title and URL
      const pageTitle = await page.title();
      const currentUrl = page.url();
      
      console.log('✅ Retrieved search results');
      
      await browser.close();
      
      const resultSummary = {
        goal,
        pageTitle,
        url: currentUrl,
        topResults: searchResults,
        timestamp: new Date().toISOString()
      };
      
      return `🤖 Automated web browsing completed for "${goal}":
      
📄 Page: ${pageTitle}
🔗 URL: ${currentUrl}
🔍 Top Results:
${searchResults.map((result, i) => `${i + 1}. ${result}`).join('\n')}

📊 Found ${searchResults.length} relevant results`;
      
    } catch (browsingError) {
      await browser.close();
      throw browsingError;
    }
    
  } catch (error) {
    console.error('Playwright browsing error:', error);
    
    // Provide helpful error messages for common issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Cannot find module')) {
      return `❌ Playwright not installed. To use automated browsing:
1. Run: npm install playwright
2. Run: npx playwright install
3. Try the command again

For now, you can use the regular search tools instead.`;
    }
    
    throw new Error(`Failed to browse web: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Advanced browsing function for specific websites
export async function browseWebsitePlaywright(url: string, action: string = 'extract'): Promise<string> {
  try {
    const { chromium } = await import('playwright');
    
    console.log(`🤖 Browsing ${url} with action: ${action}`);
    
    const browser = await chromium.launch({ 
      headless: false,
      timeout: 30000 
    });
    
    const page = await browser.newPage();
    
    try {
      // Navigate to the specified URL
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      let result = '';
      
      switch (action.toLowerCase()) {
        case 'extract':
        case 'content':
          // Extract main content
          const title = await page.title();
          const mainContent = await page.$eval('main, article, .content, body', 
            el => el.textContent?.slice(0, 1000) || 'No content found'
          ).catch(() => 'Could not extract main content');
          
          result = `📄 Title: ${title}\n📝 Content: ${mainContent}`;
          break;
          
        case 'screenshot':
          // Take a screenshot (saved to temp directory)
          const screenshotPath = `/tmp/screenshot-${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          result = `📸 Screenshot saved to: ${screenshotPath}`;
          break;
          
        default:
          // Default: extract basic info
          const basicTitle = await page.title();
          const basicUrl = page.url();
          result = `📄 Title: ${basicTitle}\n🔗 URL: ${basicUrl}`;
      }
      
      await browser.close();
      return result;
      
    } catch (browsingError) {
      await browser.close();
      throw browsingError;
    }
    
  } catch (error) {
    console.error('Website browsing error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Cannot find module')) {
      return `❌ Playwright not installed. Install with: npm install playwright && npx playwright install`;
    }
    
    throw new Error(`Failed to browse website: ${errorMessage}`);
  }
} 