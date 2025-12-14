const fs = require('fs');
const path = require('path');

// Try to load .env.local first, then .env
const envFiles = ['.env.local', '.env'];
envFiles.forEach(file => {
    const envPath = path.join(process.cwd(), file);
    if (fs.existsSync(envPath)) {
        console.log(`Loading ${file}...`);
        require('dotenv').config({ path: envPath });
    }
});

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log("\n--- Firebase Admin Env Check ---");
console.log(`FIREBASE_PROJECT_ID:   ${projectId ? '✅ Present (' + projectId + ')' : '❌ Missing'}`);
console.log(`FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅ Present' : '❌ Missing'}`);

if (!privateKey) {
    console.log(`FIREBASE_PRIVATE_KEY:    ❌ Missing`);
} else {
    // Check for common formatting issues
    const hasBegin = privateKey.includes('-----BEGIN PRIVATE KEY-----');
    const hasEnd = privateKey.includes('-----END PRIVATE KEY-----');
    const rawLength = privateKey.length;

    // Check if it's the literal string "undefined" or "null"
    if (privateKey === 'undefined' || privateKey === 'null') {
        console.log(`FIREBASE_PRIVATE_KEY:    ❌ Invalid (Value is "${privateKey}")`);
    } else {
        console.log(`FIREBASE_PRIVATE_KEY:    ${hasBegin && hasEnd ? '✅ Valid Header/Footer' : '❌ Invalid Format'}`);
        console.log(`                       Length: ${rawLength} chars`);

        if (!hasBegin) console.log("                       -> Missing '-----BEGIN PRIVATE KEY-----'");
        if (!hasEnd) console.log("                       -> Missing '-----END PRIVATE KEY-----'");

        // Check for newline handling
        const hasEscapedNewlines = privateKey.includes('\\n');
        const hasRealNewlines = privateKey.includes('\n');

        if (hasEscapedNewlines) console.log("                       -> Contains escaped newlines (\\n) - This is good for .env");
        if (hasRealNewlines) console.log("                       -> Contains real newlines");

        if (!hasEscapedNewlines && !hasRealNewlines) {
            console.log("                       -> ⚠️ WARNING: No newlines detected. Key might be corrupted.");
        }
    }
}
console.log("--------------------------------\n");
