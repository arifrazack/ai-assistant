import { initializeContacts } from './tools/find_contact';

// Flag to ensure initialization only runs once per app session
let isInitialized = false;

export async function initializeApp(): Promise<void> {
  if (isInitialized) {
    console.log('App already initialized, skipping...');
    return;
  }

  console.log('🚀 Initializing app for first time...');

  try {
    // Initialize contacts (download and save if not already cached)
    console.log('📱 Setting up contacts database...');
    const contacts = await initializeContacts();
    console.log(`✅ Successfully initialized ${contacts.length} contacts`);

    // Set initialization flag
    isInitialized = true;
    
    console.log('🎉 App initialization complete!');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    // Don't throw error to prevent app from crashing
    // App can still work without contacts pre-loaded
  }
}

// Function to check if contacts need refreshing (e.g., run daily)
export async function checkForContactsUpdate(): Promise<void> {
  try {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    
    const contactsFilePath = path.join(process.cwd(), 'data', 'contacts.json');
    
    try {
      const stats = await fs.stat(contactsFilePath);
      const lastModified = stats.mtime;
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
      
      // Refresh contacts if more than 7 days old
      if (daysSinceUpdate > 7) {
        console.log('📅 Contacts are more than 7 days old, refreshing...');
        const { refreshContacts } = await import('./tools/find_contact');
        await refreshContacts();
        console.log('✅ Contacts refreshed successfully');
      } else {
        console.log(`📱 Contacts are up to date (${Math.floor(daysSinceUpdate)} days old)`);
      }
    } catch (fileError) {
      // File doesn't exist, initialize contacts
      console.log('📱 No contacts file found, initializing...');
      await initializeContacts();
    }
  } catch (error) {
    console.error('Error checking for contacts update:', error);
  }
}

export { isInitialized }; 