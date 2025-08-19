import { ethers } from 'ethers';
import { config } from './config.js';
import { contractABI } from './abi.js';
import { prizeTicketABI } from './prizeTicketAbi.js';
import { secretSantaABI, BallType } from './secretSantaABI.js';
import { RetryHelper, ErrorHandler } from './utils.js';
import { TokenDatabase } from './tokenDatabase.js';

export class AutoSpinner {
  constructor(walletManager, logger = null) {
    this.walletManager = walletManager;
    this.contract = null; // MULTIBALL contract
    this.prizeTicketContract = null; // Prize Ticket contract
    this.secretSantaContract = null; // SecretSanta conversion contract
    this.spinResults = [];
    this.logger = logger || console.log;
    this.tokenDb = null; // Will be initialized when wallet is ready
    
    // Cache for token data to make API calls non-blocking
    this.tokenCache = {
      tokens: [],
      lastUpdate: null,
      isScanning: false,
      scanProgress: 0,
      stats: {
        totalTokens: 0,
        unspun: 0,
        spun: 0,
        claimable: 0,
        claimed: 0,
        errors: 0
      }
    };
  }
  
  log(message, type = 'info') {
    if (typeof this.logger === 'function') {
      this.logger(message, type);
    } else {
      console.log(message);
    }
  }

  async initialize() {
    if (!this.walletManager.getWallet()) {
      throw new Error('Wallet manager not initialized');
    }

    // Initialize MULTIBALL contract (for token detection and management)
    this.contract = new ethers.Contract(
      config.contractAddress,
      contractABI,
      this.walletManager.getWallet()
    );

    // Initialize Prize Ticket contract (for spinning 10 balls → 1 prize)
    this.prizeTicketContract = new ethers.Contract(
      config.prizeTicketAddress,
      prizeTicketABI,
      this.walletManager.getWallet()
    );

    // Initialize SecretSanta contract (ACTUAL conversion mechanism)
    this.secretSantaContract = new ethers.Contract(
      config.secretSantaAddress,
      secretSantaABI,
      this.walletManager.getWallet()
    );

    // Initialize token database for instant token access (no blockchain scanning needed)
    this.tokenDb = new TokenDatabase(this.walletManager.getWallet().address);

    this.log('🎰 AutoSpinner initialized with MULTIBALL, Prize Ticket, and SecretSanta contracts');
    this.log('💾 Token database initialized for instant token access');
    return true;
  }

  // NEW: Get tokens instantly from local database (no blockchain scanning)
  getOwnedTokensInstant() {
    if (!this.tokenDb) {
      this.log('❌ Token database not initialized', 'error');
      return [];
    }

    const tokenData = this.tokenDb.getUserTokens();
    this.log(`💾 Retrieved ${tokenData.totalTokens} tokens instantly from local database`, 'success');
    
    return tokenData.tokens;
  }

  // Get tokens for Prize Ticket conversion (automated selection)
  getTokensForConversion() {
    if (!this.tokenDb) {
      this.log('❌ Token database not initialized', 'error');
      return { conversionGroups: [], availableTokens: 0 };
    }

    const conversionData = this.tokenDb.getTokensForConversion();
    this.log(`🎯 Conversion Analysis: ${conversionData.availableTokens} tokens → ${conversionData.possibleConversions} Prize Tickets`, 'info');
    
    return conversionData;
  }

  async getOwnedTokens() {
    try {
      // First, try to get tokens from local database (instant)
      if (this.tokenDb) {
        const localTokens = this.getOwnedTokensInstant();
        if (localTokens.length > 0) {
          this.log(`✅ Using ${localTokens.length} tokens from local database (instant access)`, 'success');
          return localTokens;
        }
      }

      // IMPORTANT: Do NOT scan blockchain when database is empty
      // The mint tracking system will capture all future tokens automatically
      this.log(`💾 Local database empty - relying on mint tracking for future tokens`, 'info');
      this.log(`🎯 Tokens will be tracked automatically when minted - no scanning needed`, 'info');
      
      return [];
      
    } catch (error) {
      this.log(`❌ Failed to get owned tokens: ${error.message}`, 'error');
      return [];
    }
  }

