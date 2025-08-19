import React from 'react';
import { Settings, Server, Zap, Info, ExternalLink, User, Heart } from 'lucide-react';

function SettingsPanel({ status }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center">
            <Settings className="w-7 h-7 mr-3 text-blue-400" />
            Settings & Configuration
          </h1>
        </div>

        {/* Developer Attribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Built By */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">Built by</span>
            </div>
            <a
              href="https://x.com/AThinkingMind"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group w-fit"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="font-medium">@AThinkingMind</span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>

          {/* Tip the Dev */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-medium text-pink-400">Tip the dev</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 p-2 bg-slate-800 rounded-lg">
                <span className="text-xs text-slate-400 flex-shrink-0">APE:</span>
                <code className="font-mono text-xs text-green-400 break-all select-all cursor-pointer">
                  0x2616BA6e0AA6dA3F10858c350D447375a39A9b45
                </code>
              </div>
              <p className="text-xs text-slate-500">
                Click to select • Send APE to support development ❤️
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-slate-800 rounded-xl p-6 card-glow">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Server className="w-5 h-5 mr-2 text-green-400" />
          System Status
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Initialization Status</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                status.initialized 
                  ? 'bg-green-900 text-green-200' 
                  : 'bg-red-900 text-red-200'
              }`}>
                {status.initialized ? 'Initialized' : 'Not Initialized'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Current Operation</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                status.isRunning 
                  ? 'bg-yellow-900 text-yellow-200' 
                  : 'bg-green-900 text-green-200'
              }`}>
                {status.isRunning ? status.currentOperation : 'Idle'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Wallet Connected</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                status.wallet 
                  ? 'bg-green-900 text-green-200' 
                  : 'bg-red-900 text-red-200'
              }`}>
                {status.wallet ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
          
          {status.wallet && (
            <div className="space-y-3">
              <h3 className="font-semibold text-green-400">Wallet Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Address:</span>
                  <p className="font-mono text-xs break-all">{status.wallet.walletAddress}</p>
                </div>
                <div>
                  <span className="text-slate-400">Balance:</span>
                  <p>{status.wallet.balance} APE</p>
                </div>
                <div>
                  <span className="text-slate-400">Daily Minted:</span>
                  <p>{status.wallet.dailyMinted} / {status.wallet.dailyLimit}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-slate-800 rounded-xl p-6 card-glow">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-400" />
          Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-blue-400">Network Settings</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Chain:</span>
                <span>ApeChain (33139)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RPC:</span>
                <span className="truncate ml-2">apechain.calderachain.xyz</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">MULTIBALL:</span>
                  <span className="font-mono text-xs">0x075893...3321</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prize Ticket:</span>
                  <span className="font-mono text-xs">0x618be6...1b28e</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SecretSanta:</span>
                  <span className="font-mono text-xs">0x80a5e6...467ed</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-purple-400">Automation Settings</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Limit:</span>
                <span>1000 tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mint Strategy:</span>
                <span>1 token per tx + 1s delay</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Conversion Rate:</span>
                <span>10 MULTIBALL → 1 Prize Ticket</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gas Limit:</span>
                <span>300,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Features */}
      <div className="bg-slate-800 rounded-xl p-6 card-glow">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2 text-blue-400" />
          System Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-400">✅ MULTIBALL Token Automation</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Automated minting with real-time progress tracking</li>
                <li>• Individual token minting with 1-second delays</li>
                <li>• Daily limit management (1000 tokens/day)</li>
                <li>• Transaction receipt parsing for token ID extraction</li>
              </ul>
            </div>
            
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-purple-400">🎰 Prize Ticket Conversion</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Convert 10 MULTIBALL → 1 Prize Ticket NFT</li>
                <li>• SecretSanta contract integration with VRF</li>
                <li>• Automated grouping and batch processing</li>
                <li>• Safe transaction handling with confirmations</li>
              </ul>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-400">🔄 Daily Auto-Repeat</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• 24-hour automated cycling</li>
                <li>• Mint 1000 + convert all tokens automatically</li>
                <li>• Persistent scheduling across server restarts</li>
                <li>• 2-minute safety buffer after cooldown expires</li>
              </ul>
            </div>
            
            <div className="bg-slate-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-yellow-400">💾 Smart Token Database</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Instant token access without blockchain scanning</li>
                <li>• Automatic mint tracking and database updates</li>
                <li>• Phantom token detection and cleanup</li>
                <li>• Conversion group optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="bg-slate-800 rounded-xl p-6 card-glow">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <ExternalLink className="w-5 h-5 mr-2 text-green-400" />
          Useful Links
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://wheeloffate.apechain.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <span>Wheel of Fate (Official)</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          
          <a
            href="https://apescan.io/address/0x075893707e168162234b62a5b39650e124ff3321"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <span>MULTIBALL Contract</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          
          <a
            href="https://apescan.io/address/0x618be6e12dc29e9731e81818c9b9d6bec961b28e"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <span>Prize Ticket Contract</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          
          <a
            href="https://apescan.io/address/0x80a5e6d411002891e519f531785e7686b3c467ed"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <span>SecretSanta Contract</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;