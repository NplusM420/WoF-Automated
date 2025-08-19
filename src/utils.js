// Utility functions for error handling and retry logic

export class RetryHelper {
  static async withRetry(operation, maxRetries = 3, delayMs = 1000) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}...`);
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;
        console.log(`Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = delayMs * attempt; // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`Operation failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
  }
  
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ErrorHandler {
  static isRetryableError(error) {
    const retryableMessages = [
      'network error',
      'timeout',
      'connection refused',
      'temporary failure',
      'rate limit',
      'server error',
      'internal error',
      'bad gateway',
      'service unavailable',
      'gateway timeout'
    ];
    
    const message = error.message.toLowerCase();
    return retryableMessages.some(msg => message.includes(msg));
  }
  
  static isInsufficientFundsError(error) {
    const message = error.message.toLowerCase();
    return message.includes('insufficient funds') || 
           message.includes('insufficient balance') ||
           message.includes('insufficient ether');
  }
  
  static isGasError(error) {
    const message = error.message.toLowerCase();
    return message.includes('gas') || 
           message.includes('out of gas') ||
           message.includes('gas limit exceeded');
  }
  
  static isNonceError(error) {
    const message = error.message.toLowerCase();
    return message.includes('nonce') || 
           message.includes('already known') ||
           message.includes('replacement transaction underpriced');
  }
  
  static categorizeError(error) {
    if (this.isInsufficientFundsError(error)) {
      return 'INSUFFICIENT_FUNDS';
    }
    if (this.isGasError(error)) {
      return 'GAS_ERROR';
    }
    if (this.isNonceError(error)) {
      return 'NONCE_ERROR';
    }
    if (this.isRetryableError(error)) {
      return 'RETRYABLE';
    }
    return 'UNKNOWN';
  }
  
  static getErrorSuggestion(error) {
    const category = this.categorizeError(error);
    
    switch (category) {
      case 'INSUFFICIENT_FUNDS':
        return 'Add more APE tokens to your wallet to cover gas fees';
      case 'GAS_ERROR':
        return 'Try increasing gas limit or wait for network congestion to reduce';
      case 'NONCE_ERROR':
        return 'Wait a moment and try again, or check for pending transactions';
      case 'RETRYABLE':
        return 'This appears to be a temporary network issue, retrying automatically';
      default:
        return 'Check the error details and contract interaction parameters';
    }
  }
}

export class TransactionMonitor {
  static async waitForConfirmation(provider, txHash, maxWaitTime = 300000) { // 5 minutes
    console.log(`Monitoring transaction: ${txHash}`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const receipt = await provider.getTransactionReceipt(txHash);
        
        if (receipt) {
          if (receipt.status === 1) {
            console.log(`✅ Transaction confirmed: ${txHash}`);
            return receipt;
          } else {
            throw new Error(`Transaction failed: ${txHash}`);
          }
        }
        
        // Wait 5 seconds before checking again
        await RetryHelper.sleep(5000);
        
      } catch (error) {
        if (error.message.includes('Transaction failed')) {
          throw error;
        }
        // Continue waiting for other errors
        console.log('Checking transaction status...');
        await RetryHelper.sleep(5000);
      }
    }
    
    throw new Error(`Transaction confirmation timeout: ${txHash}`);
  }
}