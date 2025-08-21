import React from 'react';
import { Activity, CheckCircle, AlertCircle, Loader } from 'lucide-react';

function OperationProgress({ operation, progress, isVisible }) {
  if (!isVisible || !operation || !progress) {
    return null;
  }

  const getStageIcon = (stage) => {
    switch (stage) {
      case 'analyzing':
      case 'scanning':
        return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'converting':
      case 'burning':
        return <Loader className="w-4 h-4 text-purple-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'analyzing':
      case 'scanning':
        return 'from-blue-500 to-cyan-500';
      case 'converting':
      case 'burning':
        return 'from-purple-500 to-pink-500';
      case 'completed':
        return 'from-green-500 to-emerald-500';
      case 'error':
        return 'from-red-500 to-orange-500';
      default:
        return 'from-slate-500 to-gray-500';
    }
  };

  const formatOperationName = (op) => {
    switch (op) {
      case 'burn-tickets':
        return 'Burning Losing Tickets';
      case 'auto-spin-claim':
        return 'Converting to Prize Tickets';
      case 'full-automation':
        return 'Full Automation';
      case 'mint':
        return 'Minting Tokens';
      default:
        return op.charAt(0).toUpperCase() + op.slice(1);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStageIcon(progress.stage)}
          <div>
            <h3 className="text-lg font-semibold text-white">
              {formatOperationName(operation)}
            </h3>
            <p className="text-sm text-slate-400">
              {progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1)}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {progress.progress || 0}%
          </div>
          {progress.current && progress.total && (
            <div className="text-sm text-slate-400">
              {progress.current} / {progress.total}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${getStageColor(progress.stage)} transition-all duration-300 ease-out`}
            style={{ width: `${Math.max(0, Math.min(100, progress.progress || 0))}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-300 flex-1">
          {progress.message || 'Processing...'}
        </p>
        
        {progress.timestamp && (
          <p className="text-xs text-slate-500 ml-4">
            {new Date(progress.timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Stage-specific details */}
      {progress.stage === 'converting' && progress.current && progress.total && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-purple-400">
                {(progress.current - 1) * 10}
              </div>
              <div className="text-xs text-slate-400">Tokens Burned</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-400">
                {progress.current - 1}
              </div>
              <div className="text-xs text-slate-400">Tickets Created</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-400">
                {(progress.total - progress.current + 1) * 10}
              </div>
              <div className="text-xs text-slate-400">Remaining</div>
            </div>
          </div>
        </div>
      )}

      {progress.stage === 'burning' && progress.current && progress.total && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-red-400">
                {progress.current - 1}
              </div>
              <div className="text-xs text-slate-400">Tickets Burned</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-400">
                {progress.total - progress.current + 1}
              </div>
              <div className="text-xs text-slate-400">Remaining</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperationProgress;