import React from 'react';
import { RefreshCw, Coins, Trophy, Play, Gift } from 'lucide-react';

function TokensPanel({ tokens, spinStatus, isRunning, onRefresh }) {
  const getTokenStatus = (tokenId) => {
    const status = spinStatus.find(s => s.tokenId === tokenId);
    if (!status) return { text: 'Unknown', color: 'text-gray-400', icon: null };
    
    if (!status.hasSpun) {
      return { 
        text: 'Ready to Spin', 
        color: 'text-yellow-400', 
        icon: Play,
        action: 'spin'
      };
    }
    
    if (status.spinResult && !status.spinResult.claimed) {
      return { 
        text: `Prize ${status.spinResult.prize} - Unclaimed`, 
        color: 'text-green-400', 
        icon: Gift,
        action: 'claim'
      };
    }
    
    if (status.spinResult && status.spinResult.claimed) {
      return { 
        text: `Prize ${status.spinResult.prize} - Claimed`, 
        color: 'text-blue-400', 
        icon: Trophy,
        action: null
      };
    }
    
    return { 
      text: 'Spun - No Prize', 
      color: 'text-gray-400', 
      icon: null,
      action: null
    };
  };

  const handleTokenAction = async (tokenId, action) => {
    try {
      const response = await fetch(`/api/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      } else {
        onRefresh();
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center">
          <Coins className="w-7 h-7 mr-3 text-blue-400" />
          Token Management
        </h1>
        <button
          onClick={onRefresh}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 card-glow">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{tokens.length}</p>
            <p className="text-sm text-slate-400">Total Tokens</p>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-4 card-glow">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {spinStatus.filter(s => !s.hasSpun).length}
            </p>
            <p className="text-sm text-slate-400">Ready to Spin</p>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-4 card-glow">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {spinStatus.filter(s => s.spinResult && !s.spinResult.claimed).length}
            </p>
            <p className="text-sm text-slate-400">Unclaimed Prizes</p>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-4 card-glow">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">
              {spinStatus.filter(s => s.spinResult && s.spinResult.claimed).length}
            </p>
            <p className="text-sm text-slate-400">Claimed Prizes</p>
          </div>
        </div>
      </div>

      {/* Tokens List */}
      <div className="bg-slate-800 rounded-xl p-6 card-glow">
        <h2 className="text-xl font-bold mb-4">Your Tokens</h2>
        
        {tokens.length === 0 ? (
          <div className="text-center py-12">
            <Coins className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <p className="text-lg text-slate-400 mb-2">No tokens found</p>
            <p className="text-sm text-slate-500">Start by minting some MULTIBALL tokens!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map(tokenId => {
              const status = getTokenStatus(tokenId);
              const StatusIcon = status.icon;
              
              return (
                <div key={tokenId} className="bg-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-slate-600 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">#{tokenId}</span>
                    </div>
                    <div>
                      <p className="font-medium">Token #{tokenId}</p>
                      <div className="flex items-center space-x-2">
                        {StatusIcon && <StatusIcon className={`w-4 h-4 ${status.color}`} />}
                        <p className={`text-sm ${status.color}`}>{status.text}</p>
                      </div>
                    </div>
                  </div>
                  
                  {status.action && (
                    <button
                      onClick={() => handleTokenAction(tokenId, status.action)}
                      disabled={isRunning}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        status.action === 'spin' 
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      } disabled:bg-gray-600`}
                    >
                      {status.action === 'spin' ? 'Spin' : 'Claim'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TokensPanel;