  async scanForOwnedTokens() {
    const ownedTokens = [];
    const walletAddress = this.walletManager.getWallet().address;
    
    try {
      this.log('🔍 Scanning for MULTIBALL tokens using comprehensive method...');
      
      // Try to get balance, but don't fail if it doesn't work
      let expectedBalance = 0;
      try {
        const balance = await this.contract.balanceOf(walletAddress);
        expectedBalance = Number(balance);
        this.log(`📊 Expected to find ${expectedBalance} MULTIBALL tokens`);
      } catch (error) {
        this.log(`⚠️  Could not get balance (${error.message}), scanning anyway...`);
        // Set a reasonable target based on what user reported (490 tokens)
        expectedBalance = 500;
      }
      
      // Scan the actual ranges where MULTIBALL tokens exist (user confirmed range: 231014-283553)
      const scanRanges = [
        { start: 231000, end: 235000, name: "Token range 231k-235k" },
        { start: 235001, end: 240000, name: "Token range 235k-240k" },
        { start: 240001, end: 245000, name: "Token range 240k-245k" },
        { start: 245001, end: 250000, name: "Token range 245k-250k" },
        { start: 250001, end: 255000, name: "Token range 250k-255k" },
        { start: 255001, end: 260000, name: "Token range 255k-260k" },
        { start: 260001, end: 265000, name: "Token range 260k-265k" },
        { start: 265001, end: 270000, name: "Token range 265k-270k" },
        { start: 270001, end: 275000, name: "Token range 270k-275k" },
        { start: 275001, end: 280000, name: "Token range 275k-280k" },
        { start: 280001, end: 284000, name: "Token range 280k-284k" }
      ];
      
      let totalFound = 0;
      
      for (const range of scanRanges) {
        this.log(`🔍 Scanning ${range.name}...`);
        let rangeFound = 0;
        
        // Use larger batches for faster scanning of the 53k range
        const batchSize = 100;
        for (let batchStart = range.start; batchStart <= range.end; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize - 1, range.end);
          
          // Process batch in parallel for speed
          const batchPromises = [];
          for (let tokenId = batchStart; tokenId <= batchEnd; tokenId++) {
            batchPromises.push(
              this.contract.ownerOf(tokenId)
                .then(owner => ({ tokenId, owner, success: true }))
                .catch(error => ({ tokenId, owner: null, success: false }))
            );
          }
          
          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises);
          
          // Process results
          let batchFound = 0;
          for (const result of batchResults) {
            if (result.success && result.owner && 
                result.owner.toLowerCase() === walletAddress.toLowerCase()) {
              ownedTokens.push(result.tokenId);
              rangeFound++;
              totalFound++;
              batchFound++;
            }
          }
          
          // Log progress every batch if tokens found
          if (batchFound > 0) {
            this.log(`📦 Found ${batchFound} tokens in batch ${batchStart}-${batchEnd} (total: ${totalFound})`);
          }
          
          // Reduce delay for faster scanning
          await new Promise(resolve => setTimeout(resolve, 25));
          
          // Progress update every 500 tokens
          if (batchStart % 500 === 0) {
            const progressPercent = ((batchStart - range.start) / (range.end - range.start) * 100).toFixed(1);
            this.log(`🔍 Scanned up to token ${batchStart}... (${progressPercent}% of ${range.name}, found ${totalFound} so far)`);
          }
          
          // If we found what we expect, we can stop early
          if (expectedBalance > 0 && totalFound >= expectedBalance) {
            this.log(`✅ Found expected ${expectedBalance} tokens, stopping scan`);
            break;
          }
        }
        
        this.log(`📦 Found ${rangeFound} tokens in ${range.name} (total: ${totalFound})`);
        
        // If we found enough tokens, stop scanning ranges
        if (expectedBalance > 0 && totalFound >= expectedBalance) {
          break;
        }
      }
      
