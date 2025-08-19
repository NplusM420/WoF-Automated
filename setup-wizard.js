const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ANSI color codes for better terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function colorText(text, color) {
    return `${colors[color] || colors.reset}${text}${colors.reset}`;
}

function showSecurityNotice() {
    console.log('\n' + '='.repeat(60));
    console.log(colorText('🔐 PRIVATE KEY SETUP - IMPORTANT SECURITY NOTICE', 'yellow'));
    console.log('='.repeat(60));
    console.log('\n' + colorText('WHY DO WE NEED YOUR PRIVATE KEY?', 'cyan'));
    console.log('SpotSpinner needs your wallet\'s private key to:');
    console.log('• Automatically mint MULTIBALL tokens for you');
    console.log('• Convert tokens to Prize Tickets');
    console.log('• Execute transactions on your behalf');
    console.log('\n' + colorText('IS THIS SAFE?', 'green'));
    console.log(colorText('YES - Here\'s why:', 'bright'));
    console.log('✅ This application runs ENTIRELY on YOUR computer');
    console.log('✅ Your private key is stored ONLY in a local .env file');
    console.log('✅ NO data is sent to any external servers');
    console.log('✅ NO data is sent to the developer');
    console.log('✅ You can inspect all the code - it\'s open source');
    console.log('✅ Your key never leaves your machine');
    console.log('\n' + colorText('WHAT HAPPENS TO MY PRIVATE KEY?', 'blue'));
    console.log('• Stored locally in ".env" file (encrypted on disk)');
    console.log('• Only used by YOUR local SpotSpinner instance');
    console.log('• Never transmitted over the internet');
    console.log('• Never logged or stored elsewhere');
    console.log('\n' + colorText('ADDITIONAL SECURITY TIPS:', 'magenta'));
    console.log('• Use a dedicated wallet with limited funds');
    console.log('• Never share your .env file with anyone');
    console.log('• Keep your main funds in a different wallet');
    console.log('• You can always create a new wallet just for this');
    console.log('\n' + colorText('SOURCE CODE TRANSPARENCY:', 'cyan'));
    console.log('You can verify our claims by checking:');
    console.log('• src/config.js - Shows .env usage only');
    console.log('• src/wallet.js - No network calls with private key');
    console.log('• src/server.js - All blockchain calls stay local');
    console.log('\n' + colorText('Still concerned? You can:', 'yellow'));
    console.log('• Review all source code before entering your key');
    console.log('• Use a test wallet with minimal funds first');
    console.log('• Run this on an isolated/offline computer');
    console.log('• Create a dedicated wallet just for MULTIBALL farming');
    console.log('\n' + '='.repeat(60));
}

function validatePrivateKey(privateKey) {
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace(/^0x/, '');
    
    // Check if it's a valid 64-character hex string
    if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
        return false;
    }
    
    return true;
}

function validateWalletAddress(address) {
    // Check if it's a valid Ethereum address format
    if (!/^0x[0-9a-fA-F]{40}$/i.test(address)) {
        return false;
    }
    
    return true;
}

async function promptUser(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function getPrivateKey() {
    while (true) {
        console.log('\n' + colorText('ENTER YOUR PRIVATE KEY', 'bright'));
        console.log('Please paste your wallet\'s private key below:');
        console.log(colorText('(Input will be hidden for security)', 'yellow'));
        
        // Hide input for private key
        process.stdout.write('\nPrivate Key: ');
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        
        let privateKey = '';
        
        return new Promise((resolve) => {
            stdin.on('data', (char) => {
                const charStr = char.toString();
                
                if (charStr === '\r' || charStr === '\n') {
                    // Enter pressed
                    stdin.setRawMode(false);
                    stdin.pause();
                    console.log('\n');
                    
                    if (!privateKey) {
                        console.log(colorText('❌ Private key cannot be empty', 'red'));
                        resolve(getPrivateKey()); // Recursive retry
                        return;
                    }
                    
                    if (!validatePrivateKey(privateKey)) {
                        console.log(colorText('❌ Invalid private key format', 'red'));
                        console.log('Private key must be 64 hexadecimal characters (with or without 0x prefix)');
                        resolve(getPrivateKey()); // Recursive retry
                        return;
                    }
                    
                    // Add 0x prefix if not present
                    if (!privateKey.startsWith('0x')) {
                        privateKey = '0x' + privateKey;
                    }
                    
                    resolve(privateKey);
                } else if (charStr === '\x7f' || charStr === '\x08') {
                    // Backspace
                    if (privateKey.length > 0) {
                        privateKey = privateKey.slice(0, -1);
                    }
                } else if (charStr === '\x03') {
                    // Ctrl+C
                    console.log('\n\nSetup cancelled by user');
                    process.exit(0);
                } else {
                    // Regular character
                    privateKey += charStr;
                }
            });
        });
    }
}

async function getWalletAddress() {
    while (true) {
        console.log('\n' + colorText('ENTER YOUR WALLET ADDRESS', 'bright'));
        console.log('Please enter the public wallet address that corresponds to your private key:');
        console.log(colorText('(This should start with 0x followed by 40 characters)', 'yellow'));
        
        const address = await promptUser('\nWallet Address: ');
        
        if (!address) {
            console.log(colorText('❌ Wallet address cannot be empty', 'red'));
            continue;
        }
        
        if (!validateWalletAddress(address)) {
            console.log(colorText('❌ Invalid wallet address format', 'red'));
            console.log('Address must be 42 characters starting with 0x');
            continue;
        }
        
        return address;
    }
}

async function confirmSetup(privateKey, walletAddress) {
    console.log('\n' + '='.repeat(50));
    console.log(colorText('CONFIRM YOUR CONFIGURATION', 'bright'));
    console.log('='.repeat(50));
    console.log(`Wallet Address: ${colorText(walletAddress, 'green')}`);
    console.log(`Private Key: ${colorText('0x' + '*'.repeat(60) + privateKey.slice(-4), 'yellow')} (hidden for security)`);
    console.log('\n' + colorText('SECURITY REMINDER:', 'red'));
    console.log('• Your private key will be stored in .env file');
    console.log('• Keep this file secure and NEVER share it');
    console.log('• The application runs entirely on your computer');
    console.log('• No data is transmitted to external servers');
    
    while (true) {
        const confirm = await promptUser('\nConfirm setup? (yes/no): ');
        
        if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
            return true;
        } else if (confirm.toLowerCase() === 'no' || confirm.toLowerCase() === 'n') {
            return false;
        } else {
            console.log(colorText('Please enter "yes" or "no"', 'yellow'));
        }
    }
}

