import fileStorage from '../utils/fileStorage.js';
import config from '../config/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Mock config for testing if needed, but we'll use the imported one to verify actual config
console.log('Current Config Retention:', config.cleanup.retention);

const testCategory = 'candidates';
const storageDir = path.join(projectRoot, 'storage', testCategory);

// Ensure directory exists
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Create a file that is 2 hours old
const oldFile = path.join(storageDir, 'test-old-file.json');
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
fs.writeFileSync(oldFile, JSON.stringify({ test: 'old' }));
fs.utimesSync(oldFile, twoHoursAgo, twoHoursAgo);

// Create a file that is 30 minutes old
const newFile = path.join(storageDir, 'test-new-file.json');
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
fs.writeFileSync(newFile, JSON.stringify({ test: 'new' }));
fs.utimesSync(newFile, thirtyMinutesAgo, thirtyMinutesAgo);

console.log('Created test files:');
console.log(`- Old file (2 hours ago): ${oldFile}`);
console.log(`- New file (30 mins ago): ${newFile}`);

console.log('Running cleanup...');
const result = fileStorage.cleanupOldFiles(config.cleanup.retention);
console.log('Cleanup Result:', JSON.stringify(result, null, 2));

// Verify
const oldExists = fs.existsSync(oldFile);
const newExists = fs.existsSync(newFile);

console.log('Verification:');
console.log(`- Old file exists? ${oldExists} (Expected: false)`);
console.log(`- New file exists? ${newExists} (Expected: true)`);

if (!oldExists && newExists) {
    console.log('SUCCESS: Cleanup logic verified.');
    // Cleanup the new file
    fs.unlinkSync(newFile);
} else {
    console.error('FAILURE: Cleanup logic failed.');
    process.exit(1);
}
