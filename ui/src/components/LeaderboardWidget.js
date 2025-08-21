import React, { useState, useEffect } from 'react';
import { Trophy, ExternalLink, Minimize2, Maximize2, RefreshCw, Eye, EyeOff } from 'lucide-react';

function LeaderboardWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const leaderboardUrl = 'https://apectrl.com/wheel-of-fate';

  const handleIframeLoad = () => {
    setIsLoading(false);
    setLastRefresh(new Date());
  };

  const refreshLeaderboard = () => {
    setIsLoading(true);
    // Force iframe refresh by updating key
    const iframe = document.getElementById('leaderboard-iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleVisibility}
          className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full shadow-lg transition-colors border border-slate-600"
          title="Show Leaderboard"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${isExpanded ? 'inset-4' : 'bottom-4 right-4'} z-50 transition-all duration-300`}>
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-white">Wheel of Fate Leaderboard</h3>
            {isLoading && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshLeaderboard}
              className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
              title="Refresh Leaderboard"
            >
              <RefreshCw className="w-4 h-4 text-slate-300" />
            </button>
            
            <a
              href={leaderboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4 text-slate-300" />
            </a>
            
            <button
              onClick={toggleExpanded}
              className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-slate-300" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-300" />
              )}
            </button>
            
            <button
              onClick={toggleVisibility}
              className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
              title="Hide Leaderboard"
            >
              <EyeOff className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="bg-slate-750 px-4 py-2 border-b border-slate-600">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <span className="text-slate-400">
              {isExpanded ? 'Full View' : 'Widget View'}
            </span>
          </div>
        </div>
        
        {/* Iframe Container */}
        <div className={`relative ${isExpanded ? 'h-full' : 'h-96 w-80'}`}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Loading leaderboard...</p>
              </div>
            </div>
          )}
          
          <iframe
            id="leaderboard-iframe"
            src={leaderboardUrl}
            className={`w-full ${isExpanded ? 'h-full' : 'h-96'} border-0`}
            onLoad={handleIframeLoad}
            title="Wheel of Fate Leaderboard"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
        
        {/* Footer - only show in widget mode */}
        {!isExpanded && (
          <div className="bg-slate-700 px-4 py-2 border-t border-slate-600">
            <p className="text-xs text-slate-400 text-center">
              Track your progress in real-time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaderboardWidget;