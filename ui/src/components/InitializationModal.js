import React, { useState } from 'react';
import { Key, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

function InitializationModal({ onInitialize, onClose, error }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useEnvFile, setUseEnvFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onInitialize(useEnvFile ? null : password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 card-glow">
        <div className="flex items-center mb-4">
          <Key className="w-6 h-6 text-blue-400 mr-3" />
          <h2 className="text-xl font-bold">Initialize SpotSpinner</h2>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-3 mb-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-200 text-sm">{error}</p>
              {error.includes('npm run secure-setup') && (
                <p className="text-red-300 text-xs mt-1">
                  Run this in your terminal to set up encrypted storage.
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={!useEnvFile}
                onChange={() => setUseEnvFile(false)}
                className="text-blue-600"
              />
              <span className="text-sm">Use encrypted private key (recommended)</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={useEnvFile}
                onChange={() => setUseEnvFile(true)}
                className="text-blue-600"
              />
              <span className="text-sm">Use .env file</span>
            </label>
          </div>

          {!useEnvFile && (
            <div className="space-y-2">
              <label className="block text-sm text-slate-400">
                Encryption Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Enter your encryption password"
                  required={!useEnvFile}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                This is the password you used when running "npm run secure-setup"
              </p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (!useEnvFile && !password)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Lock className="w-4 h-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                'Initialize'
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-400">
            <strong>First time setup?</strong> Run <code className="bg-slate-700 px-1 rounded">npm run secure-setup</code> in your terminal to encrypt your private key.
          </p>
        </div>
      </div>
    </div>
  );
}

export default InitializationModal;