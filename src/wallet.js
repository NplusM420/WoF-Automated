import { ethers } from 'ethers';
import { config } from './config.js';
import { SecureKeyManager, SecurityValidator } from './security.js';

export class WalletManager {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.keyManager = new SecureKeyManager();
  }

  async initialize(encryptionPassword = null) {
    try {
      // Create provider for ApeChain
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl, {
        chainId: config.chainId,
        name: 'ApeChain'
      });

      // Try to get private key securely
      let privateKey = await this.getPrivateKeySecurely(encryptionPassword);
      
      if (!privateKey) {
        throw new Error('No private key available. Please run secure setup or set PRIVATE_KEY in .env file');
      }

      // Validate private key before using
      privateKey = SecurityValidator.validatePrivateKey(privateKey);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      
      console.log(`Wallet connected: ${this.wallet.address}`);
      
      // Check wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log(`Wallet balance: ${ethers.formatEther(balance)} APE`);

      return true;
    } catch (error) {
      console.error('Failed to initialize wallet:', error.message);
      return false;
    }
  }

  async getBalance() {
    if (!this.provider || !this.wallet) {
      throw new Error('Wallet not initialized');
    }
    
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  async estimateGas(txMethod) {
    try {
      // Handle both contract method calls and prepared transactions
      let gasEstimate;
      if (typeof txMethod.estimateGas === 'function') {
        gasEstimate = await txMethod.estimateGas();
      } else if (txMethod.transaction) {
        gasEstimate = await this.provider.estimateGas(txMethod.transaction);
      } else {
        throw new Error('Invalid transaction method for gas estimation');
      }
      return gasEstimate;
    } catch (error) {
      console.error('Gas estimation failed:', error.message);
      return BigInt(config.gasLimit);
    }
  }

  async getPrivateKeySecurely(encryptionPassword = null) {
    try {
      // First, try encrypted storage
      if (this.keyManager.hasEncryptedKey()) {
        if (!encryptionPassword) {
          throw new Error('Encrypted key found but no password provided. Use secure mode or provide password.');
        }
        console.log('🔐 Using encrypted private key storage');
        this.keyManager.auditLog('KEY_ACCESSED');
        return await this.keyManager.loadEncryptedKey(encryptionPassword);
      }
      
      // Fallback to environment variable (with warnings)
      if (config.privateKey) {
        const warnings = SecurityValidator.checkEnvironmentSecurity();
        if (warnings.length > 0) {
          console.warn('⚠️  Security warnings detected:');
          warnings.forEach(warning => console.warn(`   ${warning}`));
          console.warn('   Consider using encrypted storage: node src/secure-setup.js setup');
        }
        console.log('🔓 Using private key from environment variable');
        return config.privateKey;
      }
      
      return null;
    } catch (error) {
      throw new Error(`Failed to retrieve private key: ${error.message}`);
    }
  }

  // Memory clearing for security
  clearSensitiveData() {
    if (this.wallet && this.wallet.privateKey) {
      // Overwrite private key in memory (best effort)
      const key = this.wallet.privateKey;
      for (let i = 0; i < key.length; i++) {
        key[i] = 0;
      }
    }
  }

  getWallet() {
    return this.wallet;
  }

  getProvider() {
    return this.provider;
  }
}