import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TokenDatabase {
  constructor(walletAddress) {
    this.walletAddress = walletAddress.toLowerCase();
    this.dbDir = path.join(__dirname, '../.token-db');
    this.dbFile = path.join(this.dbDir, `${this.walletAddress}.json`);
    this.ensureDbExists();
  }

  ensureDbExists() {
    // Create database directory if it doesn't exist
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
    }

    // Create user's token file if it doesn't exist
    if (!fs.existsSync(this.dbFile)) {
      const initialData = {
        walletAddress: this.walletAddress,
        tokens: [],
        lastUpdated: new Date().toISOString(),
        totalTokens: 0,
        mintHistory: []
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(initialData, null, 2));
    }
  }

  // Load user's token data from local database
  loadTokenData() {
    try {
      const data = fs.readFileSync(this.dbFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Failed to load token data: ${error.message}`);
      return { tokens: [], mintHistory: [], totalTokens: 0 };
    }
  }

  // Save user's token data to local database
  saveTokenData(data) {
    try {
      data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.dbFile, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Failed to save token data: ${error.message}`);
      return false;
    }
  }

  // Add newly minted tokens to user's database
  addMintedTokens(tokenIds, txHash, mintTimestamp = null) {
    const data = this.loadTokenData();
    const timestamp = mintTimestamp || new Date().toISOString();

    // Add tokens to the user's collection
    for (const tokenId of tokenIds) {
      if (!data.tokens.includes(tokenId)) {
        data.tokens.push(tokenId);
      }
    }

    // Add to mint history
    data.mintHistory.push({
      timestamp,
      txHash,
      tokenIds: [...tokenIds],
      quantity: tokenIds.length
    });

    // Update stats
    data.totalTokens = data.tokens.length;
    
    // Sort tokens for easier management
    data.tokens.sort((a, b) => a - b);

    this.saveTokenData(data);
    console.log(`📝 Added ${tokenIds.length} tokens to local database for ${this.walletAddress}`);
    
    return data;
  }

  // Remove tokens that were burned/converted
  removeBurnedTokens(tokenIds, operation = 'burn') {
    const data = this.loadTokenData();
    const timestamp = new Date().toISOString();

    // Remove tokens from collection
    const initialCount = data.tokens.length;
    data.tokens = data.tokens.filter(tokenId => !tokenIds.includes(tokenId));
    const removedCount = initialCount - data.tokens.length;

    // Add to burn history
    if (!data.burnHistory) data.burnHistory = [];
    data.burnHistory.push({
      timestamp,
      operation,
      tokenIds: [...tokenIds],
      quantity: tokenIds.length,
      actuallyRemoved: removedCount
    });

    data.totalTokens = data.tokens.length;
    this.saveTokenData(data);
    
    console.log(`🔥 Removed ${removedCount} tokens from local database for ${this.walletAddress}`);
    return data;
  }

  // Get user's tokens instantly from local database (no blockchain scan needed)
  getUserTokens() {
    const data = this.loadTokenData();
    return {
      tokens: data.tokens || [],
      totalTokens: data.totalTokens || 0,
      lastUpdated: data.lastUpdated,
      mintHistory: data.mintHistory || [],
      burnHistory: data.burnHistory || []
    };
  }

  // Get tokens available for conversion (groups of 10)
  getTokensForConversion() {
    const data = this.loadTokenData();
    const tokens = data.tokens || [];
    
    const groups = [];
    for (let i = 0; i < tokens.length; i += 10) {
      const group = tokens.slice(i, i + 10);
      if (group.length === 10) {
        groups.push(group);
      }
    }

    return {
      availableTokens: tokens.length,
      completeGroups: groups.length,
      possibleConversions: groups.length,
      remainingTokens: tokens.length % 10,
      conversionGroups: groups
    };
  }

  // Validate local database against blockchain (optional sync check)
  async validateAgainstBlockchain(contract) {
    try {
      console.log(`🔍 Validating local database against blockchain for ${this.walletAddress}...`);
      
      const localData = this.loadTokenData();
      const localTokens = new Set(localData.tokens);
      
      // Check a sample of local tokens to ensure they're still owned
      const sampleSize = Math.min(localTokens.size, 10);
      const sampleTokens = Array.from(localTokens).slice(0, sampleSize);
      
      let validCount = 0;
      for (const tokenId of sampleTokens) {
        try {
          const owner = await contract.ownerOf(tokenId);
          if (owner.toLowerCase() === this.walletAddress) {
            validCount++;
          }
        } catch (error) {
          console.log(`⚠️  Token ${tokenId} validation failed: ${error.message}`);
        }
      }

      const validationRate = sampleSize > 0 ? (validCount / sampleSize) * 100 : 100;
      console.log(`✅ Local database validation: ${validCount}/${sampleSize} tokens confirmed (${validationRate.toFixed(1)}%)`);
      
      return {
        isValid: validationRate >= 90, // Consider valid if 90%+ of sampled tokens are correct
        validationRate,
        sampleSize,
        validTokens: validCount
      };
    } catch (error) {
      console.error(`❌ Database validation failed: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }

  // Initialize database from existing blockchain scan (one-time setup)
  async initializeFromScan(tokens) {
    const data = this.loadTokenData();
    
    // Only add tokens that aren't already in the database
    const newTokens = tokens.filter(tokenId => !data.tokens.includes(tokenId));
    
    if (newTokens.length > 0) {
      data.tokens.push(...newTokens);
      data.tokens.sort((a, b) => a - b);
      data.totalTokens = data.tokens.length;
      
      // Mark as initial scan
      if (!data.initializationHistory) data.initializationHistory = [];
      data.initializationHistory.push({
        timestamp: new Date().toISOString(),
        method: 'blockchain_scan',
        tokensFound: tokens.length,
        newTokensAdded: newTokens.length
      });

      this.saveTokenData(data);
      console.log(`🚀 Initialized database with ${newTokens.length} new tokens from blockchain scan`);
    }

    return data;
  }

  // Clear all token data and force a fresh scan
  clearDatabase() {
    const timestamp = new Date().toISOString();
    const initialData = {
      walletAddress: this.walletAddress,
      tokens: [],
      lastUpdated: timestamp,
      totalTokens: 0,
      mintHistory: [],
      burnHistory: [{
        timestamp,
        operation: 'database_reset',
        tokenIds: [],
        quantity: 0,
        reason: 'Manual database clear for resync'
      }]
    };
    
    this.saveTokenData(initialData);
    console.log(`🔄 Token database cleared for ${this.walletAddress}. Please run a fresh token scan.`);
    return true;
  }

  // Get database stats for debugging
  getDatabaseStats() {
    const data = this.loadTokenData();
    return {
      totalTokens: data.totalTokens || 0,
      actualTokenCount: data.tokens ? data.tokens.length : 0,
      lastUpdated: data.lastUpdated,
      mintHistory: data.mintHistory ? data.mintHistory.length : 0,
      burnHistory: data.burnHistory ? data.burnHistory.length : 0,
      recentBurns: data.burnHistory ? data.burnHistory.slice(-5) : [],
      currentTokens: data.tokens || []
    };
  }

  // Quick sync with blockchain balance (single RPC call, no intensive scanning)
  async quickSyncWithBalance(contract) {
    try {
      console.log(`⚡ Quick balance sync for ${this.walletAddress}...`);
      
      // Get actual balance from blockchain (single RPC call)
      const balance = await contract.balanceOf(this.walletAddress);
      const actualBalance = Number(balance);
      
      const data = this.loadTokenData();
      const databaseBalance = data.totalTokens || 0;
      
      console.log(`📊 Balance check: Database=${databaseBalance}, Blockchain=${actualBalance}`);
      
      if (actualBalance === 0 && databaseBalance > 0) {
        // User has 0 tokens on blockchain but database shows tokens - clear it
        console.log(`🧹 Clearing database: Blockchain shows 0 tokens, database has ${databaseBalance}`);
        data.tokens = [];
        data.totalTokens = 0;
        data.burnHistory = data.burnHistory || [];
        data.burnHistory.push({
          timestamp: new Date().toISOString(),
          operation: 'balance_sync_clear',
          tokenIds: [],
          quantity: databaseBalance,
          reason: `Database had ${databaseBalance} tokens but blockchain balance is 0`
        });
        this.saveTokenData(data);
        return { synced: true, cleared: databaseBalance, newBalance: 0 };
      }
      
      if (actualBalance === databaseBalance) {
        console.log(`✅ Database in sync with blockchain`);
        return { synced: true, cleared: 0, newBalance: actualBalance };
      }
      
      return { 
        synced: false, 
        databaseBalance, 
        actualBalance,
        message: 'Balance mismatch - may need token scan to identify specific tokens'
      };
      
    } catch (error) {
      console.error(`❌ Quick balance sync failed: ${error.message}`);
      return { error: error.message };
    }
  }
}