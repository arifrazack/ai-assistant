import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { findContact } from './find_contact';

export async function startFacetimeCall(contactName: string): Promise<string> {
  try {
    console.log(`Starting FaceTime call with ${contactName}...`);
    
    // Find the contact first
    const contact = await findContact(contactName);
    if (!contact) {
      throw new Error(`Contact "${contactName}" not found. Please check the name and try again.`);
    }
    
    console.log(`Found contact: ${contact.name}`);
    console.log(`Available phones: ${contact.phones.length}, emails: ${contact.emails.length}`);
    
    // Try phone numbers first (in order)
    if (contact.phones && contact.phones.length > 0) {
      for (let i = 0; i < contact.phones.length; i++) {
        const phoneNumber = contact.phones[i];
        console.log(`Trying phone number ${i + 1}: ${phoneNumber}`);
        
        try {
          const result = await tryFacetimeWithPhone(phoneNumber);
          
          // 🧠 LEARNING: This number worked! Make it the primary number for future FaceTime calls
          if (i > 0) {
            console.log(`📚 Learning: Phone ${phoneNumber} worked for FaceTime! Making it primary for ${contact.name}`);
            await moveSuccessfulContactToFirst(contact.name, phoneNumber, 'phone');
          }
          
          return `✅ FaceTime call started with ${contact.name} using phone number: ${phoneNumber}`;
        } catch (phoneError) {
          console.log(`Phone ${i + 1} (${phoneNumber}) failed: ${phoneError}`);
          
          // If this was the last phone number, continue to email
          if (i === contact.phones.length - 1) {
            console.log('All phone numbers failed, trying email...');
          }
        }
      }
    }
    
    // Try email addresses as fallback
    if (contact.emails && contact.emails.length > 0) {
      for (let i = 0; i < contact.emails.length; i++) {
        const email = contact.emails[i];
        console.log(`Trying email ${i + 1}: ${email}`);
        
        try {
          const result = await tryFacetimeWithEmail(email);
          
          // 🧠 LEARNING: This email worked! Make it the primary email for future FaceTime calls
          if (i > 0) {
            console.log(`📚 Learning: Email ${email} worked for FaceTime! Making it primary for ${contact.name}`);
            await moveSuccessfulContactToFirst(contact.name, email, 'email');
          }
          
          return `✅ FaceTime call started with ${contact.name} using email: ${email} (no phone numbers worked)`;
        } catch (emailError) {
          console.log(`Email ${i + 1} (${email}) failed: ${emailError}`);
        }
      }
    }
    
    // If we get here, nothing worked
    const availableMethods: string[] = [];
    if (contact.phones.length > 0) availableMethods.push(`${contact.phones.length} phone number(s)`);
    if (contact.emails.length > 0) availableMethods.push(`${contact.emails.length} email(s)`);
    
    throw new Error(`❌ Could not start FaceTime call with ${contact.name}. Tried ${availableMethods.join(' and ')} but none worked. The contact might not have FaceTime enabled or might be unavailable.`);
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('FaceTime call error:', error.message);
      throw new Error(`Failed to start FaceTime call: ${error.message}`);
    } else {
      console.error('Unknown FaceTime call error:', error);
      throw new Error('Failed to start FaceTime call (unknown error)');
    }
  }
}

// Helper function to try FaceTime with phone number using URL scheme
async function tryFacetimeWithPhone(phoneNumber: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Clean phone number for URL scheme - keep only digits and +
    const cleanPhone = phoneNumber.replace(/[^\d\+]/g, '');
    console.log(`🎥 Trying FaceTime URL scheme with: ${cleanPhone}`);
    
    // Use FaceTime URL scheme which is more reliable than AppleScript for phone numbers
    exec(`open "facetime://${cleanPhone}"`, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        reject(`Phone number failed: ${err.message}`);
        return;
      }
      
      // Give it a moment to process, then assume success
      setTimeout(() => {
        resolve(`FaceTime call initiated with phone: ${phoneNumber}`);
      }, 1000);
    });
  });
}

// Helper function to try FaceTime with email using URL scheme
async function tryFacetimeWithEmail(email: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use FaceTime URL scheme for email
    exec(`open "facetime://${email}"`, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        reject(`Email failed: ${err.message}`);
        return;
      }
      
      // Give it a moment to process
      setTimeout(() => {
        resolve(`FaceTime call initiated with email: ${email}`);
      }, 1000);
    });
  });
}

// Legacy function for backward compatibility (if other code calls it directly)
export async function startFacetimeCallDirect(contactHandle: string): Promise<string> {
  const tempScriptPath = join(tmpdir(), `facetime_legacy_${Date.now()}.scpt`);
  
  const script = `tell application "FaceTime"
    activate
    call "${contactHandle}"
end tell`;

  try {
    await fs.writeFile(tempScriptPath, script, 'utf8');
    
    return new Promise((resolve, reject) => {
      exec(`osascript "${tempScriptPath}"`, async (err) => {
        // Clean up temp file
        try {
          await fs.unlink(tempScriptPath);
        } catch (unlinkErr) {
          console.log('Warning: Failed to delete temp FaceTime legacy script file');
        }
        
      if (err) return reject("Failed to start FaceTime call");
      resolve("FaceTime call started with " + contactHandle);
    });
  });
    
  } catch (fileErr) {
    throw new Error(`Failed to prepare FaceTime legacy script: ${fileErr instanceof Error ? fileErr.message : String(fileErr)}`);
  }
}

// 🧠 LEARNING FUNCTION: Move successful contact method to first position for FaceTime
async function moveSuccessfulContactToFirst(contactName: string, successfulMethod: string, methodType: 'phone' | 'email'): Promise<void> {
  try {
    // Import the learning functions from find_contact
    const { updateContactMethodPriority } = await import('./find_contact');
    await updateContactMethodPriority(contactName, successfulMethod, methodType);
  } catch (error) {
    console.error('Failed to update contact method priority:', error instanceof Error ? error.message : String(error));
    // Don't throw error - this is an optimization, not a critical failure
  }
} 