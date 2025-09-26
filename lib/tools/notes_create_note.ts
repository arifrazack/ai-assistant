import { exec } from 'child_process';

export async function createNote(title: string, body: string = ""): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!title) {
      return reject("Title is required for create_note tool");
    }
    
    const script = `
      tell application "Notes"
        make new note with properties {name:"${title.replace(/"/g, '\\"')}", body:"${body.replace(/"/g, '\\"')}"}
        return "Note created successfully"
      end tell
    `;
    
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        return reject("Failed to create note - Notes app may not be available");
      }
      resolve(`Created note "${title}" with content: ${body}`);
    });
  });
} 