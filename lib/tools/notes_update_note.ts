import { exec } from 'child_process';

export async function updateNote(noteName: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!noteName || !body) {
      return reject("Note name and body are required for update_note tool");
    }
    
    const script = `
      tell application "Notes"
        set theNote to note "${noteName}"
        set body of theNote to "${body.replace(/"/g, '\\"')}"
        return "Note updated successfully"
      end tell
    `;
    
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        return reject(`Failed to update note "${noteName}" - note may not exist`);
      }
      resolve(`Updated note "${noteName}" with new content: ${body}`);
    });
  });
} 