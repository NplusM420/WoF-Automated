import React, { useEffect, useRef, useState } from 'react';
import { Activity, Download } from 'lucide-react';

function LogsPanel({ logs }) {
  const [filter, setFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isAtBottom);
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-slate-300';
    }
  };

  const downloadLogs = () => {
    const logContent = filteredLogs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotspinner-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center">
          <Activity className="w-7 h-7 mr-3 text-green-400" />
          System Logs
        </h1>
        
        <div className="flex items-center space-x-3">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Logs</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoScroll 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Auto-scroll
          </button>
          
          {/* Download logs */}
          <button
            onClick={downloadLogs}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-slate-300">{logs.length}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{logs.filter(l => l.type === 'info').length}</p>
          <p className="text-xs text-slate-400">Info</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-green-400">{logs.filter(l => l.type === 'success').length}</p>
          <p className="text-xs text-slate-400">Success</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-yellow-400">{logs.filter(l => l.type === 'warning').length}</p>
          <p className="text-xs text-slate-400">Warning</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-red-400">{logs.filter(l => l.type === 'error').length}</p>
          <p className="text-xs text-slate-400">Error</p>
        </div>
      </div>

      {/* Logs Container */}
      <div className="bg-slate-800 rounded-xl card-glow">
        <div className="p-4 border-b border-slate-700">
          <h2 className="font-semibold">Live Activity Feed</h2>
          <p className="text-sm text-slate-400">
            Showing {filteredLogs.length} of {logs.length} log entries
          </p>
        </div>
        
        <div 
          ref={logsContainerRef}
          onScroll={handleScroll}
          className="h-96 overflow-y-auto p-4 font-mono text-sm"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No logs to display</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <div key={index} className="log-entry flex items-start space-x-3 py-2 px-3 rounded-lg">
                  <span className="text-lg leading-none mt-0.5">
                    {getLogIcon(log.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        log.type === 'error' ? 'bg-red-900 text-red-200' :
                        log.type === 'success' ? 'bg-green-900 text-green-200' :
                        log.type === 'warning' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-blue-900 text-blue-200'
                      }`}>
                        {log.type.toUpperCase()}
                      </span>
                    </div>
                    <p className={`${getLogColor(log.type)} leading-relaxed`}>
                      {log.message}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LogsPanel;