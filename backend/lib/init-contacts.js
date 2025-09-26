const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// File path for storing contacts locally (relative to project root)
const CONTACTS_FILE_PATH = path.join(process.cwd(), 'data', 'contacts.json');

// Cache for contacts to avoid file reads
let contactsCache = null;

// Function to get ALL contacts from the system and save them to file
async function downloadAndSaveAllContacts() {
  console.log('Downloading all contacts from system...');
  
  return new Promise((resolve, reject) => {
    // AppleScript to get ALL contacts
    const getAllContactsScript = `
      tell application "Contacts"
        set allResults to {}
        
        repeat with currentPerson in people
          set personName to name of currentPerson
          set phoneList to {}
          set emailList to {}
          set companyName to ""
          
          -- Get company if available
          try
            set companyName to organization of currentPerson
          on error
            set companyName to ""
          end try
          
          -- Get phone numbers
          repeat with currentPhone in phones of currentPerson
            set end of phoneList to value of currentPhone
          end repeat
          
          -- Get emails
          repeat with currentEmail in emails of currentPerson
            set end of emailList to value of currentEmail
          end repeat
          
          -- Format as: Name|||company|||phone1,phone2|||email1,email2
          set phoneString to ""
          repeat with i from 1 to count of phoneList
            if i > 1 then set phoneString to phoneString & ","
            set phoneString to phoneString & item i of phoneList
          end repeat
          
          set emailString to ""
          repeat with i from 1 to count of emailList
            if i > 1 then set emailString to emailString & ","
            set emailString to emailString & item i of emailList
          end repeat
          
          set end of allResults to personName & "|||" & companyName & "|||" & phoneString & "|||" & emailString
        end repeat
        
        -- Join all results with @@@ separator
        set finalResult to ""
        repeat with i from 1 to count of allResults
          if i > 1 then set finalResult to finalResult & "@@@"
          set finalResult to finalResult & item i of allResults
        end repeat
        
        return finalResult
      end tell
    `;

    exec(`osascript -e '${getAllContactsScript}'`, async (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to download contacts:', err.message);
        return reject(new Error(`Failed to download contacts: ${err.message}`));
      }

      try {
        const contacts = parseAllContactResults(stdout);
        
        // Save to file
        await saveContactsToFile(contacts);
        
        // Update cache
        contactsCache = contacts;
        
        console.log(`Successfully downloaded and saved ${contacts.length} contacts`);
        resolve(contacts);
      } catch (error) {
        console.error('Error processing contacts:', error);
        reject(error);
      }
    });
  });
}

// Function to save contacts to local file
async function saveContactsToFile(contacts) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(CONTACTS_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Save contacts with timestamp
    const contactsData = {
      contacts: contacts,
      lastUpdated: new Date().toISOString(),
      totalCount: contacts.length
    };
    
    await fs.writeFile(CONTACTS_FILE_PATH, JSON.stringify(contactsData, null, 2), 'utf8');
    console.log(`Contacts saved to ${CONTACTS_FILE_PATH}`);
  } catch (error) {
    console.error('Failed to save contacts to file:', error);
    throw error;
  }
}

// Function to load contacts from local file
async function loadContactsFromFile() {
  try {
    // Return from cache if available
    if (contactsCache !== null) {
      return contactsCache;
    }
    
    const fileContent = await fs.readFile(CONTACTS_FILE_PATH, 'utf8');
    const contactsData = JSON.parse(fileContent);
    
    const loadedContacts = contactsData.contacts || [];
    contactsCache = loadedContacts;
    console.log(`Loaded ${loadedContacts.length} contacts from file (last updated: ${contactsData.lastUpdated})`);
    
    return loadedContacts;
  } catch (error) {
    console.log('No saved contacts file found or error reading file:', error.message);
    return [];
  }
}

// Function to initialize contacts (download if not exists, or load from file)
async function initializeContacts() {
  try {
    // Try to load from file first
    const existingContacts = await loadContactsFromFile();
    
    if (existingContacts.length > 0) {
      console.log('Using cached contacts from file');
      return existingContacts;
    }
    
    // If no cached contacts, download fresh
    console.log('No cached contacts found, downloading fresh from system...');
    return await downloadAndSaveAllContacts();
  } catch (error) {
    console.error('Failed to initialize contacts:', error);
    return [];
  }
}

// Parse results when getting ALL contacts
function parseAllContactResults(output) {
  const contacts = [];
  
  if (!output.trim()) return contacts;
  
  // Split by '@@@' to get individual contacts
  const contactLines = output.split('@@@').filter(line => line.includes('|||'));
  
  for (const line of contactLines) {
    try {
      // Format: Name|||Company|||phone1,phone2|||email1,email2
      const parts = line.split('|||');
      if (parts.length >= 4) {
        const contact = {
          name: parts[0].trim(),
          phones: parts[2] ? parts[2].split(',').map(p => p.trim()).filter(p => p) : [],
          emails: parts[3] ? parts[3].split(',').map(e => e.trim()).filter(e => e) : [],
          company: parts[1] && parts[1].trim() ? parts[1].trim() : undefined,
        };
        
        if (contact.name) {
          contacts.push(contact);
        }
      }
    } catch (parseError) {
      console.log('Error parsing contact line:', line, parseError);
    }
  }
  
  return contacts;
}

// Main initialization function for backend
async function initializeApp() {
  console.log('📱 Setting up contacts database...');
  const contacts = await initializeContacts();
  console.log(`✅ Successfully initialized ${contacts.length} contacts`);
  return contacts;
}

module.exports = {
  initializeApp,
  initializeContacts,
  downloadAndSaveAllContacts,
  loadContactsFromFile
}; 