#!/usr/bin/env node

// Script to remove a specific phone number from a contact
const path = require('path');

// Add the project root to the require paths
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

async function removePhoneFromContact(contactName, phoneToRemove) {
  try {
    console.log(`🔍 Looking for contact: ${contactName}`);
    console.log(`📞 Removing phone: ${phoneToRemove}`);
    
    // Import the contact management functions
    const { loadContactsFromFile } = require('../backend/lib/init-contacts.js');
    const fs = require('fs').promises;
    
    // Load current contacts
    const contacts = await loadContactsFromFile();
    console.log(`📋 Loaded ${contacts.length} contacts`);
    
    // Find the contact (case insensitive search)
    const contactIndex = contacts.findIndex(contact => 
      contact.name.toLowerCase().includes(contactName.toLowerCase()) ||
      contactName.toLowerCase().includes(contact.name.toLowerCase())
    );
    
    if (contactIndex === -1) {
      console.log(`❌ Contact "${contactName}" not found`);
      return;
    }
    
    const contact = contacts[contactIndex];
    console.log(`✅ Found contact: ${contact.name}`);
    console.log(`📞 Current phones: ${contact.phones.join(', ')}`);
    
    // Remove the phone number
    const originalPhoneCount = contact.phones.length;
    contact.phones = contact.phones.filter(phone => phone !== phoneToRemove);
    
    if (contact.phones.length === originalPhoneCount) {
      console.log(`⚠️  Phone number ${phoneToRemove} was not found in contact`);
      return;
    }
    
    console.log(`✅ Removed phone ${phoneToRemove}`);
    console.log(`📞 Remaining phones: ${contact.phones.join(', ')}`);
    
    // Update the contact in the array
    contacts[contactIndex] = contact;
    
    // Save updated contacts back to file
    const CONTACTS_FILE_PATH = path.join(process.cwd(), 'data', 'contacts.json');
    const contactsData = {
      contacts: contacts,
      lastUpdated: new Date().toISOString(),
      totalCount: contacts.length
    };
    
    await fs.writeFile(CONTACTS_FILE_PATH, JSON.stringify(contactsData, null, 2), 'utf8');
    console.log(`💾 Saved updated contacts to ${CONTACTS_FILE_PATH}`);
    
    console.log('🎉 Successfully removed phone number from contact!');
    
  } catch (error) {
    console.error('❌ Error removing phone number:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  const contactName = process.argv[2] || 'Aleena';
  const phoneNumber = process.argv[3] || '+14074010070';
  
  console.log('📞 Phone Number Removal Script');
  console.log('===============================');
  
  removePhoneFromContact(contactName, phoneNumber)
    .then(() => {
      console.log('✅ Script completed successfully');
    })
    .catch(console.error);
}

module.exports = { removePhoneFromContact }; 