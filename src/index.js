import { MultiBallMinter } from './minter.js';
import { AutoSpinner } from './spinner.js';
import { config } from './config.js';

async function main() {
  console.log('🎰 MULTIBALL Minting Automation Started');
  console.log('=====================================');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const quantity = parseInt(args[1]) || config.mintQuantityPerTx;

  const minter = new MultiBallMinter();
  const spinner = new AutoSpinner(minter.walletManager);

  try {
    await minter.initialize();
    await spinner.initialize();
    
    switch (command.toLowerCase()) {
      case 'status':
        await showStatus(minter);
        break;
        
      case 'mint':
        await executeMint(minter, quantity);
        break;
        
      case 'batch':
        await executeBatchMint(minter, quantity);
        break;
        
      case 'max':
        await executeMaxMint(minter);
        break;
        
      case 'spin':
        await executeSpin(spinner, args[1]);
        break;
        
      case 'claim':
        await executeClaim(spinner, args[1]);
        break;
        
      case 'auto':
        await executeAutoSpinClaim(spinner);
        break;
        
      case 'tokens':
        await showTokens(spinner);
        break;
        
      case 'full':
        await executeFullAutomation(minter, spinner, quantity);
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
    
  } catch (error) {
    console.error('❌ Application error:', error.message);
    process.exit(1);
  }
}

async function showStatus(minter) {
  console.log('📊 Current Status:');
  const status = await minter.getStatus();
  
  console.log(`Wallet: ${status.walletAddress}`);
  console.log(`Balance: ${status.balance} APE`);
  console.log(`Daily Minted: ${status.dailyMinted}/${status.dailyLimit}`);
  console.log(`Remaining Today: ${status.remainingToday}`);
}

async function executeMint(minter, quantity) {
  console.log(`🚀 Minting ${quantity} MULTIBALL tokens...`);
  const result = await minter.mint(quantity);
  
  if (result.success) {
    console.log('✅ Mint completed successfully!');
  } else {
    console.log('❌ Mint failed!');
  }
}

async function executeBatchMint(minter, totalQuantity) {
  console.log(`🚀 Starting batch mint for ${totalQuantity} tokens...`);
  const results = await minter.batchMint(totalQuantity);
  
  const successful = results.filter(r => r.success).length;
  const totalMinted = results.reduce((sum, r) => sum + (r.quantity || 0), 0);
  
  console.log(`\\n📈 Batch Mint Summary:`);
  console.log(`Successful transactions: ${successful}/${results.length}`);
  console.log(`Total tokens minted: ${totalMinted}`);
}

async function executeMaxMint(minter) {
  console.log('🚀 Minting maximum allowed tokens for today...');
  const status = await minter.getStatus();
  
  if (status.remainingToday <= 0) {
    console.log('❌ Daily limit already reached!');
    return;
  }
  
  const results = await minter.batchMint(status.remainingToday);
  
  const successful = results.filter(r => r.success).length;
  const totalMinted = results.reduce((sum, r) => sum + (r.quantity || 0), 0);
  
  console.log(`\\n📈 Max Mint Summary:`);
  console.log(`Successful transactions: ${successful}/${results.length}`);
  console.log(`Total tokens minted: ${totalMinted}`);
}

async function executeSpin(spinner, tokenId) {
  if (tokenId) {
    console.log(`🎲 Spinning token ${tokenId}...`);
    const result = await spinner.spinToken(parseInt(tokenId));
    if (result.success) {
      console.log('✅ Spin completed successfully!');
    }
  } else {
    console.log('❌ Please specify a token ID to spin');
  }
}

async function executeClaim(spinner, tokenId) {
  if (tokenId) {
    console.log(`🏆 Claiming prize for token ${tokenId}...`);
    const result = await spinner.claimPrize(parseInt(tokenId));
    if (result.success) {
      console.log('✅ Claim completed successfully!');
    }
  } else {
    console.log('❌ Please specify a token ID to claim');
  }
}

async function executeAutoSpinClaim(spinner) {
  console.log('🚀 Starting auto-spin and claim for all tokens...');
  const result = await spinner.autoSpinAndClaim();
  
  if (result.success) {
    console.log('✅ Auto-spin and claim completed!');
  } else {
    console.log('❌ Auto-spin and claim failed!');
  }
}

async function showTokens(spinner) {
  console.log('📦 Fetching your tokens...');
  const tokens = await spinner.getOwnedTokens();
  
  if (tokens.length === 0) {
    console.log('❌ No tokens found in your wallet');
    return;
  }
  
  console.log(`\\n📋 Your MULTIBALL tokens: ${tokens.join(', ')}`);
  
  // Check spin status for each token
  const spinStatus = await spinner.checkSpinStatus(tokens);
  
  console.log('\\n🎲 Token Status:');
  spinStatus.forEach(status => {
    const spinText = status.hasSpun ? '✅ Spun' : '⭕ Not Spun';
    const claimText = status.spinResult ? 
      (status.spinResult.claimed ? '✅ Claimed' : `🏆 Prize ${status.spinResult.prize} (Unclaimed)`) : 
      '';
    
    console.log(`Token ${status.tokenId}: ${spinText} ${claimText}`);
  });
}

async function executeFullAutomation(minter, spinner, quantity) {
  console.log('🚀 Starting full automation: Mint + Auto-Spin + Claim...');
  
  // First, mint tokens
  console.log('\\n💰 Phase 1: Minting tokens...');
  const mintResult = await minter.batchMint(quantity);
  
  if (!mintResult.some(r => r.success)) {
    console.log('❌ Minting failed, stopping automation');
    return;
  }
  
  console.log('✅ Minting phase completed');
  
  // Wait a bit for tokens to be available
  console.log('⏳ Waiting 10 seconds for tokens to be available...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Then auto-spin and claim
  console.log('\\n🎰 Phase 2: Auto-spinning and claiming...');
  const spinResult = await spinner.autoSpinAndClaim();
  
  if (spinResult.success) {
    console.log('✅ Full automation completed successfully!');
  } else {
    console.log('❌ Spinning/claiming phase failed');
  }
}

function showHelp() {
  console.log(`
🎰 MULTIBALL Minting & Spinning Automation
=========================================

Usage: npm start <command> [parameter]

MINTING COMMANDS:
  status              Show current wallet and minting status
  mint [quantity]     Mint specified quantity (default: ${config.mintQuantityPerTx})
  batch <quantity>    Batch mint specified total quantity
  max                 Mint maximum allowed tokens for today

SPINNING COMMANDS:
  tokens              Show all your tokens and their status
  spin <tokenId>      Spin a specific token
  claim <tokenId>     Claim prize for a specific token
  auto                Auto-spin and claim all eligible tokens

FULL AUTOMATION:
  full <quantity>     Complete automation: mint + spin + claim

Examples:
  npm start status                    # Check current status
  npm start mint 10                   # Mint 10 tokens
  npm start tokens                    # Show your tokens
  npm start auto                      # Auto-spin and claim all
  npm start full 50                   # Mint 50, then auto-spin/claim
  npm start spin 123                  # Spin token ID 123
  npm start claim 123                 # Claim prize for token 123

Configuration:
  Daily Limit: ${config.maxDailyMint} tokens
  Per Transaction: ${config.mintQuantityPerTx} tokens
  Contract: ${config.contractAddress}
  Chain: ApeChain (${config.chainId})

Note: Make sure to set your PRIVATE_KEY in the .env file before running!
`);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the application
main().catch(console.error);