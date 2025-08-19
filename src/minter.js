import { ethers } from 'ethers';
import { config } from './config.js';
import { contractABI } from './abi.js';
import { WalletManager } from './wallet.js';
import { TokenDatabase } from './tokenDatabase.js';

export class MultiBallMinter {
  constructor(walletManager = null, logger = null) {
    this.walletManager = walletManager || new WalletManager();
    this.contract = null;
    this.dailyMintCount = 0;
    this.lastMintDate = null;
    this.logger = logger || console.log;
    this.tokenDb = null; // Will be initialized when wallet is ready
  }
  
  log(message, type = 'info') {
    if (typeof this.logger === 'function') {
      this.logger(message, type);
    } else {
      console.log(message);
    }
  }

  async initialize() {
    // Only initialize wallet manager if we created our own instance
    if (!this.walletManager.getWallet()) {
      const success = await this.walletManager.initialize();
      if (!success) {
        throw new Error('Failed to initialize wallet');
      }
    }

    // Create contract instance
    this.contract = new ethers.Contract(
      config.contractAddress,
      contractABI,
      this.walletManager.getWallet()
    );

    // Initialize token database for this wallet
    this.tokenDb = new TokenDatabase(this.walletManager.getWallet().address);

    this.log(`Contract initialized: ${config.contractAddress}`);
    this.log(`Token database initialized for: ${this.walletManager.getWallet().address}`);
    return true;
  }

  async checkDailyLimit() {
    const today = new Date().toDateString();
    
    // Reset daily count if it's a new day
    if (this.lastMintDate !== today) {
      this.dailyMintCount = 0;
      this.lastMintDate = today;
    }

    return this.dailyMintCount;
  }

  async getMintedToday() {
    // Always use local tracking for immediate updates during minting operations
    // This ensures real-time progress display (1/1000, 2/1000, etc.)
    return this.dailyMintCount;
  }

  async getDailyLimit() {
    try {
      // Get daily limit from contract
      const limit = await this.contract.dailyLimit();
      return Number(limit);
    } catch (error) {
      console.log('Contract does not have dailyLimit function, using config default');
      return config.maxDailyMint;
    }
  }

