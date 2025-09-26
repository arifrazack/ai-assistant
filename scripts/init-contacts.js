#!/usr/bin/env node

// Standalone script to initialize or refresh contacts
// Can be run with: node scripts/init-contacts.js

const path = require('path');

// Add the project root to the require paths
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

async function main() {
  console.log('🚀 Contact Initialization Script');
  console.log('=====================================');
  
  try {
    // Import the initialization functions from CommonJS backend module
    const { initializeApp, downloadAndSaveAllContacts } = require('../backend/lib/init-contacts.js');
    
    // Check if user wants to force refresh
    const forceRefresh = process.argv.includes('--refresh') || process.argv.includes('-r');
    
    if (forceRefresh) {
      console.log('🔄 Force refreshing contacts from system...');
      const contacts = await downloadAndSaveAllContacts();
      console.log(`✅ Successfully refreshed ${contacts.length} contacts!`);
    } else {
      console.log('📱 Initializing contacts (using cache if available)...');
      const contacts = await initializeApp();
      console.log(`✅ Successfully initialized ${contacts.length} contacts!`);
    }
    
    console.log('');
    console.log('📋 Usage:');
    console.log('  node scripts/init-contacts.js          # Initialize (use cache if available)');
    console.log('  node scripts/init-contacts.js --refresh # Force refresh from system');
    console.log('');
    console.log('🎉 Contact initialization complete!');
    
  } catch (error) {
    console.error('❌ Failed to initialize contacts:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('  - Make sure you have granted contacts access to Terminal/iTerm');
    console.error('  - Try running the script with --refresh flag');
    console.error('  - Check that the Contacts app has your contacts');
    
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main }; 