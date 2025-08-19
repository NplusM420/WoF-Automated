import React from 'react';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

function StatusBar({ status, onRefresh }) {
  const getStatusColor = () => {
    if (!status.initialized) return 'text-red-400';
    if (status.isRunning) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusText = () => {
    if (!status.initialized) return 'Not Initialized';
    if (status.isRunning) return `Running: ${status.currentOperation}`;
    return 'Ready';
  };

  const getStatusIcon = () => {
    if (!status.initialized) return AlertCircle;
    if (status.isRunning) return RefreshCw;
    return CheckCircle;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <StatusIcon className={`w-4 h-4 ${getStatusColor()} ${status.isRunning ? 'animate-spin' : ''}`} />
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      
      <button
        onClick={onRefresh}
        className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
        title="Refresh Status"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}

export default StatusBar;