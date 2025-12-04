import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fileStorage from '../utils/fileStorage.js';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyCleanup() {
    console.log('🔍 Verifying Storage Cleanup Logic...');
    console.log('----------------------------------------');

    // 1. Check Config
    console.log('1️⃣  Checking Configuration:');
    console.log('   Retention Settings:', JSON.stringify(config.cleanup.retention, null, 2));

    if (config.cleanup.retention.candidates !== 1 ||
        config.cleanup.retention.prs !== 1 ||
        config.cleanup.retention.analytics !== 1) {
        console.error('❌ Configuration mismatch! Expected 1 hour retention.');
        return;
    }
    console.log('✅ Configuration looks correct (1 hour retention).');

    // 2. Create Test Files
    console.log('\n2️⃣  Creating Test Files...');
    const testDir = path.join(__dirname, '..', 'storage', 'candidates');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const oldFile = path.join(testDir, 'test-old-file.json');
    const newFile = path.join(testDir, 'test-new-file.json');

    // Create "Old" file (2 hours ago)
    fs.writeFileSync(oldFile, JSON.stringify({ test: 'old' }));
    const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    fs.utimesSync(oldFile, oldTime, oldTime);
    console.log(`   Created old file: ${path.basename(oldFile)} (Timestamp: ${oldTime.toISOString()})`);

    // Create "New" file (30 minutes ago)
    fs.writeFileSync(newFile, JSON.stringify({ test: 'new' }));
    const newTime = new Date(Date.now() - 30 * 60 * 1000);
    fs.utimesSync(newFile, newTime, newTime);
    console.log(`   Created new file: ${path.basename(newFile)} (Timestamp: ${newTime.toISOString()})`);

    // 3. Run Cleanup
    console.log('\n3️⃣  Running Cleanup...');
    // Force cleanup with config settings
    fileStorage.cleanupOldFiles(config.cleanup.retention);

    // 4. Verify Results
    console.log('\n4️⃣  Verifying Results...');
    const oldExists = fs.existsSync(oldFile);
    const newExists = fs.existsSync(newFile);

    if (!oldExists && newExists) {
        console.log('✅ SUCCESS: Old file was deleted, new file was retained.');
        console.log('   This confirms that data older than 1 hour is being cleared.');
    } else {
        console.error('❌ FAILURE: Cleanup logic failed.');
        console.log(`   Old file exists: ${oldExists} (Should be false)`);
        console.log(`   New file exists: ${newExists} (Should be true)`);
    }

    // Cleanup test files
    if (fs.existsSync(newFile)) fs.unlinkSync(newFile);
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
}

verifyCleanup().catch(console.error);