  async mint(quantity = 1) {
    try {
      await this.checkDailyLimit();
      const currentMinted = await this.getMintedToday();
      const dailyLimit = await this.getDailyLimit();
      
      // Check if we would exceed daily limit
      if (currentMinted + quantity > dailyLimit) {
        const remainingMints = dailyLimit - currentMinted;
        if (remainingMints <= 0) {
          throw new Error(`Daily mint limit reached (${dailyLimit})`);
        }
        console.log(`Adjusting quantity from ${quantity} to ${remainingMints} to stay within daily limit`);
        quantity = remainingMints;
      }

      console.log(`Attempting to mint ${quantity} MULTIBALL tokens...`);
      
      // DreLabs approach: mint individually with delays
      const results = [];
      for (let i = 0; i < quantity; i++) {
        console.log(`Minting token ${i + 1} of ${quantity}...`);
        const result = await this.mintSingle();
        results.push(result);
        
        if (!result.success) {
          console.log('Mint failed, stopping batch operation');
          break;
        }
        
        // Add 1-second delay between mints (DreLabs approach)
        if (i < quantity - 1) {
          console.log('Waiting 1 second before next mint...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const successfulMints = results.filter(r => r.success).length;
      
      return {
        success: successfulMints > 0,
        quantity: successfulMints,
        results: results,
        dailyTotal: await this.getMintedToday()
      };

    } catch (error) {
      console.error(`❌ Mint failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async mintSingle() {
    try {
      console.log(`Attempting to mint 1 MULTIBALL token...`);

      // Try different mint function names in order of preference
      const mintFunctions = ['mint'];
      let transaction = null;
      let usedFunction = null;

      for (const funcName of mintFunctions) {
        try {
          console.log(`Trying ${funcName} function...`);
          
          // Prepare transaction options first
          const txOptions = {
            gasLimit: BigInt(config.gasLimit),
            maxFeePerGas: ethers.parseUnits(config.maxFeePerGas, 'wei'),
            maxPriorityFeePerGas: ethers.parseUnits(config.maxPriorityFeePerGas, 'wei')
          };
          
          // For the mint function, we need to send ETH (since it's free, send 0)
          // The quantity is determined by the payment amount, not a parameter
          if (funcName === 'mint') {
            // MULTIBALL is free according to the UI, so send 0 ETH
            txOptions.value = ethers.parseEther('0');
            
            // Try to estimate gas
            try {
              const gasEstimate = await this.contract[funcName].estimateGas(txOptions);
              txOptions.gasLimit = gasEstimate + BigInt(50000);
            } catch (gasError) {
              console.log(`Gas estimation failed for ${funcName}, using default gas limit`);
            }
            
            // Execute the mint transaction
            transaction = await this.contract[funcName](txOptions);
          }

          usedFunction = funcName;
          break;
        } catch (error) {
          console.log(`${funcName} failed: ${error.message}`);
          
          // Provide specific error feedback
          if (error.message.includes('execution reverted')) {
            console.log(`❌ ${funcName}: Transaction would revert (possible reasons: not allowlisted, mint not active, limit reached)`);
          } else if (error.message.includes('insufficient funds')) {
            console.log(`❌ ${funcName}: Insufficient funds for gas`);
          } else if (error.message.includes('unknown method')) {
            console.log(`❌ ${funcName}: Function does not exist on contract`);
          }
          
          continue;
        }
      }

      if (!transaction) {
        throw new Error('All mint functions failed. Contract may have different function signatures.');
      }

      console.log(`Transaction sent using ${usedFunction}: ${transaction.hash}`);
      console.log('Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await transaction.wait();
      
      if (receipt.status === 1) {
        this.dailyMintCount += 1;
        
        // Extract minted token IDs from Transfer events
        const mintedTokenIds = await this.extractTokenIdsFromReceipt(receipt);
        
        console.log(`✅ Successfully minted 1 MULTIBALL token!`);
        console.log(`Transaction confirmed: ${receipt.transactionHash}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        if (mintedTokenIds.length > 0) {
          console.log(`🎯 Minted Token IDs: [${mintedTokenIds.join(', ')}]`);
          this.log(`🎯 Minted Token IDs: [${mintedTokenIds.join(', ')}]`, 'success');
        }
        console.log(`Daily mint count: ${this.dailyMintCount}/${config.maxDailyMint}`);
        
        // Save token IDs to log file for tracking
        await this.logMintedTokens(mintedTokenIds, receipt.transactionHash);
        
        // Add minted tokens to local database for instant access
        if (this.tokenDb && mintedTokenIds.length > 0) {
          this.tokenDb.addMintedTokens(mintedTokenIds, receipt.transactionHash);
          this.log(`✅ Added ${mintedTokenIds.length} tokens to local database`, 'success');
        }
        
        return {
          success: true,
          txHash: receipt.transactionHash,
          quantity: 1,
          gasUsed: receipt.gasUsed.toString(),
          dailyTotal: this.dailyMintCount,
          tokenIds: mintedTokenIds
        };
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error(`❌ Mint failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async batchMint(totalQuantity) {
    const results = [];
    let totalMinted = 0;
    let batchNumber = 1;
    
    this.log(`🚀 Starting batch mint for ${totalQuantity} tokens (batches of ${config.mintQuantityPerTx})...`);
    
    while (totalMinted < totalQuantity) {
      const currentMinted = await this.getMintedToday();
      const dailyLimit = await this.getDailyLimit();
      
      if (currentMinted >= dailyLimit) {
        this.log(`⏹️  Daily limit (${dailyLimit}) reached, stopping batch mint`);
        break;
      }
      
      const remaining = totalQuantity - totalMinted;
      const availableToday = dailyLimit - currentMinted;
      const quantityThisBatch = Math.min(remaining, config.mintQuantityPerTx, availableToday);
      
      this.log(`📦 Batch ${batchNumber}: Minting ${quantityThisBatch} tokens (${totalMinted}/${totalQuantity} completed)`);
      
      const result = await this.mint(quantityThisBatch);
      results.push(result);
      
      if (!result.success) {
        this.log(`❌ Batch ${batchNumber} failed, stopping batch operation`, 'error');
        break;
      }
      
      totalMinted += result.quantity || quantityThisBatch;
      batchNumber++;
      
      // Progress update
      const progress = Math.round((totalMinted / totalQuantity) * 100);
      this.log(`📊 Progress: ${totalMinted}/${totalQuantity} tokens (${progress}%)`);
      
      // Small delay between batches (in addition to the 1-second delays between individual mints)
      if (totalMinted < totalQuantity && currentMinted < dailyLimit) {
        this.log('⏳ Waiting 3 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    this.log(`✅ Batch minting completed: ${totalMinted}/${totalQuantity} tokens minted`, 'success');
    return {
      success: totalMinted > 0,
      totalMinted: totalMinted,
      totalRequested: totalQuantity,
      results: results
    };
  }

  async getStatus() {
    const balance = await this.walletManager.getBalance();
    const dailyMinted = await this.getMintedToday();
    
    return {
      walletAddress: this.walletManager.getWallet().address,
      balance: balance,
      dailyMinted: dailyMinted,
      dailyLimit: config.maxDailyMint,
      remainingToday: config.maxDailyMint - dailyMinted
    };
  }

  // Extract token IDs from transaction receipt by parsing Transfer events
  async extractTokenIdsFromReceipt(receipt) {
    try {
      const walletAddress = this.walletManager.getWallet().address;
      const tokenIds = [];
      
      // Look for Transfer events (ERC721 standard)
      // Transfer event signature: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      for (const log of receipt.logs) {
        // Check if this is a Transfer event from this contract
        if (log.address.toLowerCase() === config.contractAddress.toLowerCase() && 
            log.topics[0] === transferTopic) {
          
          // Parse the transfer event
          const fromAddress = '0x' + log.topics[1].slice(26); // Remove padding
          const toAddress = '0x' + log.topics[2].slice(26);   // Remove padding
          const tokenId = parseInt(log.topics[3], 16);        // Convert hex to decimal
          
          // Check if this token was minted to our wallet (from 0x0 to our address)
          if (fromAddress === '0x0000000000000000000000000000000000000000' && 
              toAddress.toLowerCase() === walletAddress.toLowerCase()) {
            tokenIds.push(tokenId);
          }
        }
      }
      
      return tokenIds;
    } catch (error) {
      console.log(`⚠️  Could not extract token IDs: ${error.message}`);
      return [];
    }
  }

  // Log minted token IDs to a persistent file for tracking
  async logMintedTokens(tokenIds, txHash) {
    try {
      if (tokenIds.length === 0) return;
      
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const logDir = path.join(__dirname, '../.ai');
      const logFile = path.join(logDir, 'minted-tokens.log');
      
      // Ensure log directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString();
      const walletAddress = this.walletManager.getWallet().address;
      const logEntry = `${timestamp} | ${walletAddress} | ${txHash} | [${tokenIds.join(', ')}]\n`;
      
      // Append to log file
      fs.appendFileSync(logFile, logEntry);
      
      console.log(`📝 Logged minted tokens to: ${logFile}`);
      
    } catch (error) {
      console.log(`⚠️  Could not log minted tokens: ${error.message}`);
    }
  }
}