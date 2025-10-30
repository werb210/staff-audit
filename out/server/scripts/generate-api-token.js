#!/usr/bin/env ts-node
import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
function generateApiToken(purpose) {
    // Generate a 64-character random hex token
    const token = randomBytes(32).toString('hex');
    return `${purpose}-${Date.now()}-${token}`;
}
function saveTokenConfig(config) {
    const configPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    try {
        envContent = readFileSync(configPath, 'utf8');
    }
    catch (error) {
        // File doesn't exist, start fresh
    }
    // Update or add the token
    const tokenKey = `PIPELINE_TOKEN`;
    const tokenLine = `${tokenKey}=${config.token}`;
    if (envContent.includes(tokenKey)) {
        // Replace existing token
        envContent = envContent.replace(new RegExp(`${tokenKey}=.*`), tokenLine);
    }
    else {
        // Add new token
        envContent += `\n${tokenLine}\n`;
    }
    writeFileSync(configPath, envContent.trim() + '\n');
    console.log(`✅ Token saved to .env.local`);
}
// Parse command line arguments
const args = process.argv.slice(2);
const purpose = args.find(arg => arg.startsWith('--for='))?.split('=')[1] || 'client';
// Generate new token
const token = generateApiToken(purpose);
const config = {
    for: purpose,
    token: token,
    issued: new Date().toISOString()
};
console.log(`🔑 Generated API token for: ${purpose}`);
console.log(`📋 Token: ${token}`);
// Save to .env.local
saveTokenConfig(config);
console.log(`
🎯 Usage Instructions:
1. Copy this token to your client application's environment variables
2. Use it in Authorization headers: Authorization: Bearer ${token}
3. Token is valid for inter-app communication with staff API

✅ Token generated and saved successfully!
`);