      this.log(`✅ Token scan complete: Found ${ownedTokens.length} MULTIBALL tokens`);
      
      if (ownedTokens.length > 0) {
        this.log(`📋 Sample token IDs: [${ownedTokens.slice(0, 10).join(', ')}]${ownedTokens.length > 10 ? '...' : ''}`);
      }
      
      if (expectedBalance > 0 && ownedTokens.length !== expectedBalance && ownedTokens.length > 0) {
        this.log(`⚠️  Found ${ownedTokens.length} tokens but expected ${expectedBalance}`, 'warning');
      }
      
      return ownedTokens;
      
    } catch (error) {
      this.log(`❌ Token scanning failed: ${error.message}`, 'error');
      throw error; // Re-throw so caller knows scanning completely failed
    }
  }

  // Basic fallback scanning method - tries a small range to test if contract is working
  async basicTokenScan() {
    const ownedTokens = [];
    const walletAddress = this.walletManager.getWallet().address;
    
    try {
      this.log('🔍 Basic token scan: checking recent token range...', 'info');
      
      // Check the confirmed range where MULTIBALL tokens exist (user provided: 231014-283553)
      const startRange = 231000;
      const endRange = 284000;
      
      for (let tokenId = startRange; tokenId <= endRange; tokenId++) {
        try {
          const owner = await this.contract.ownerOf(tokenId);
          
          if (owner && owner.toLowerCase() === walletAddress.toLowerCase()) {
            ownedTokens.push(tokenId);
            
            // Log every 50 found tokens
            if (ownedTokens.length % 50 === 0) {
              this.log(`📦 Basic scan found ${ownedTokens.length} tokens so far...`);
            }
          }
        } catch (error) {
          // Token doesn't exist or error - continue
          continue;
        }
        
        // Small delay to avoid overwhelming the RPC
        if (tokenId % 25 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      this.log(`✅ Basic scan complete: Found ${ownedTokens.length} MULTIBALL tokens in range ${startRange}-${endRange}`);
      
      if (ownedTokens.length > 0) {
        this.log(`📋 Found token IDs: [${ownedTokens.slice(0, 10).join(', ')}]${ownedTokens.length > 10 ? '...' : ''}`);
      } else {
        this.log(`⚠️  No tokens found in basic scan - contract may not be working properly`, 'warning');
      }
      
      return ownedTokens;
      
    } catch (error) {
      this.log(`❌ Basic token scan failed: ${error.message}`, 'error');
      return [];
    }
  }

  async checkSpinStatus(tokenIds) {
    const spinStatus = [];
    
    this.log(`🔄 Checking spin status for ${tokenIds.length} tokens...`);
    
    for (const tokenId of tokenIds) {
      try {
        // Check if token has been spun
        const hasSpun = await this.contract.hasBeenSpun(tokenId);
        
        let spinResult = null;
        if (hasSpun) {
          try {
            spinResult = await this.contract.getSpinResult(tokenId);
          } catch (error) {
            this.log(`Could not get spin result for token ${tokenId}`);
          }
        }
        
        spinStatus.push({
          tokenId,
          hasSpun,
          spinResult: spinResult ? {
            prize: Number(spinResult.prize || spinResult[0]),
            claimed: spinResult.claimed || spinResult[1]
          } : null
        });
        
      } catch (error) {
        console.log(`Error checking spin status for token ${tokenId}: ${error.message}`);
        spinStatus.push({
          tokenId,
          hasSpun: false,
          spinResult: null,
          error: error.message
        });
      }
    }
    
    return spinStatus;
  }

  // Get cached token data (non-blocking)
  getCachedTokensStatus() {
    return {
      ...this.tokenCache,
      isScanning: this.tokenCache.isScanning,
      lastUpdate: this.tokenCache.lastUpdate
    };
  }

  // Start background token scanning (non-blocking)
  async startBackgroundTokenScan() {
    if (this.tokenCache.isScanning) {
      this.log('🔄 Token scan already in progress', 'info');
      return;
    }

    // Check if database already has tokens - skip scanning if so
    if (this.tokenDb) {
      const localTokens = this.getOwnedTokensInstant();
      if (localTokens.length > 0) {
        this.log(`💾 Using existing ${localTokens.length} tokens from database - no scan needed`, 'info');
        this.tokenCache.tokens = localTokens;
        this.tokenCache.stats = { totalTokens: localTokens.length, unspun: localTokens.length, spun: 0, claimable: 0, claimed: 0, errors: 0 };
        this.tokenCache.lastUpdate = new Date();
        this.tokenCache.isScanning = false;
        return;
      }
    }

    // Database is empty - mint tracking will handle future tokens automatically
    this.log('💾 Database empty - tokens will be tracked automatically when minted', 'info');
    this.tokenCache.tokens = [];
    this.tokenCache.stats = { totalTokens: 0, unspun: 0, spun: 0, claimable: 0, claimed: 0, errors: 0 };
    this.tokenCache.lastUpdate = new Date();
    this.tokenCache.isScanning = false;
  }

  // Get comprehensive token statistics (Prize Ticket conversion model)
  async getTokensStatus() {
    try {
      const tokens = await this.getOwnedTokens();
      
      // For Prize Ticket conversion model: all tokens are available for conversion
      const stats = {
        totalTokens: tokens.length,
        unspun: tokens.length, // All tokens are ready for conversion
        spun: 0,
        claimable: 0,
        claimed: 0,
        errors: 0
      };
      
      const unspunTokens = [...tokens]; // All tokens available for conversion
      const claimableTokens = [];
      const claimedTokens = [];
      
      this.log(`📊 Token Status Summary:`, 'info');
      this.log(`   Total MULTIBALL tokens: ${stats.totalTokens}`, 'info');
      this.log(`   🎲 Ready for conversion: ${stats.unspun}`, 'info');
      this.log(`   🎟️  Possible Prize Tickets: ${Math.floor(stats.totalTokens / 10)}`, 'info');
      
      return {
        tokens,
        spinStatus: [], // No longer needed for Prize Ticket model
        stats,
        unspunTokens,
        claimableTokens,
        claimedTokens
      };
    } catch (error) {
      this.log(`❌ Error getting token status: ${error.message}`, 'error');
      return {
        tokens: [],
        spinStatus: [],
        stats: { totalTokens: 0, unspun: 0, spun: 0, claimable: 0, claimed: 0, errors: 1 },
        unspunTokens: [],
        claimableTokens: [],
        claimedTokens: []
      };
    }
  }

  // Convert a single group of 10 MULTIBALL tokens into 1 Prize Ticket using SecretSanta contract
  async convertSingleGroup(multiballTokenIds) {
    if (multiballTokenIds.length !== 10) {
      return {
        success: false,
        error: `Expected 10 MULTIBALL tokens, got ${multiballTokenIds.length}`,
        burnedTokens: [],
        prizeTicketMinted: false
      };
    }

    try {
      this.log(`🎲 Converting group: [${multiballTokenIds.slice(0, 3).join(', ')}...${multiballTokenIds.slice(-2).join(', ')}]`);

      // STEP 1: Check if SecretSanta contract is approved to transfer our MULTIBALL tokens
      this.log(`🔐 Checking approval for SecretSanta contract...`);
      
      try {
        const isApprovedForAll = await this.contract.isApprovedForAll(
          this.walletManager.getWallet().address,
          config.secretSantaAddress
        );
        
        if (!isApprovedForAll) {
          this.log(`🔑 Approving SecretSanta contract to handle MULTIBALL tokens...`);
          const approvalTx = await this.contract.setApprovalForAll(config.secretSantaAddress, true);
          await approvalTx.wait();
          this.log(`✅ SecretSanta contract approved!`, 'success');
        } else {
          this.log(`✅ SecretSanta contract already approved`);
        }
      } catch (error) {
        this.log(`⚠️  Could not check/set approval: ${error.message}`);
      }

      // STEP 2: Use SecretSanta swapForPrize function - the ACTUAL conversion mechanism
      this.log(`🎯 Using SecretSanta swapForPrize function with 10 MULTIBALL token IDs`);
      this.log(`📋 Converting MULTIBALL NFTs: [${multiballTokenIds.slice(0, 3).join(', ')}...${multiballTokenIds.slice(-2).join(', ')}]`);
      
      // STEP 3: Call SecretSanta swapForPrize function with MULTIBALL token IDs
      this.log(`🎯 Calling SecretSanta swapForPrize with BallType.Multi...`);
      
      try {
        // Call swapForPrize(BallType.Multi, tokenIds[], traceId)
        const traceId = 0; // Optional trace ID, can be 0
        
        const txOptions = {
          gasLimit: BigInt(800000) // Higher gas limit for complex function
        };
        
        this.log(`📤 Sending swapForPrize transaction...`);
        const transaction = await this.secretSantaContract.swapForPrize(
          BallType.Multi,    // BallType.Multi = 2
          multiballTokenIds, // Array of 10 token IDs
          traceId,           // Trace ID (0)
          txOptions
        );
        
        this.log(`📤 Transaction sent: ${transaction.hash}`);
        this.log(`⏳ Waiting for confirmation...`);
        
        // Wait for confirmation
        const receipt = await transaction.wait();
        
        if (receipt.status === 1) {
          this.log(`✅ SecretSanta swapForPrize successful!`, 'success');
          this.log(`🎫 Transaction: ${receipt.transactionHash}`);
          this.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
          this.log(`🎲 VRF request created - Prize Ticket will be assigned via callback`);
          
          // Update local database
          if (this.tokenDb) {
            this.tokenDb.removeBurnedTokens(multiballTokenIds, 'secret_santa_swap');
            this.log(`🔥 Removed 10 burned tokens from local database`, 'success');
          }
          
          return {
            success: true,
            txHash: receipt.transactionHash,
            gasUsed: receipt.gasUsed.toString(),
            burnedTokens: multiballTokenIds,
            prizeTicketMinted: true,
            method: 'SecretSanta.swapForPrize'
          };
        } else {
          throw new Error(`Transaction failed with status: ${receipt.status}`);
        }
        
      } catch (error) {
        this.log(`❌ SecretSanta swapForPrize failed: ${error.message}`, 'error');
        throw new Error(`SecretSanta conversion failed: ${error.message}`);
      }

    } catch (error) {
      this.log(`❌ Failed to convert group: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        burnedTokens: [],
        prizeTicketMinted: false
      };
    }
  }

  // Get owned Prize Ticket NFTs
  async getOwnedPrizeTickets() {
    try {
      const walletAddress = this.walletManager.getWallet().address;
      this.log(`🎫 Fetching Prize Ticket NFTs owned by ${walletAddress}...`);

      // Try to get prize tickets using enumerable function
      try {
        const tickets = await this.prizeTicketContract.tokensOfOwner(walletAddress);
        const ticketIds = tickets.map(ticket => Number(ticket));
        this.log(`✅ Found ${tickets.length} Prize Ticket NFTs`, 'success');
        return ticketIds;
      } catch (error) {
        this.log(`⚠️  tokensOfOwner not available on Prize Ticket contract: ${error.message}`);
        
        // Fallback: use balance and scan
        const balance = await this.prizeTicketContract.balanceOf(walletAddress);
        this.log(`📊 Prize Ticket balance: ${balance}`);
        
        // For now, return empty array - we'll need to implement scanning if needed
        return [];
      }
    } catch (error) {
      this.log(`❌ Failed to get Prize Tickets: ${error.message}`, 'error');
      return [];
    }
  }

  // Process MULTIBALL tokens in groups of 10 for Prize Ticket conversion
  async processBallsForPrizeTickets(testMode = false) {
    try {
      if (testMode) {
        this.log('🧪 TEST MODE: Simulating MULTIBALL → Prize Ticket conversion...', 'info');
      } else {
        this.log('🚀 LIVE MODE: Starting MULTIBALL → Prize Ticket conversion...', 'warning');
      }
      
      // Get conversion data from local database (instant, automated selection)
      const conversionData = this.getTokensForConversion();
      
      if (conversionData.availableTokens === 0) {
        this.log('❌ No MULTIBALL tokens found in local database');
        this.log('💡 Tip: If you have tokens, run a token scan to initialize the database');
        return { success: false, message: 'No MULTIBALL tokens found in local database' };
      }

      this.log(`📦 Found ${conversionData.availableTokens} MULTIBALL tokens in local database`);
      this.log(`🎯 Ready for conversion: ${conversionData.possibleConversions} groups of 10`);
      this.log(`🔢 Remaining tokens: ${conversionData.remainingTokens}`);

      // SAFETY CHECK: Verify reasonable token count
      if (conversionData.availableTokens < 10) {
        this.log(`⚠️  WARNING: Only ${conversionData.availableTokens} tokens available, need at least 10 for conversion`, 'warning');
        return {
          success: false,
          error: `Insufficient tokens for conversion: have ${conversionData.availableTokens}, need at least 10`,
          availableTokens: conversionData.availableTokens
        };
      }

      const groups = conversionData.conversionGroups;
      const remainingTokens = conversionData.remainingTokens;
      this.log(`🎲 Can convert ${groups.length} groups of 10 balls (${remainingTokens} tokens remaining)`);

      if (groups.length === 0) {
        this.log('⚠️  Need at least 10 MULTIBALL tokens to create a Prize Ticket');
        return { 
          success: false, 
          message: `Need at least 10 tokens, have ${multiballTokens.length}`,
          remainingTokens: multiballTokens.length
        };
      }

      // TEST MODE: Just return the plan without executing
      if (testMode) {
        this.log('🧪 TEST MODE: Would convert the following groups:', 'info');
        groups.slice(0, 3).forEach((group, i) => {
          this.log(`   Group ${i + 1}: [${group.join(', ')}]`, 'info');
        });
        if (groups.length > 3) {
          this.log(`   ... and ${groups.length - 3} more groups`, 'info');
        }
        
        return {
          success: true,
          testMode: true,
          conversions: 0,
          plannedConversions: groups.length,
          totalPrizeTickets: 0,
          plannedPrizeTickets: groups.length,
          remainingMultiballs: remainingTokens,
          multiballTokens: multiballTokens.length,
          results: []
        };
      }

      // LIVE MODE: Actual conversion with final confirmation
      this.log('🚨 FINAL WARNING: About to burn MULTIBALL tokens for Prize Tickets!', 'warning');
      this.log(`   Will burn: ${groups.length * 10} MULTIBALL tokens`, 'warning');
      this.log(`   Will create: ${groups.length} Prize Tickets`, 'warning');
      this.log(`   This action cannot be undone!`, 'warning');

      // Process each group ONE AT A TIME with delays
      const results = [];
      for (let i = 0; i < groups.length; i++) {
        this.log(`🎯 Processing conversion ${i + 1}/${groups.length}...`);
        
        const result = await this.convertSingleGroup(groups[i]);
        results.push(result);

        if (!result.success) {
          this.log(`❌ Conversion ${i + 1} failed: ${result.error}`, 'error');
          this.log(`🛑 Stopping conversion process to prevent further token loss`, 'warning');
          break;
        }

        this.log(`✅ Conversion ${i + 1} completed successfully!`, 'success');

        // Add delay between conversions (similar to minting)
        if (i < groups.length - 1) {
          this.log('⏳ Waiting 3 seconds before next conversion...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      const successfulConversions = results.filter(r => r.success).length;
      const totalPrizeTickets = successfulConversions;

      return {
        success: successfulConversions > 0,
        conversions: successfulConversions,
        totalPrizeTickets: totalPrizeTickets,
        remainingMultiballs: remainingTokens + (groups.length - successfulConversions) * 10,
        results: results
      };

    } catch (error) {
      this.log(`❌ Prize ticket conversion process failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  async spinToken(tokenId) {
    try {
      console.log(`🎲 Spinning token ${tokenId}...`);
      
      // Try different spin function names
      const spinFunctions = ['spin', 'spinToken', 'spinBall'];
      let transaction = null;
      let usedFunction = null;
      
      for (const funcName of spinFunctions) {
        try {
          console.log(`Trying ${funcName} function...`);
          
          const txMethod = this.contract[funcName](tokenId);
          const gasEstimate = await this.walletManager.estimateGas(txMethod);
          
          const txOptions = {
            gasLimit: gasEstimate + BigInt(50000),
            maxFeePerGas: ethers.parseUnits(config.maxFeePerGas, 'wei'),
            maxPriorityFeePerGas: ethers.parseUnits(config.maxPriorityFeePerGas, 'wei')
          };
          
          transaction = await this.contract[funcName](tokenId, txOptions);
          usedFunction = funcName;
          break;
          
        } catch (error) {
          console.log(`${funcName} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!transaction) {
        throw new Error('All spin functions failed');
      }
      
      console.log(`Transaction sent using ${usedFunction}: ${transaction.hash}`);
      
      const receipt = await transaction.wait();
      
      if (receipt.status === 1) {
        console.log(`✅ Token ${tokenId} spun successfully!`);
        
        // Try to get the spin result
        let spinResult = null;
        try {
          await RetryHelper.sleep(2000); // Wait for state update
          const result = await this.contract.getSpinResult(tokenId);
          spinResult = {
            prize: Number(result.prize || result[0]),
            claimed: result.claimed || result[1]
          };
          console.log(`🎁 Spin result: Prize ${spinResult.prize}, Claimed: ${spinResult.claimed}`);
        } catch (error) {
          console.log('Could not fetch spin result immediately');
        }
        
        return {
          success: true,
          tokenId,
          txHash: receipt.transactionHash,
          gasUsed: receipt.gasUsed.toString(),
          spinResult
        };
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error) {
      console.error(`❌ Failed to spin token ${tokenId}: ${error.message}`);
      return {
        success: false,
        tokenId,
        error: error.message
      };
    }
  }

  async batchSpin(tokenIds) {
    console.log(`🎰 Starting batch spin for ${tokenIds.length} tokens...`);
    
    // First, try batch spin function if available
    try {
      console.log('Attempting batch spin transaction...');
      
      const txMethod = this.contract.batchSpin(tokenIds);
      const gasEstimate = await this.walletManager.estimateGas(txMethod);
      
      const txOptions = {
        gasLimit: gasEstimate + BigInt(100000),
        maxFeePerGas: ethers.parseUnits(config.maxFeePerGas, 'wei'),
        maxPriorityFeePerGas: ethers.parseUnits(config.maxPriorityFeePerGas, 'wei')
      };
      
      const transaction = await this.contract.batchSpin(tokenIds, txOptions);
      console.log(`Batch spin transaction sent: ${transaction.hash}`);
      
      const receipt = await transaction.wait();
      
      if (receipt.status === 1) {
        console.log(`✅ Batch spin successful for all ${tokenIds.length} tokens!`);
        return {
          success: true,
          method: 'batch',
          tokenIds,
          txHash: receipt.transactionHash,
          gasUsed: receipt.gasUsed.toString()
        };
      }
      
    } catch (error) {
      console.log(`Batch spin failed, falling back to individual spins: ${error.message}`);
    }
    
    // Fallback to individual spins
    const results = [];
    for (const tokenId of tokenIds) {
      const result = await this.spinToken(tokenId);
      results.push(result);
      
      // Small delay between spins
      if (tokenIds.indexOf(tokenId) < tokenIds.length - 1) {
        await RetryHelper.sleep(2000);
      }
    }
    
    return {
      success: true,
      method: 'individual',
      results
    };
  }

  async claimPrize(tokenId) {
    try {
      console.log(`🏆 Claiming prize for token ${tokenId}...`);
      
      const claimFunctions = ['claim', 'claimPrize', 'claimReward'];
      let transaction = null;
      let usedFunction = null;
      
      for (const funcName of claimFunctions) {
        try {
          console.log(`Trying ${funcName} function...`);
          
          const txMethod = this.contract[funcName](tokenId);
          const gasEstimate = await this.walletManager.estimateGas(txMethod);
          
          const txOptions = {
            gasLimit: gasEstimate + BigInt(50000),
            maxFeePerGas: ethers.parseUnits(config.maxFeePerGas, 'wei'),
            maxPriorityFeePerGas: ethers.parseUnits(config.maxPriorityFeePerGas, 'wei')
          };
          
          transaction = await this.contract[funcName](tokenId, txOptions);
          usedFunction = funcName;
          break;
          
        } catch (error) {
          console.log(`${funcName} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!transaction) {
        throw new Error('All claim functions failed');
      }
      
      console.log(`Claim transaction sent using ${usedFunction}: ${transaction.hash}`);
      
      const receipt = await transaction.wait();
      
      if (receipt.status === 1) {
        console.log(`✅ Prize claimed for token ${tokenId}!`);
        return {
          success: true,
          tokenId,
          txHash: receipt.transactionHash,
          gasUsed: receipt.gasUsed.toString()
        };
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error) {
      console.error(`❌ Failed to claim prize for token ${tokenId}: ${error.message}`);
      return {
        success: false,
        tokenId,
        error: error.message
      };
    }
  }

  // NEW: Auto-process MULTIBALL tokens (convert to Prize Tickets)
  async autoSpinAndClaim() {
    try {
      this.log('🚀 Starting auto-conversion: MULTIBALL tokens → Prize Tickets...');
      
      // Step 1: Get current MULTIBALL tokens
      const multiballTokens = await this.getOwnedTokens();
      if (multiballTokens.length === 0) {
        this.log('❌ No MULTIBALL tokens found in wallet');
        return { success: false, message: 'No MULTIBALL tokens found' };
      }
      
      this.log(`📦 Found ${multiballTokens.length} MULTIBALL tokens`);
      
      // Step 2: Convert MULTIBALL tokens to Prize Tickets (groups of 10)
      const conversionResult = await this.processBallsForPrizeTickets();
      
      // Step 3: Get Prize Tickets after conversion
      const prizeTickets = await this.getOwnedPrizeTickets();
      
      const results = {
        multiballTokens: {
          found: multiballTokens.length,
          processed: (conversionResult.conversions || 0) * 10,
          remaining: conversionResult.remainingMultiballs || multiballTokens.length
        },
        prizeTickets: {
          created: conversionResult.totalPrizeTickets || 0,
          total: prizeTickets.length
        },
        conversions: conversionResult.results || [],
        summary: {
          success: conversionResult.success || false,
          message: conversionResult.message || 'Conversion completed'
        }
      };
      
      this.log('\n📊 Auto-Conversion Summary:');
      this.log(`   MULTIBALL tokens found: ${results.multiballTokens.found}`);
      this.log(`   MULTIBALL tokens processed: ${results.multiballTokens.processed}`);
      this.log(`   MULTIBALL tokens remaining: ${results.multiballTokens.remaining}`);
      this.log(`   Prize Tickets created: ${results.prizeTickets.created}`);
      this.log(`   Total Prize Tickets owned: ${results.prizeTickets.total}`);
      
      return {
        success: conversionResult.success || false,
        results
      };
      
    } catch (error) {
      this.log(`❌ Auto-conversion failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }
}