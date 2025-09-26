import { exec } from 'child_process';

export async function listNotesInFolder(folderName: string = "All iCloud"): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!folderName) {
      return reject("Folder name is required for list_notes_in_folder tool");
    }
    
    const script = `
      tell application "Notes"
        set noteList to {}
        set theFolder to folder "${folderName}"
        set noteNames to name of every note in theFolder
        return noteNames
      end tell
    `;
    
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) {
        return reject(`Failed to list notes in folder "${folderName}" - folder may not exist`);
      }
      const notes = stdout.trim().split(', ').filter(note => note.length > 0);
      if (notes.length === 0) {
        resolve(`No notes found in folder "${folderName}"`);
      } else {
        resolve(`Notes in "${folderName}": ${notes.join(', ')}`);
      }
    });
  });
} 