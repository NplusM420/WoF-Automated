import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MultiBallMinter } from './minter.js';
import { AutoSpinner } from './spinner.js';
import { WalletManager } from './wallet.js';
import { DailyAutomationManager } from './dailyAutomation.js';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files if build exists, otherwise show development message
const buildPath = path.join(__dirname, '../ui/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
} else {
  // Development mode - serve a simple page
  app.get('/', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>SpotSpinner - Development Mode</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #0f172a; color: #e2e8f0; }
            .container { max-width: 600px; margin: 0 auto; }
            .status { padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info { background: #1e40af; border-left: 4px solid #3b82f6; }
            .warning { background: #d97706; border-left: 4px solid #f59e0b; }
            code { background: #374151; padding: 2px 4px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎰 SpotSpinner Server</h1>
            <div class="status info">
              <h3>✅ Server Running</h3>
              <p>The SpotSpinner server is running successfully on port ${PORT}</p>
            </div>
            
            <div class="status warning">
              <h3>🔨 UI Build Required</h3>
              <p>The web UI needs to be built. Run these commands:</p>
              <pre><code>npm run build
npm run dev-ui</code></pre>
            </div>
            
            <h3>📡 API Endpoints Available:</h3>
            <ul>
              <li><strong>GET</strong> <code>/api/status</code> - System status</li>
              <li><strong>POST</strong> <code>/api/initialize</code> - Initialize system</li>
              <li><strong>GET</strong> <code>/api/tokens</code> - Get owned tokens</li>
              <li><strong>POST</strong> <code>/api/mint</code> - Mint tokens</li>
              <li><strong>POST</strong> <code>/api/auto-spin-claim</code> - Auto spin and claim</li>
              <li><strong>POST</strong> <code>/api/full-automation</code> - Full automation</li>
            </ul>
            
            <p><strong>Alternative:</strong> Use CLI commands like <code>npm start status</code></p>
          </div>
        </body>
      </html>
    `);
  });
}

// Helper function to get system status
async function getSystemStatus() {
  let status = {
    initialized: !!minter && !!spinner,
    isRunning,
    currentOperation,
    wallet: null,
    error: null
  };
  
  if (minter && walletManager) {
    try {
      const walletStatus = await minter.getStatus();
      status.wallet = walletStatus;
    } catch (error) {
      status.error = error.message;
    }
  }
  
  return status;
}

// Global state
let minter = null;
let spinner = null;
let walletManager = null;
let dailyAutomation = null;
let isRunning = false;
let currentOperation = null;
let currentOperationProgress = null;
let logs = [];
let connectedClients = [];

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  connectedClients.push(ws);
  
  // Send current state
  ws.send(JSON.stringify({
    type: 'status',
    data: {
      isRunning,
      currentOperation,
      logs: logs.slice(-50) // Send last 50 logs
    }
  }));
  
  ws.on('close', () => {
    connectedClients = connectedClients.filter(client => client !== ws);
    console.log('Client disconnected from WebSocket');
  });
});

// Broadcast to all connected clients
function broadcast(message) {
  const payload = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  });
}

// Enhanced logging function
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, message, type };
  
  logs.push(logEntry);
  if (logs.length > 1000) {
    logs = logs.slice(-1000); // Keep last 1000 logs
  }
  
  console.log(`[${timestamp}] ${message}`);
  
  // Broadcast to connected clients
  broadcast({
    type: 'log',
    data: logEntry
  });
}

// Initialize automation components
async function initializeAutomation(encryptionPassword = null) {
  try {
    walletManager = new WalletManager();
    
    // Try to initialize with encrypted key first, fallback to env
    try {
      await walletManager.initialize(encryptionPassword);
    } catch (error) {
      if (error.message.includes('Encrypted key found but no password provided')) {
        throw new Error('Encrypted private key detected. Please provide your encryption password to initialize.');
      } else if (error.message.includes('No private key available')) {
        throw new Error('No private key configured. Please run "npm run secure-setup" or set PRIVATE_KEY in .env file');
      } else if (error.message.includes('Decryption failed')) {
        throw new Error('Invalid encryption password. Please check your password and try again.');
      }
      throw error;
    }
    
    minter = new MultiBallMinter(walletManager, log);
    await minter.initialize();
    
    spinner = new AutoSpinner(walletManager, log);
    await spinner.initialize();
    
    // Initialize daily automation manager
    dailyAutomation = new DailyAutomationManager(log);
    
    // Set up the automation callback (full mint + spin cycle)
    dailyAutomation.setAutomationCallback(async () => {
      log('🚀 Daily automation triggered: Starting full mint + spin cycle...', 'info');
      
      if (isRunning) {
        log('⚠️  Automation already running, skipping daily trigger', 'warning');
        return;
      }
      
      // Trigger full automation (mint 1000 + convert all)
      isRunning = true;
      currentOperation = 'daily-automation';
      
      broadcast({
        type: 'operationStart',
        data: { operation: 'daily-automation' }
      });
      
      try {
        // Phase 1: Mint 1000 tokens
        log('🎯 Daily automation: Phase 1 - Minting 1000 MULTIBALL tokens...', 'info');
        const mintResult = await minter.fullAutomation(1000);
        
        if (!mintResult.success) {
          throw new Error(`Minting failed: ${mintResult.error}`);
        }
        
        // Phase 2: Convert all to Prize Tickets
        log('🎯 Daily automation: Phase 2 - Converting to Prize Tickets...', 'info');
        const spinResult = await spinner.processBallsForPrizeTickets(false);
        
        if (!spinResult.success) {
          throw new Error(`Conversion failed: ${spinResult.error}`);
        }
        
        // Record completion for next cycle
        dailyAutomation.recordCompletedRun();
        
        log('🎉 Daily automation completed successfully!', 'success');
        
        broadcast({
          type: 'operationComplete',
          data: { 
            operation: 'daily-automation',
            result: { success: true, mintResult, spinResult }
          }
        });
        
      } catch (error) {
        log(`❌ Daily automation failed: ${error.message}`, 'error');
        
        broadcast({
          type: 'operationComplete',
          data: { 
            operation: 'daily-automation',
            result: { success: false, error: error.message }
          }
        });
      } finally {
        isRunning = false;
        currentOperation = null;
      }
    });
    
    // Token database ready - tokens will be tracked automatically when minted
    log('💾 Token database ready for automatic mint tracking', 'info');
    
    log('✅ Automation components initialized successfully', 'success');
    log('📅 Daily automation manager ready', 'info');
    return true;
  } catch (error) {
    log(`❌ Initialization failed: ${error.message}`, 'error');
    return false;
  }
}

// API Routes

// Get system status
app.get('/api/status', async (req, res) => {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize the system
app.post('/api/initialize', async (req, res) => {
  try {
    if (isRunning) {
      return res.status(400).json({ error: 'System is currently running an operation' });
    }
    
    const { encryptionPassword } = req.body;
    
    log('🚀 Initializing automation system...', 'info');
    const success = await initializeAutomation(encryptionPassword);
    
    res.json({ success });
  } catch (error) {
    log(`❌ Initialization error: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Get current operation progress
app.get('/api/progress', (req, res) => {
  res.json({
    progress: currentOperationProgress,
    isRunning,
    currentOperation
  });
});

// Get owned tokens (instant response from local database)
app.get('/api/tokens', async (req, res) => {
  try {
    if (!spinner) {
      return res.status(400).json({ error: 'System not initialized' });
    }
    
    // Get tokens instantly from local database (no blockchain scanning needed)
    const instantTokens = spinner.getOwnedTokensInstant();
    const conversionData = spinner.getTokensForConversion();
    
    // Auto-sync: If database shows tokens but we suspect they might be phantom tokens,
    // do a quick balance check (single RPC call) and auto-fix if balance is 0
    if (instantTokens.length > 0) {
      try {
        const syncResult = await spinner.tokenDb.quickSyncWithBalance(spinner.contract);
        if (syncResult.synced && syncResult.cleared > 0) {
          log(`🔄 Auto-sync: Cleared ${syncResult.cleared} phantom tokens`, 'info');
          // Refresh data after clearing
          const refreshedTokens = spinner.getOwnedTokensInstant();
          const refreshedConversionData = spinner.getTokensForConversion();
          return res.json({
            totalTokens: refreshedTokens.length,
            availableForConversion: refreshedConversionData.availableTokens,
            possibleConversions: refreshedConversionData.possibleConversions,
            remainingTokens: refreshedConversionData.remainingTokens,
            unspun: refreshedTokens.length,
            spun: 0,
            claimable: 0,
            claimed: 0,
            errors: 0,
            autoSynced: true,
            clearedPhantomTokens: syncResult.cleared
          });
        }
      } catch (error) {
        log(`⚠️  Auto-sync failed, continuing with database data: ${error.message}`, 'warning');
      }
    }
    
    const stats = {
      totalTokens: instantTokens.length,
      availableForConversion: conversionData.availableTokens,
      possibleConversions: conversionData.possibleConversions,
      remainingTokens: conversionData.remainingTokens,
      unspun: instantTokens.length, // All tokens in database are available for conversion
      spun: 0,
      claimable: 0,
      claimed: 0,
      errors: 0
    };
    
    // If database is empty, tokens will be tracked automatically when minted
    if (instantTokens.length === 0) {
      log('💾 Local database empty - tokens will be tracked automatically when minted', 'info');
      
      return res.json({
        tokens: [],
        stats: stats,
        isScanning: false,
        mintTrackingEnabled: true,
        message: "No tokens found. Tokens will be tracked automatically when minted."
      });
    }
    
    log(`📦 Returning ${instantTokens.length} tokens instantly from local database`, 'info');
    
    res.json({
      tokens: instantTokens,
      stats: stats,
      conversionData: conversionData,
      isScanning: false,
      source: 'local_database',
      instantAccess: true
    });
    
  } catch (error) {
    log(`❌ Error fetching tokens: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Mint tokens
app.post('/api/mint', async (req, res) => {
  try {
    if (!minter) {
      return res.status(400).json({ error: 'System not initialized' });
    }
    
    if (isRunning) {
      return res.status(400).json({ error: 'Another operation is currently running' });
    }
    
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }
    
    isRunning = true;
    currentOperation = 'minting';
    
    broadcast({
      type: 'operationStart',
      data: { operation: 'minting', quantity }
    });
    
    log(`💰 Starting mint operation for ${quantity} tokens...`, 'info');
    
    let result;
    if (quantity <= config.mintQuantityPerTx) {
      result = await minter.mint(quantity);
    } else {
      result = await minter.batchMint(quantity);
    }
    
    // Refresh status after minting
    const updatedStatus = await getSystemStatus();
    broadcast({
      type: 'status',
      data: updatedStatus
    });
    
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    
    broadcast({
      type: 'operationComplete',
      data: { operation: 'minting', result }
    });
    
    if (result.success) {
      log(`✅ Mint operation completed successfully`, 'success');
    } else {
      log(`❌ Mint operation failed`, 'error');
    }
    
    res.json(result);
  } catch (error) {
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    log(`❌ Mint operation error: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// SAFETY: Test conversion logic without burning anything
app.post('/api/test-conversion', async (req, res) => {
  try {
    if (!spinner) {
      return res.status(400).json({ error: 'System not initialized' });
    }
    
    log(`🧪 Running conversion test (no burning)...`, 'info');
    
    const result = await spinner.processBallsForPrizeTickets(true); // testMode = true
    
    if (result.success) {
      log(`✅ Conversion test completed: Would create ${result.plannedPrizeTickets} Prize Tickets`, 'success');
    } else {
      log(`❌ Conversion test failed`, 'error');
    }
    
    res.json(result);
  } catch (error) {
    log(`❌ Conversion test error: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Convert MULTIBALL tokens to Prize Tickets (LIVE MODE - BURNS TOKENS!)
app.post('/api/convert-prizes', async (req, res) => {
  try {
    if (!spinner) {
      return res.status(400).json({ error: 'System not initialized' });
    }
    
    if (isRunning) {
      return res.status(400).json({ error: 'Another operation is currently running' });
    }
    
    isRunning = true;
    currentOperation = 'converting';
    
    broadcast({
      type: 'operationStart',
      data: { operation: 'converting' }
    });
    
    log(`🎲 Starting MULTIBALL → Prize Ticket conversion...`, 'info');
    
    const result = await spinner.processBallsForPrizeTickets();
    
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    
    broadcast({
      type: 'operationComplete',
      data: { operation: 'converting', result }
    });
    
    if (result.success) {
      log(`✅ Prize ticket conversion completed successfully`, 'success');
    } else {
      log(`❌ Prize ticket conversion failed`, 'error');
    }
    
    res.json(result);
  } catch (error) {
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    log(`❌ Prize ticket conversion error: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Auto-convert tokens (legacy endpoint - now converts to Prize Tickets)
app.post('/api/auto-spin-claim', async (req, res) => {
  try {
    if (!spinner) {
      return res.status(400).json({ error: 'System not initialized' });
    }
    
    if (isRunning) {
      return res.status(400).json({ error: 'Another operation is currently running' });
    }
    
    isRunning = true;
    currentOperation = 'spinning';
    
    broadcast({
      type: 'operationStart',
      data: { operation: 'spinning' }
    });
    
    log(`🎰 Starting auto-spin and claim operation...`, 'info');
    
    // Progress callback for real-time updates
    const progressCallback = (progress) => {
      currentOperationProgress = { 
        operation: 'auto-spin-claim', 
        ...progress,
        timestamp: new Date().toISOString()
      };
      
      broadcast({
        type: 'operationProgress',
        data: currentOperationProgress
      });
      log(`🎰 Conversion progress: ${progress.message} (${progress.progress}%)`, 'info');
    };
    
    const result = await spinner.autoSpinAndClaim(progressCallback);
    
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    
    broadcast({
      type: 'operationComplete',
      data: { operation: 'spinning', result }
    });
    
    // Refresh token data after conversion
    if (result.success && spinner) {
      const updatedTokenData = spinner.getOwnedTokensInstant();
      const updatedConversionData = spinner.getTokensForConversion();
      
      broadcast({
        type: 'tokens_updated',
        data: {
          tokens: updatedTokenData,
          conversionData: updatedConversionData,
          conversionResults: result.results
        }
      });
    }
    
    if (result.success) {
      log(`✅ Auto-conversion completed successfully`, 'success');
    } else {
      log(`❌ Auto-conversion failed`, 'error');
    }
    
    res.json(result);
  } catch (error) {
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    log(`❌ Auto-spin and claim error: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Full automation (mint + spin + claim)
app.post('/api/full-automation', async (req, res) => {
  try {
    if (!minter || !spinner) {
      return res.status(400).json({ error: 'System not initialized' });
    }
    
    if (isRunning) {
      return res.status(400).json({ error: 'Another operation is currently running' });
    }
    
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }
    
    isRunning = true;
    currentOperation = 'full-automation';
    
    broadcast({
      type: 'operationStart',
      data: { operation: 'full-automation', quantity }
    });
    
    log(`🚀 Starting full automation: mint ${quantity} → spin → claim...`, 'info');
    
    // Phase 1: Mint
    log(`💰 Phase 1: Minting ${quantity} tokens...`, 'info');
    let mintResult;
    if (quantity <= config.mintQuantityPerTx) {
      mintResult = await minter.mint(quantity);
    } else {
      mintResult = await minter.batchMint(quantity);
    }
    
    if (!mintResult.success) {
      isRunning = false;
      currentOperation = null;
      log(`❌ Minting phase failed, stopping automation`, 'error');
      return res.json({ success: false, phase: 'minting', error: 'Minting failed', result: mintResult });
    }
    
    const actualMinted = mintResult.totalMinted || mintResult.quantity || 0;
    log(`✅ Minting phase completed: ${actualMinted} tokens minted`, 'success');
    
    // Refresh status and tokens
    log(`🔄 Refreshing wallet status and tokens...`, 'info');
    const updatedStatus = await getSystemStatus();
    broadcast({
      type: 'status',
      data: updatedStatus
    });
    
    // Wait for tokens to be available
    log(`⏳ Waiting 10 seconds for tokens to be available...`, 'info');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Refresh tokens again and broadcast
    try {
      const tokenStatus = await spinner.getTokensStatus();
      broadcast({
        type: 'tokens',
        data: tokenStatus
      });
      log(`📦 Token inventory updated: ${tokenStatus.stats.totalTokens} total (${tokenStatus.stats.unspun} unspun, ${tokenStatus.stats.claimable} claimable)`, 'info');
    } catch (error) {
      log(`⚠️  Could not fetch tokens: ${error.message}`, 'warning');
    }
    
    // Phase 2: Auto-spin and claim
    log(`🎰 Phase 2: Auto-spinning and claiming...`, 'info');
    const spinResult = await spinner.autoSpinAndClaim();
    
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    
    const result = {
      success: mintResult.success && spinResult.success,
      mintResult,
      spinResult
    };
    
    broadcast({
      type: 'operationComplete',
      data: { operation: 'full-automation', result }
    });
    
    if (result.success) {
      log(`✅ Full automation completed successfully`, 'success');
      
      // Record completion for daily automation scheduling
      if (dailyAutomation && quantity >= 1000) {
        dailyAutomation.recordCompletedRun();
        log(`📅 Recorded completion for daily automation scheduling`, 'info');
      }
    } else {
      log(`❌ Full automation completed with errors`, 'error');
    }
    
    res.json(result);
  } catch (error) {
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    log(`❌ Full automation error: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Burn losing Prize Tickets
app.post('/api/burn-tickets', async (req, res) => {
  try {
    if (!spinner) {
      return res.status(400).json({ error: 'System not initialized' });
    }
    
    if (isRunning) {
      return res.status(400).json({ error: 'Another operation is currently running' });
    }
    
    isRunning = true;
    currentOperation = 'burn-tickets';
    
    broadcast({
      type: 'operationStart',
      data: { operation: 'burn-tickets' }
    });
    
    log(`🔥 Starting to burn losing Prize Tickets...`, 'info');
    
    // Progress callback for real-time updates
    const progressCallback = (progress) => {
      currentOperationProgress = { 
        operation: 'burn-tickets', 
        ...progress,
        timestamp: new Date().toISOString()
      };
      
      broadcast({
        type: 'operationProgress',
        data: currentOperationProgress
      });
      log(`🔥 Burn progress: ${progress.message} (${progress.progress}%)`, 'info');
    };
    
    const result = await spinner.burnLosingTickets(progressCallback);
    
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    
    broadcast({
      type: 'operationComplete',
      data: { operation: 'burn-tickets', result }
    });
    
    if (result.success) {
      log(`✅ Ticket burning completed: ${result.burned} tickets burned`, 'success');
    } else {
      log(`❌ Ticket burning failed: ${result.error || 'Unknown error'}`, 'error');
    }
    
    res.json(result);
  } catch (error) {
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    log(`❌ Burn tickets error: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Dry-run burn losing Prize Tickets (analysis only)
app.post('/api/burn-tickets-dry-run', async (req, res) => {
  try {
    if (!spinner) {
      return res.status(400).json({ error: 'System not initialized' });
    }
    
    if (isRunning) {
      return res.status(400).json({ error: 'Another operation is currently running' });
    }
    
    isRunning = true;
    currentOperation = 'burn-tickets-analysis';
    
    broadcast({
      type: 'operationStart',
      data: { operation: 'burn-tickets-analysis' }
    });
    
    log(`🧪 Starting dry-run analysis of Prize Tickets...`, 'info');
    
    // Progress callback for real-time updates
    const progressCallback = (progress) => {
      currentOperationProgress = { 
        operation: 'burn-tickets-analysis', 
        ...progress,
        timestamp: new Date().toISOString()
      };
      
      broadcast({
        type: 'operationProgress',
        data: currentOperationProgress
      });
      log(`🧪 Analysis progress: ${progress.message} (${progress.progress}%)`, 'info');
    };
    
    const result = await spinner.burnLosingTickets(progressCallback, true); // dryRun = true
    
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    
    broadcast({
      type: 'operationComplete',
      data: { operation: 'burn-tickets-analysis', result }
    });
    
    if (result.success) {
      log(`✅ Dry-run analysis completed: ${result.losingTickets} losing tickets identified`, 'success');
    } else {
      log(`❌ Dry-run analysis failed: ${result.error || 'Unknown error'}`, 'error');
    }
    
    res.json(result);
  } catch (error) {
    isRunning = false;
    currentOperation = null;
    currentOperationProgress = null;
    log(`❌ Burn tickets dry-run error: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Get token database stats
app.get('/api/debug/token-stats', async (req, res) => {
  try {
    if (!spinner || !spinner.tokenDb) {
      return res.status(400).json({ error: 'Token database not initialized' });
    }
    
    const stats = spinner.tokenDb.getDatabaseStats();
    log(`📊 Token database stats requested`, 'info');
    res.json(stats);
  } catch (error) {
    log(`❌ Failed to get token stats: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Quick balance sync (single RPC call, not intensive)
app.post('/api/debug/sync-balance', async (req, res) => {
  try {
    if (!spinner || !spinner.tokenDb || !spinner.contract) {
      return res.status(400).json({ error: 'System not properly initialized' });
    }
    
    log(`⚡ Running quick balance sync...`, 'info');
    const syncResult = await spinner.tokenDb.quickSyncWithBalance(spinner.contract);
    
    if (syncResult.synced) {
      if (syncResult.cleared > 0) {
        log(`🧹 Database synced: Cleared ${syncResult.cleared} phantom tokens`, 'success');
      } else {
        log(`✅ Database already in sync`, 'success');
      }
    }
    
    res.json(syncResult);
  } catch (error) {
    log(`❌ Balance sync failed: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Clear token database and force rescan
app.post('/api/debug/clear-tokens', async (req, res) => {
  try {
    if (!spinner || !spinner.tokenDb) {
      return res.status(400).json({ error: 'Token database not initialized' });
    }
    
    log(`🔄 Clearing token database for resync...`, 'warning');
    const cleared = spinner.tokenDb.clearDatabase();
    
    res.json({ 
      success: cleared, 
      message: 'Token database cleared. Run a token scan to rebuild the database.' 
    });
  } catch (error) {
    log(`❌ Failed to clear token database: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Daily Automation: Get status
app.get('/api/daily-automation', async (req, res) => {
  try {
    if (!dailyAutomation) {
      return res.status(400).json({ error: 'Daily automation not initialized' });
    }
    
    const status = dailyAutomation.getStatus();
    res.json(status);
  } catch (error) {
    log(`❌ Failed to get daily automation status: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Daily Automation: Enable
app.post('/api/daily-automation/enable', async (req, res) => {
  try {
    if (!dailyAutomation) {
      return res.status(400).json({ error: 'Daily automation not initialized' });
    }
    
    dailyAutomation.enable();
    log('✅ Daily automation enabled by user', 'info');
    
    const status = dailyAutomation.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    log(`❌ Failed to enable daily automation: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Daily Automation: Disable
app.post('/api/daily-automation/disable', async (req, res) => {
  try {
    if (!dailyAutomation) {
      return res.status(400).json({ error: 'Daily automation not initialized' });
    }
    
    dailyAutomation.disable();
    log('❌ Daily automation disabled by user', 'info');
    
    const status = dailyAutomation.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    log(`❌ Failed to disable daily automation: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// Get recent logs
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(logs.slice(-limit));
});


// Stop current operation
app.post('/api/stop', (req, res) => {
  // Note: This is a simple implementation
  // In a real scenario, you'd want to implement proper cancellation
  log(`🛑 Stop requested for operation: ${currentOperation}`, 'warning');
  res.json({ success: true, message: 'Stop signal sent' });
});

// Fallback for React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../ui/build/index.html'));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 SpotSpinner server running on port ${PORT}`);
  console.log(`📱 Web UI: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`🚨 Uncaught Exception: ${error.message}`, 'error');
  console.error('Stack:', error.stack);
  // Don't exit in development, just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log(`🚨 Unhandled Rejection: ${reason}`, 'error');
  console.error('Promise:', promise);
  // Don't exit in development, just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Try to initialize on startup if keys are available (don't require it)
(async () => {
  try {
    if (config.privateKey) {
      log('🔑 Found private key in environment, attempting auto-initialization...', 'info');
      await initializeAutomation();
    } else {
      const { SecureKeyManager } = await import('./security.js');
      const keyManager = new SecureKeyManager();
      if (keyManager.hasEncryptedKey()) {
        log('🔐 Found encrypted key storage. Initialize through UI with password.', 'info');
      } else {
        log('💡 No keys found. Use "npm run secure-setup" or initialize through UI.', 'info');
      }
    }
  } catch (error) {
    log(`⚠️ Auto-initialization skipped: ${error.message}`, 'warning');
  }
})();