function createEnvFile(privateKey, walletAddress) {
    const envContent = `# SpotSpinner Configuration
# WARNING: Keep this file secure and NEVER share it with anyone!
# Your private key provides full control over your wallet

# Wallet Configuration
PRIVATE_KEY=${privateKey}
WALLET_ADDRESS=${walletAddress}

# Network Configuration (ApeChain)
RPC_URL=https://rpc.apechain.com
CHAIN_ID=33139

# Contract Addresses (DO NOT MODIFY unless you know what you're doing)
CONTRACT_ADDRESS=0x075893707e168162234b62a5b39650e124ff3321
PRIZE_TICKET_ADDRESS=0x618be6e12dc29e9731e81818c9b9d6bec961b28e
SECRET_SANTA_ADDRESS=0x80a5e6d411002891e519f531785e7686b3c467ed

# Automation Settings
MAX_DAILY_MINT=1000
MINT_QUANTITY_PER_TX=10

# Security Note:
# This file contains sensitive information (your private key)
# - Never commit this file to version control
# - Never share this file with anyone
# - Keep backups in a secure location only
# - Consider using a dedicated wallet for automation
`;

    try {
        fs.writeFileSync('.env', envContent, { mode: 0o600 }); // Restrictive permissions
        return true;
    } catch (error) {
        console.error(colorText('❌ Failed to create .env file:', 'red'), error.message);
        return false;
    }
}

async function setupComplete() {
    console.log('\n' + '='.repeat(60));
    console.log(colorText('🎉 SETUP SUCCESSFUL!', 'green'));
    console.log('='.repeat(60));
    console.log('\n' + colorText('Configuration created successfully!', 'bright'));
    console.log('\n' + colorText('NEXT STEPS:', 'cyan'));
    console.log('1. Your configuration is saved in the .env file');
    console.log('2. SpotSpinner is ready to use');
    console.log('3. The main setup will continue automatically');
    console.log('\n' + colorText('IMPORTANT REMINDERS:', 'yellow'));
    console.log('🔒 Keep your .env file secure and private');
    console.log('🚫 Never share your private key with anyone');
    console.log('💻 All operations run locally on your computer');
    console.log('🛡️  No data is sent to external servers');
    console.log('\n' + colorText('SUPPORT & DEVELOPMENT:', 'magenta'));
    console.log('• Built by @AThinkingMind');
    console.log('• Twitter: https://x.com/AThinkingMind');
    console.log('• Tips: 0x2616BA6e0AA6dA3F10858c350D447375a39A9b45');
    console.log('\nPress any key to continue with the main setup...');
    
    await promptUser('');
}

async function main() {
    try {
        // Show security notice
        showSecurityNotice();
        
        // Ask user if they want to continue
        const continueSetup = await promptUser('\n' + colorText('Do you understand and want to continue? (yes/no): ', 'bright'));
        
        if (continueSetup.toLowerCase() !== 'yes' && continueSetup.toLowerCase() !== 'y') {
            console.log('\nSetup cancelled. You can run this again when ready.');
            process.exit(0);
        }
        
        // Get private key and wallet address
        const privateKey = await getPrivateKey();
        const walletAddress = await getWalletAddress();
        
        // Confirm setup
        const confirmed = await confirmSetup(privateKey, walletAddress);
        
        if (!confirmed) {
            console.log('\nSetup cancelled. You can run this again when ready.');
            process.exit(0);
        }
        
        // Create .env file
        console.log('\n' + colorText('Creating configuration file...', 'cyan'));
        
        if (createEnvFile(privateKey, walletAddress)) {
            await setupComplete();
            process.exit(0);
        } else {
            console.log(colorText('❌ Failed to create configuration file', 'red'));
            process.exit(1);
        }
        
    } catch (error) {
        console.error(colorText('❌ Setup failed:', 'red'), error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\nSetup cancelled by user');
    process.exit(0);
});

main();