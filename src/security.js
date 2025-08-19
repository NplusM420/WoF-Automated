import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SecureKeyManager {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyDir = path.join(__dirname, '..', '.secure');
    this.ensureSecureDir();
  }

  ensureSecureDir() {
    if (!fs.existsSync(this.keyDir)) {
      fs.mkdirSync(this.keyDir, { mode: 0o700 }); // Only owner can read/write/execute
    }
  }

  // Generate a strong encryption key from a password
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  // Encrypt private key with password
  encryptPrivateKey(privateKey, password) {
    try {
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(16);
      const key = this.deriveKey(password, salt);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      let encrypted = cipher.update(privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const encryptedData = {
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        encrypted: encrypted,
        algorithm: this.algorithm
      };
      
      return JSON.stringify(encryptedData);
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt private key with password
  decryptPrivateKey(encryptedData, password) {
    try {
      const data = JSON.parse(encryptedData);
      const salt = Buffer.from(data.salt, 'hex');
      const iv = Buffer.from(data.iv, 'hex');
      const key = this.deriveKey(password, salt);
      
      const decipher = crypto.createDecipheriv(data.algorithm || this.algorithm, key, iv);
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: Invalid password or corrupted data`);
    }
  }

  // Store encrypted private key
  async storeEncryptedKey(privateKey, password, walletName = 'default') {
    const encryptedData = this.encryptPrivateKey(privateKey, password);
    const filePath = path.join(this.keyDir, `${walletName}.enc`);
    
    fs.writeFileSync(filePath, encryptedData, { mode: 0o600 }); // Only owner can read/write
    
    console.log(`✅ Private key encrypted and stored securely at: ${filePath}`);
    return filePath;
  }

  // Load and decrypt private key
  async loadEncryptedKey(password, walletName = 'default') {
    const filePath = path.join(this.keyDir, `${walletName}.enc`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Encrypted key file not found: ${filePath}`);
    }
    
    const encryptedData = fs.readFileSync(filePath, 'utf8');
    return this.decryptPrivateKey(encryptedData, password);
  }

  // Check if encrypted key exists
  hasEncryptedKey(walletName = 'default') {
    const filePath = path.join(this.keyDir, `${walletName}.enc`);
    return fs.existsSync(filePath);
  }

  // Delete encrypted key
  deleteEncryptedKey(walletName = 'default') {
    const filePath = path.join(this.keyDir, `${walletName}.enc`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Encrypted key deleted: ${filePath}`);
      return true;
    }
    return false;
  }

  // Audit log for key operations
  auditLog(operation, walletName = 'default') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${operation} - Wallet: ${walletName}\n`;
    const logPath = path.join(this.keyDir, 'audit.log');
    
    fs.appendFileSync(logPath, logEntry, { mode: 0o600 });
  }
}

export class SecurityValidator {
  static validatePrivateKey(privateKey) {
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace(/^0x/, '');
    
    // Check if it's a valid hex string of correct length
    if (!/^[a-fA-F0-9]{64}$/.test(cleanKey)) {
      throw new Error('Invalid private key format. Must be 64 hex characters.');
    }
    
    // Ensure it's not all zeros or all F's (invalid keys)
    if (/^0+$/.test(cleanKey) || /^[fF]+$/.test(cleanKey)) {
      throw new Error('Invalid private key. Cannot be all zeros or all F\'s.');
    }
    
    return `0x${cleanKey}`;
  }

  static sanitizeForLogging(privateKey) {
    if (!privateKey) return '[NOT_SET]';
    return `${privateKey.substring(0, 6)}...${privateKey.substring(privateKey.length - 4)}`;
  }

  static isProductionEnvironment() {
    return process.env.NODE_ENV === 'production';
  }

  static checkEnvironmentSecurity() {
    const warnings = [];
    
    // Check if .env exists and warn about it
    if (fs.existsSync('.env')) {
      warnings.push('⚠️  .env file detected. Consider using encrypted storage instead.');
    }
    
    // Check file permissions on sensitive files
    try {
      const envStat = fs.statSync('.env');
      const mode = envStat.mode & parseInt('777', 8);
      if (mode !== parseInt('600', 8)) {
        warnings.push('⚠️  .env file has overly permissive permissions. Run: chmod 600 .env');
      }
    } catch (error) {
      // .env doesn't exist, which is good
    }
    
    return warnings;
  }
}