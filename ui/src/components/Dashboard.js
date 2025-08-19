import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Trophy, 
  Zap, 
  TrendingUp,
  Wallet,
  Activity,
  Clock,
  RotateCcw
} from 'lucide-react';

function Dashboard({ status, tokens, spinStatus, onRefresh }) {
  const [dailyTargetLimit, setDailyTargetLimit] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyAutomation, setDailyAutomation] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Fetch daily automation status
  useEffect(() => {
    const fetchDailyAutomation = async () => {
      try {
        const response = await fetch('/api/daily-automation');
        if (response.ok) {
          const data = await response.json();
          setDailyAutomation(data);
        }
      } catch (error) {
        console.error('Failed to fetch daily automation status:', error);
      }
    };

    fetchDailyAutomation();
    // Refresh every 30 seconds to update countdown
    const interval = setInterval(fetchDailyAutomation, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!dailyAutomation?.nextRunTime) {
      setTimeRemaining('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const nextRun = dailyAutomation.nextRunTime;
      const remaining = nextRun - now;

      if (remaining <= 0) {
        setTimeRemaining('Ready to run');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [dailyAutomation?.nextRunTime]);

  const executeOperation = async (endpoint, data = {}) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setIsLoading(false);
      onRefresh();
    }
  };

  const handleMintOne = () => executeOperation('mint', { quantity: 1 });
  const handleAutoSpinClaim = () => executeOperation('auto-spin-claim');
  const handleFullAutomation = () => executeOperation('full-automation', { quantity: dailyTargetLimit });

  // Daily automation handlers
  const handleDailyAutomationToggle = async () => {
    setIsLoading(true);
    try {
      const endpoint = dailyAutomation?.isEnabled ? 
        '/api/daily-automation/disable' : 
        '/api/daily-automation/enable';
      
      const response = await fetch(endpoint, { method: 'POST' });
      
      if (response.ok) {
        const result = await response.json();
        setDailyAutomation(result.status);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const unspunTokens = spinStatus.filter(s => !s.hasSpun).length;
  const unclaimedPrizes = spinStatus.filter(s => s.spinResult && !s.spinResult.claimed).length;

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 card-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Wallet Balance</p>
              <p className="text-2xl font-bold">
                {status.wallet ? `${parseFloat(status.wallet.balance).toFixed(4)}` : '0.0000'} APE
              </p>
            </div>
            <Wallet className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 card-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total MULTIBALL NFTs</p>
              <p className="text-2xl font-bold">{tokens.length}</p>
              <p className="text-xs text-slate-500 mt-1">
                🎲 {unspunTokens} unspun • 🎁 {unclaimedPrizes} claimable
              </p>
            </div>
            <Coins className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 card-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Daily Minted</p>
              <p className="text-2xl font-bold">
                {status.wallet ? status.wallet.dailyMinted : 0} / {status.wallet ? status.wallet.dailyLimit : 500}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 card-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Unclaimed Prizes</p>
              <p className="text-2xl font-bold">{unclaimedPrizes}</p>
            </div>
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-xl p-6 card-glow">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-blue-400" />
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mint One Ball Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Mint Single Ball</h3>
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                Mint one MULTIBALL token at a time
              </p>
              <button
                onClick={handleMintOne}
                disabled={!status.initialized || status.isRunning || isLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                {status.isRunning && status.currentOperation === 'minting' ? 'Minting...' : 'Mint 1 Ball'}
              </button>
            </div>
          </div>

          {/* Auto Convert Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Auto Convert to Prize Tickets</h3>
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                {tokens.length} tokens available → {Math.floor(tokens.length / 10)} Prize Tickets possible
              </p>
              <p className="text-xs text-slate-500">
                Converts groups of 10 MULTIBALL tokens into Prize Ticket NFTs
              </p>
              <button
                onClick={handleAutoSpinClaim}
                disabled={!status.initialized || status.isRunning || isLoading || tokens.length < 10}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                {status.isRunning && status.currentOperation === 'spinning' ? 'Converting...' : `Convert ${Math.floor(tokens.length / 10)} Prize Tickets`}
              </button>
            </div>
          </div>

          {/* Daily Automation Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Daily Automation</h3>
            <div className="space-y-2">
              <label className="block text-sm text-slate-400">Daily Target</label>
              <input
                type="number"
                value={dailyTargetLimit}
                onChange={(e) => setDailyTargetLimit(parseInt(e.target.value) || 0)}
                min="1"
                max={status.wallet ? status.wallet.remainingToday : 500}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="How many to mint today"
              />
              <button
                onClick={handleFullAutomation}
                disabled={!status.initialized || status.isRunning || isLoading || dailyTargetLimit <= 0}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                {status.isRunning && status.currentOperation === 'full-automation' ? 'Running...' : `Mint ${dailyTargetLimit} + Auto Process`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Auto-Repeat Feature */}
      <div className="bg-slate-800 rounded-xl p-6 card-glow">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <RotateCcw className="w-5 h-5 mr-2 text-purple-400" />
          Daily Auto-Repeat (24-Hour Cycle)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Control Panel */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="dailyAutoRepeat"
                checked={dailyAutomation?.isEnabled || false}
                onChange={handleDailyAutomationToggle}
                disabled={!status.initialized || isLoading}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
              />
              <label htmlFor="dailyAutoRepeat" className="text-lg font-medium cursor-pointer">
                Enable Daily Auto-Repeat
              </label>
            </div>
            
            <div className="text-sm text-slate-400 space-y-1">
              <p>✨ Automatically runs full cycle (mint 500 + convert all) every 24 hours</p>
              <p>⏰ Includes 2-minute safety buffer after cooldown expires</p>
              <p>🔄 Survives server restarts and continues scheduling</p>
            </div>
            
            {dailyAutomation?.isEnabled && (
              <div className="bg-slate-700 rounded-lg p-3">
                <p className="text-sm font-medium text-green-400 mb-1">Daily Auto-Repeat is Active</p>
                <p className="text-xs text-slate-400">
                  System will automatically run the next cycle when the 24-hour cooldown expires.
                </p>
              </div>
            )}
          </div>
          
          {/* Status Panel */}
          <div className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Next Scheduled Run</h3>
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              
              {dailyAutomation?.nextRunTime ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-400 font-mono">
                    {new Date(dailyAutomation.nextRunTime).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    Time remaining: <span className="text-blue-400 font-medium">{timeRemaining}</span>
                  </p>
                </div>
              ) : dailyAutomation?.isEnabled ? (
                <p className="text-sm text-yellow-400">
                  Waiting for first manual run to schedule next cycle
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  No scheduled runs (auto-repeat disabled)
                </p>
              )}
            </div>
            
            {dailyAutomation?.lastCompletedTime && (
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium mb-2">Last Completed Run</h3>
                <p className="text-sm text-slate-400 font-mono">
                  {new Date(dailyAutomation.lastCompletedTime).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Debug Section (only show if initialized) */}
        {status.initialized && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-sm">Token Inventory</h4>
                <p className="text-xs text-slate-400">Scan wallet for all MULTIBALL tokens and their status</p>
              </div>
              <button
                onClick={onRefresh}
                disabled={status.isRunning || isLoading}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm font-medium transition-colors"
              >
                🔄 Refresh Tokens
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Token Overview */}
      <div className="bg-slate-800 rounded-xl p-6 card-glow">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-green-400" />
          Token Overview
        </h2>
        
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tokens found. Start by minting some tokens!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Tokens</span>
                <span className="text-xl font-bold">{tokens.length}</span>
              </div>
            </div>
            
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Unspun</span>
                <span className="text-xl font-bold text-yellow-400">{unspunTokens}</span>
              </div>
            </div>
            
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Unclaimed</span>
                <span className="text-xl font-bold text-green-400">{unclaimedPrizes}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Operation Status */}
      {status.isRunning && (
        <div className="bg-blue-900 border border-blue-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium">Operation in Progress</p>
              <p className="text-sm text-blue-300">
                Currently running: {status.currentOperation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {status.error && (
        <div className="bg-red-900 border border-red-700 rounded-xl p-4">
          <p className="font-medium text-red-100">Error</p>
          <p className="text-sm text-red-200">{status.error}</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;