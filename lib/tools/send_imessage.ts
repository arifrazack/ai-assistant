import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { findContact } from './find_contact';

export async function sendImessageToContact(contactName: string, message: string): Promise<string> {
  try {
    console.log(`🔍 Searching for contact: ${contactName}`);
    
    // Find the contact first
    const contact = await findContact(contactName);
    if (!contact) {
      throw new Error(`Contact "${contactName}" not found. Please check the name and try again.`);
    }
    
    console.log(`Found contact: ${contact.name}`);
    console.log(`Available phones: ${contact.phones.length}, emails: ${contact.emails.length}`);
    
    // Try phone numbers first (in order) - preferred for iMessage
    if (contact.phones && contact.phones.length > 0) {
      for (let i = 0; i < contact.phones.length; i++) {
        const phoneNumber = contact.phones[i];
        console.log(`Trying phone number ${i + 1}: ${phoneNumber}`);
        
        try {
          const result = await sendMessage(phoneNumber, message, contact.name);
          
          // 🧠 LEARNING: This number worked! Make it the primary number for future use
          if (i > 0) {
            console.log(`📚 Learning: Phone ${phoneNumber} worked! Making it primary for ${contact.name}`);
            await moveSuccessfulContactToFirst(contact.name, phoneNumber, 'phone');
          }
          
          return `✅ iMessage sent to ${contact.name} using phone number: ${phoneNumber} - "${message}"`;
        } catch (phoneError) {
          const errorStr = String(phoneError);
          console.log(`Phone ${i + 1} (${phoneNumber}) failed: ${errorStr}`);
          
          // If this looks like a delivery failure, note it for better user feedback
          if (errorStr.includes('Delivery failed') || errorStr.includes('not support iMessage')) {
            console.log(`📵 Phone ${phoneNumber} does not support iMessage or is unreachable`);
          }
          
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
          const result = await sendMessage(email, message, contact.name);
          
          // 🧠 LEARNING: This email worked! Make it the primary email for future use
          if (i > 0) {
            console.log(`📚 Learning: Email ${email} worked! Making it primary for ${contact.name}`);
            await moveSuccessfulContactToFirst(contact.name, email, 'email');
          }
          
          return `✅ iMessage sent to ${contact.name} using email: ${email} (no phone numbers worked) - "${message}"`;
        } catch (emailError) {
          console.log(`Email ${i + 1} (${email}) failed: ${emailError}`);
        }
      }
    }
    
    // If we get here, nothing worked
    const availableMethods: string[] = [];
    if (contact.phones.length > 0) availableMethods.push(`${contact.phones.length} phone number(s)`);
    if (contact.emails.length > 0) availableMethods.push(`${contact.emails.length} email(s)`);
    
    throw new Error(`❌ Could not send iMessage to ${contact.name}. Tried ${availableMethods.join(' and ')} but none worked. The contact might not have iMessage enabled or the addresses might be invalid.`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('iMessage error:', errorMessage);
    throw new Error(`Failed to send iMessage: ${errorMessage}`);
  }
}

async function sendMessage(contactInfo: string, message: string, displayName: string): Promise<string> {
  // Use temporary file approach to avoid shell quoting issues
  const tempScriptPath = join(tmpdir(), `imessage_${Date.now()}.scpt`);
  
  // More reliable AppleScript that validates contact before sending
  const appleScript = `tell application "Messages"
    try
        set targetService to 1st service whose service type = iMessage
        
        -- First, try to validate that this contact can receive iMessages
        try
            set targetBuddy to buddy "${contactInfo}" of targetService
            
            -- Try to access the buddy properties to see if it's valid for iMessage
            set buddyName to name of targetBuddy
            set buddyService to service of targetBuddy
            
            -- Check if the service type is actually iMessage
            if service type of buddyService is not iMessage then
                error "Contact is not set up for iMessage service"
            end if
            
        on error buddyError
            -- If we can't create or validate the buddy, it likely doesn't support iMessage
            error "Cannot create iMessage buddy for ${contactInfo}: " & buddyError
        end try
        
        -- Send the message
        send "${message}" to targetBuddy
        
        -- Wait for message to be processed
        delay 2
        
        return "sent"
        
    on error errMsg
        error "iMessage failed: " & errMsg
    end try
end tell`;

  try {
    // Write AppleScript to temporary file
    await fs.writeFile(tempScriptPath, appleScript, 'utf8');

  return new Promise((resolve, reject) => {
    console.log(`📤 Sending iMessage to: ${contactInfo}`);
      console.log(`💬 Message: "${message}"`);
      
      // Execute AppleScript file with longer timeout for delivery checking
      exec(`osascript "${tempScriptPath}"`, { timeout: 15000 }, async (err, stdout, stderr) => {
        // Clean up temp file
        try {
          await fs.unlink(tempScriptPath);
        } catch (unlinkErr) {
          console.log('Warning: Failed to delete temp script file');
        }
        
        if (err) {
          console.error('iMessage error:', err.message);
          
          // Check for specific delivery failure patterns that indicate we should try next number
          const errorMessage = err.message.toLowerCase();
          if (errorMessage.includes('not reachable') || 
              errorMessage.includes('does not support imessage') ||
              errorMessage.includes('not found') ||
              errorMessage.includes('invalid') ||
              errorMessage.includes('delivery failed') ||
              errorMessage.includes('not delivered')) {
            console.log(`🚫 Delivery failure detected for ${contactInfo}: ${err.message}`);
            reject(`Delivery failed to ${contactInfo}: Contact does not support iMessage or is unreachable`);
          } else {
            reject(`Failed to send to ${contactInfo}: ${err.message}`);
          }
          return;
        }
        
        const result = stdout.trim();
        console.log(`📬 Message status: ${result}`);
        
        if (result === 'sent') {
          console.log(`✅ Message appears to be sent successfully to ${contactInfo}`);
          resolve(`iMessage sent to ${displayName} (${contactInfo}): "${message}"`);
        } else {
          console.log(`❌ Unexpected response from Messages app: ${result}`);
          reject(`Failed to send to ${contactInfo}: Unexpected response - ${result}`);
        }
      });
    });
    
  } catch (fileErr) {
    const errorMessage = fileErr instanceof Error ? fileErr.message : String(fileErr);
    console.error('Failed to create temp AppleScript file:', fileErr);
    throw new Error(`Failed to prepare iMessage script: ${errorMessage}`);
  }
}

// 🧠 LEARNING FUNCTION: Move successful contact method to first position
async function moveSuccessfulContactToFirst(contactName: string, successfulMethod: string, methodType: 'phone' | 'email'): Promise<void> {
  try {
    // Import the learning functions from find_contact
    const { updateContactMethodPriority } = await import('./find_contact');
    await updateContactMethodPriority(contactName, successfulMethod, methodType);
  } catch (error) {
    console.error('Failed to update contact method priority:', error);
    // Don't throw error - this is an optimization, not a critical failure
  }
}

// Additional function to check message delivery status after sending
async function checkMessageDeliveryStatus(contactInfo: string, message: string): Promise<boolean> {
  const tempScriptPath = join(tmpdir(), `check_delivery_${Date.now()}.scpt`);
  
  const checkScript = `tell application "Messages"
    try
        set targetService to 1st service whose service type = iMessage
        set targetBuddy to buddy "${contactInfo}" of targetService
        set targetChat to (first chat whose participants contains targetBuddy)
        
        -- Get the last few messages to find ours
        set recentMessages to last 5 messages of targetChat
        
        repeat with msg in recentMessages
            try
                if content of msg contains "${message}" then
                    -- Check if message shows as delivered/read (this is limited in AppleScript)
                    -- For now, just return true if we can find the message in the chat
                    return "found"
                end if
            end try
        end repeat
        
        return "not_found"
        
    on error errMsg
        return "error: " & errMsg
    end try
end tell`;

  try {
    await fs.writeFile(tempScriptPath, checkScript, 'utf8');
    
    return new Promise((resolve, reject) => {
      exec(`osascript "${tempScriptPath}"`, { timeout: 5000 }, async (err, stdout, stderr) => {
        try {
          await fs.unlink(tempScriptPath);
        } catch (unlinkErr) {
          console.log('Warning: Failed to delete delivery check temp file');
        }
        
        if (err) {
          console.log('Delivery check failed:', err.message);
          resolve(false); // Assume delivery failed if we can't check
          return;
        }
        
        const result = stdout.trim();
        console.log(`📋 Delivery check result: ${result}`);
        
        // If we found the message in the chat, assume it was delivered
        resolve(result === 'found');
      });
    });
    
  } catch (fileErr) {
    console.log('Failed to create delivery check script:', fileErr);
    return false;
  }
}

// Enhanced send message with optional delivery verification
export async function sendImessageWithDeliveryCheck(contactInfo: string, message: string, displayName: string): Promise<string> {
  try {
    // First, try the normal send
    const result = await sendMessage(contactInfo, message, displayName);
    
    // For extra reliability, do an additional delivery check after a delay
    console.log('🔍 Performing additional delivery verification...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    const deliveryVerified = await checkMessageDeliveryStatus(contactInfo, message);
    
    if (deliveryVerified) {
      console.log('✅ Message delivery verified');
      return result;
    } else {
      console.log('⚠️ Could not verify message delivery - but message was sent');
      return result; // Still return success since initial send worked
    }
    
  } catch (error) {
    // If initial send failed, throw the error so next number can be tried
    throw error;
  }
}

// Legacy function for backward compatibility
export async function sendImessage(contactInfo: string, message: string): Promise<string> {
  return await sendMessage(contactInfo, message, contactInfo);
} 