import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface ContactInfo {
  name: string;
  phones: string[];
  emails: string[];
  company?: string;
}

// File path for storing contacts locally
const CONTACTS_FILE_PATH = path.join(process.cwd(), 'data', 'contacts.json');

// Cache for contacts to avoid file reads
let contactsCache: ContactInfo[] | null = null;

// Function to get ALL contacts from the system and save them to file
export async function downloadAndSaveAllContacts(): Promise<ContactInfo[]> {
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
        return reject(`Failed to download contacts: ${err.message}`);
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
async function saveContactsToFile(contacts: ContactInfo[]): Promise<void> {
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
  } catch (error: any) {
    console.error('Failed to save contacts to file:', error);
    throw error;
  }
}

// Function to load contacts from local file
export async function loadContactsFromFile(): Promise<ContactInfo[]> {
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
  } catch (error: any) {
    console.log('No saved contacts file found or error reading file:', error.message);
    return [];
  }
}

// Function to initialize contacts (download if not exists, or load from file)
export async function initializeContacts(): Promise<ContactInfo[]> {
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

// Function to refresh contacts (force download and save)
export async function refreshContacts(): Promise<ContactInfo[]> {
  console.log('Refreshing contacts from system...');
  contactsCache = null; // Clear cache
  return await downloadAndSaveAllContacts();
}

// Modified findContact function to use cached contacts for better performance
export async function findContact(searchName: string): Promise<ContactInfo | null> {
  try {
    console.log(`🔍 Searching for contact: "${searchName}"`);
    
    // Validate search input
    if (!searchName || searchName.trim() === '') {
      throw new Error('Contact Search Error: Missing contact name. Please provide a contact name to search for (e.g., "John Smith", "Mom", or "john@example.com").');
    }
    
    const cleanSearchName = searchName.trim().toLowerCase();
    
    if (cleanSearchName.length < 2) {
      throw new Error('Contact Search Error: Contact name too short. Please provide at least 2 characters for the search.');
    }
    
    try {
      // Load contacts from cache/file
      const allContacts = await loadContactsFromFile();
      
      if (allContacts.length === 0) {
        console.log('No cached contacts found, initializing...');
        try {
          const freshContacts = await initializeContacts();
          const result = searchInContacts(freshContacts, cleanSearchName);
          
          if (!result) {
            throw new Error(`Contact Search Error: No contact found for "${searchName}" in your contacts. Please check the name spelling or try: full name instead of nickname, different name variation, or ensure the contact exists in your Contacts app.`);
          }
          
          console.log(`✅ Found contact: ${result.name}`);
          return result;
        } catch (initError: any) {
          console.error('Contact initialization error:', initError);
          throw new Error(`Contact Search Error: Failed to load contacts from system. ${initError.message || 'Please check Contacts app permissions.'}`);
        }
      }
      
      const result = searchInContacts(allContacts, cleanSearchName);
      
      if (!result) {
        throw new Error(`Contact Search Error: No contact found for "${searchName}" in your ${allContacts.length} cached contacts. Please check the name spelling or try: full name instead of nickname, different name variation, or ensure the contact exists in your Contacts app.`);
      }
      
      console.log(`✅ Found contact: ${result.name} (phones: ${result.phones.length}, emails: ${result.emails.length})`);
      return result;
      
    } catch (loadError: any) {
      console.error('Contact loading error:', loadError);
      
      // If it's already a specific contact search error, preserve it
      if (loadError.message.includes('Contact Search Error:')) {
        throw loadError;
      }
      
      // Fallback to direct system search
      console.log('Falling back to direct system search...');
      try {
        const fallbackResult = await findContactFromSystem(searchName);
        
        if (!fallbackResult) {
          throw new Error(`Contact Search Error: No contact found for "${searchName}" in system search. Contact may not exist in your Contacts app. Please check: contact name spelling, try full name, or verify the contact is in your Contacts app.`);
        }
        
        console.log(`✅ Found contact via system search: ${fallbackResult.name}`);
        return fallbackResult;
      } catch (systemError: any) {
        console.error('System contact search error:', systemError);
        throw new Error(`Contact Search Error: Failed to find contact "${searchName}" in both cached and system searches. ${systemError.message || 'Please check Contacts app accessibility permissions.'}`);
      }
    }
    
  } catch (error: any) {
    console.error('findContact error:', error);
    
    // If it's already a detailed error from above, preserve it
    if (error.message.includes('Contact Search Error:')) {
      throw error;
    }
    
    // For any other unexpected errors, add context
    throw new Error(`Contact Search Unexpected Error: ${error.message || 'Unknown error occurred while searching for contact'}`);
  }
}

// Helper function to search through contacts array
function searchInContacts(contacts: ContactInfo[], searchName: string): ContactInfo | null {
  const matchingContacts = contacts.filter(contact => {
    const contactName = contact.name.toLowerCase();
    return contactName.includes(searchName) || 
           contact.phones.some(phone => phone.includes(searchName)) ||
           contact.emails.some(email => email.toLowerCase().includes(searchName));
  });
  
  if (matchingContacts.length === 0) return null;
  
  return findBestMatch(matchingContacts, searchName);
}

// Original system search function as fallback
async function findContactFromSystem(searchName: string): Promise<ContactInfo | null> {
  const cleanSearchName = searchName.trim().toLowerCase();
  
  return new Promise((resolve, reject) => {
    // Simple and reliable AppleScript to search contacts
    const contactScript = `
      tell application "Contacts"
        set results to {}
        
        repeat with currentPerson in people
          set personName to name of currentPerson
          
          -- Check if this person matches our search
          if personName contains "${searchName}" then
            set phoneList to {}
            set emailList to {}
            
            -- Get phone numbers
            repeat with currentPhone in phones of currentPerson
              set end of phoneList to value of currentPhone
            end repeat
            
            -- Get emails
            repeat with currentEmail in emails of currentPerson
              set end of emailList to value of currentEmail
            end repeat
            
            -- Format as: Name|||phone1,phone2|||email1,email2
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
            
            set end of results to personName & "|||" & phoneString & "|||" & emailString
          end if
        end repeat
        
        -- Join all results with @@@ separator
        set finalResult to ""
        repeat with i from 1 to count of results
          if i > 1 then set finalResult to finalResult & "@@@"
          set finalResult to finalResult & item i of results
        end repeat
        
        return finalResult
      end tell
    `;

    console.log(`Searching for contact: ${searchName}`);
    
    exec(`osascript -e '${contactScript}'`, (err, stdout, stderr) => {
      if (err) {
        console.error('Contact search error:', err.message);
        return reject(`Failed to search contacts: ${err.message}`);
      }

      console.log('Contact search raw output:', stdout);
      
      try {
        const contacts = parseContactResults(stdout, cleanSearchName);
        
        if (contacts.length === 0) {
          console.log('No contacts found, trying call history...');
          // Try to get recent call history as backup
          getRecentCallHistory(searchName)
            .then(historyContact => resolve(historyContact))
            .catch(() => resolve(null));
        } else {
          // Return the best match
          const bestMatch = findBestMatch(contacts, cleanSearchName);
          console.log('Best contact match:', bestMatch);
          resolve(bestMatch);
        }
      } catch (parseError) {
        console.error('Error parsing contact results:', parseError);
        resolve(null);
      }
    });
  });
}

function parseContactResults(output: string, searchName: string): ContactInfo[] {
  const contacts: ContactInfo[] = [];
  
  if (!output.trim()) return contacts;
  
  // Split by '@@@' to get individual contacts
  const contactLines = output.split('@@@').filter(line => line.includes('|||'));
  
  for (const line of contactLines) {
    try {
      // Format: Name|||phone1,phone2|||email1,email2
      const parts = line.split('|||');
      if (parts.length >= 3) {
        const contact: ContactInfo = {
          name: parts[0].trim(),
          phones: parts[1] ? parts[1].split(',').map(p => p.trim()).filter(p => p) : [],
          emails: parts[2] ? parts[2].split(',').map(e => e.trim()).filter(e => e) : [],
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

function findBestMatch(contacts: ContactInfo[], searchName: string): ContactInfo | null {
  if (contacts.length === 0) return null;
  if (contacts.length === 1) return contacts[0];
  
  // Score contacts based on name similarity
  const scoredContacts = contacts.map(contact => {
    const contactName = contact.name.toLowerCase();
    let score = 0;
    
    // Exact match gets highest score
    if (contactName === searchName) score += 100;
    
    // Check if search name is contained in contact name
    if (contactName.includes(searchName)) score += 50;
    
    // Check if any word in contact name matches search name
    const contactWords = contactName.split(' ');
    const searchWords = searchName.split(' ');
    
    for (const searchWord of searchWords) {
      for (const contactWord of contactWords) {
        if (contactWord === searchWord) score += 30;
        else if (contactWord.includes(searchWord)) score += 15;
        else if (searchWord.includes(contactWord)) score += 10;
      }
    }
    
    // Bonus for having contact methods
    if (contact.phones.length > 0) score += 5;
    if (contact.emails.length > 0) score += 5;
    
    return { contact, score };
  });
  
  // Sort by score and return best match
  scoredContacts.sort((a, b) => b.score - a.score);
  return scoredContacts[0].contact;
}

async function getRecentCallHistory(searchName: string): Promise<ContactInfo | null> {
  return new Promise((resolve, reject) => {
    // Try to get recent FaceTime calls
    const callHistoryScript = `
      tell application "FaceTime"
        -- This might not work on all versions, but worth trying
        try
          get recent calls
        on error
          return "No call history available"
        end try
      end tell
    `;
    
    exec(`osascript -e '${callHistoryScript}'`, (err, stdout, stderr) => {
      // For now, just resolve null since call history is tricky
      // Could be enhanced with database queries to call history files
      resolve(null);
    });
  });
}

// 🧠 LEARNING FUNCTION: Update contact method priority based on success
export async function updateContactMethodPriority(contactName: string, successfulMethod: string, methodType: 'phone' | 'email'): Promise<void> {
  try {
    console.log(`📚 Updating contact priority: ${contactName} -> ${methodType}: ${successfulMethod}`);
    
    // Load current contacts from file
    const contacts = await loadContactsFromFile();
    
    // Find the specific contact
    const contactIndex = contacts.findIndex(c => 
      c.name.toLowerCase().includes(contactName.toLowerCase()) ||
      contactName.toLowerCase().includes(c.name.toLowerCase())
    );
    
    if (contactIndex === -1) {
      console.log(`Contact ${contactName} not found for priority update`);
      return;
    }
    
    const contact = contacts[contactIndex];
    let updated = false;
    
    if (methodType === 'phone' && contact.phones) {
      // Find the successful phone number and move it to first position
      const phoneIndex = contact.phones.findIndex(phone => phone === successfulMethod);
      if (phoneIndex > 0) { // Only move if it's not already first
        // Remove from current position and add to beginning
        const [successfulPhone] = contact.phones.splice(phoneIndex, 1);
        contact.phones.unshift(successfulPhone);
        updated = true;
        console.log(`✅ Moved phone ${successfulMethod} to first position for ${contact.name}`);
      }
    } else if (methodType === 'email' && contact.emails) {
      // Find the successful email and move it to first position
      const emailIndex = contact.emails.findIndex(email => email === successfulMethod);
      if (emailIndex > 0) { // Only move if it's not already first
        // Remove from current position and add to beginning
        const [successfulEmail] = contact.emails.splice(emailIndex, 1);
        contact.emails.unshift(successfulEmail);
        updated = true;
        console.log(`✅ Moved email ${successfulMethod} to first position for ${contact.name}`);
      }
    }
    
    if (updated) {
      // Update the contact in the array
      contacts[contactIndex] = contact;
      
      // Update cache
      contactsCache = contacts;
      
      // Save updated contacts back to file
      await saveContactsToFile(contacts);
      console.log(`💾 Saved updated contact priority for ${contact.name}`);
    }
    
  } catch (error: unknown) {
    console.error('Error updating contact method priority:', error instanceof Error ? error.message : String(error));
  }
}

// Note: getBestFacetimeContact and getBestImessageContact functions have been deprecated.
// The new sequential approach in start_facetime_call and send_imessage automatically
// tries all available contact methods in order (phones first, then emails). 

// Parse results when getting ALL contacts
function parseAllContactResults(output: string): ContactInfo[] {
  const contacts: ContactInfo[] = [];
  
  if (!output.trim()) return contacts;
  
  // Split by '@@@' to get individual contacts
  const contactLines = output.split('@@@').filter(line => line.includes('|||'));
  
  for (const line of contactLines) {
    try {
      // Format: Name|||Company|||phone1,phone2|||email1,email2
      const parts = line.split('|||');
      if (parts.length >= 4) {
        const contact: ContactInfo = {
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