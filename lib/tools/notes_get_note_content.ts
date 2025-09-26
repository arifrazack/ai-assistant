import { exec } from 'child_process';

export async function getNoteContent(noteName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!noteName) {
      return reject("Note name is required for get_note_content tool");
    }
    
    const script = `
      tell application "Notes"
        set theNote to note "${noteName}"
        return body of theNote
      end tell
    `;
    
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        return reject(`Failed to get note content for "${noteName}" - note may not exist`);
      }
      const content = stdout.trim();
      if (!content) {
        resolve(`Note "${noteName}" is empty`);
      } else {
        resolve(`Content of note "${noteName}": ${content}`);
      }
    });
  });
} 