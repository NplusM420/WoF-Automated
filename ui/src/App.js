import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Settings,
  Activity,
  Zap,
  BarChart3
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import TokensPanel from './components/TokensPanel';
import LogsPanel from './components/LogsPanel';
import SettingsPanel from './components/SettingsPanel';
import StatusBar from './components/StatusBar';
import InitializationModal from './components/InitializationModal';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState({
    initialized: false,
    isRunning: false,
    currentOperation: null,
    wallet: null,
    error: null
  });
  const [logs, setLogs] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [spinStatus, setSpinStatus] = useState([]);
  const [ws, setWs] = useState(null);
  const [showInitModal, setShowInitModal] = useState(false);
  const [initError, setInitError] = useState(null);

  // Periodic status updates (instead of WebSocket)
  useEffect(() => {
    // Poll more frequently when operations are running for real-time progress updates
    const pollInterval = status.isRunning ? 2000 : 5000; // 2s during operations, 5s when idle
    
    const updateInterval = setInterval(() => {
      fetchStatus();
      if (activeTab === 'logs') {
        fetchLogs();
      }
    }, pollInterval);

    return () => clearInterval(updateInterval);
  }, [activeTab, status.isRunning]);

  // Fetch initial data
  useEffect(() => {
    fetchStatus();
    fetchTokens();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens');
      if (response.ok) {
        const data = await response.json();
        // Handle new comprehensive token data structure
        setTokens(data.tokens || []);
        setSpinStatus(data.spinStatus || []);
        
        // Store additional stats if available
        if (data.stats) {
          console.log('📊 Token Stats:', data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs?limit=100');
      if (response.ok) {
        const logsData = await response.json();
        setLogs(logsData);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const initializeSystem = async (password = null) => {
    try {
      setInitError(null);
      const response = await fetch('/api/initialize', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptionPassword: password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowInitModal(false);
        fetchStatus();
      } else {
        setInitError(data.error || 'Initialization failed');
      }
    } catch (error) {
      console.error('Failed to initialize system:', error);
      setInitError('Network error: Failed to connect to server');
    }
  };

  const handleInitButtonClick = () => {
    setInitError(null);
    setShowInitModal(true);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'tokens', label: 'Tokens', icon: Coins },
    { id: 'logs', label: 'Logs', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SpotSpinner</h1>
              <p className="text-sm text-slate-400">MULTIBALL Automation</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {!status.initialized && (
              <button
                onClick={handleInitButtonClick}
                disabled={status.isRunning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Initialize System
              </button>
            )}
            
            <StatusBar 
              status={status} 
              onRefresh={fetchStatus}
            />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6">
        <div className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'dashboard' && (
          <Dashboard 
            status={status}
            tokens={tokens}
            spinStatus={spinStatus}
            onRefresh={() => {
              fetchStatus();
              fetchTokens();
            }}
          />
        )}
        
        {activeTab === 'tokens' && (
          <TokensPanel 
            tokens={tokens}
            spinStatus={spinStatus}
            isRunning={status.isRunning}
            onRefresh={fetchTokens}
          />
        )}
        
        {activeTab === 'logs' && (
          <LogsPanel logs={logs} />
        )}
        
        {activeTab === 'settings' && (
          <SettingsPanel status={status} />
        )}
      </main>

      {/* Initialization Modal */}
      {showInitModal && (
        <InitializationModal
          onInitialize={initializeSystem}
          onClose={() => setShowInitModal(false)}
          error={initError}
        />
      )}
    </div>
  );
}

export default App;