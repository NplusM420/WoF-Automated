import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DailyAutomationManager {
  constructor(logger = console.log) {
    this.log = logger;
    this.scheduleFile = path.join(__dirname, '../.automation-schedule.json');
    this.currentTimeout = null;
    this.isEnabled = false;
    this.nextRunTime = null;
    this.lastCompletedTime = null;
    this.onAutomationTriggered = null; // Callback for when automation should run
    
    this.loadSchedule();
  }

  // Load schedule from disk (survives server restarts)
  loadSchedule() {
    try {
      if (fs.existsSync(this.scheduleFile)) {
        const data = JSON.parse(fs.readFileSync(this.scheduleFile, 'utf8'));
        this.isEnabled = data.isEnabled || false;
        this.nextRunTime = data.nextRunTime || null;
        this.lastCompletedTime = data.lastCompletedTime || null;
        
        // If there's a scheduled run and automation is enabled, restore the timer
        if (this.isEnabled && this.nextRunTime) {
          this.scheduleNextRun(this.nextRunTime, true); // true = restore from disk
        }
        
        this.log(`📅 Daily automation loaded: Enabled=${this.isEnabled}, Next=${this.getNextRunString()}`);
      }
    } catch (error) {
      this.log(`⚠️  Failed to load automation schedule: ${error.message}`);
    }
  }

  // Save schedule to disk
  saveSchedule() {
    try {
      const data = {
        isEnabled: this.isEnabled,
        nextRunTime: this.nextRunTime,
        lastCompletedTime: this.lastCompletedTime,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.scheduleFile, JSON.stringify(data, null, 2));
    } catch (error) {
      this.log(`⚠️  Failed to save automation schedule: ${error.message}`);
    }
  }

  // Enable daily automation
  enable() {
    this.isEnabled = true;
    this.log(`✅ Daily automation enabled`);
    
    // If we have a last completed time, schedule the next run
    if (this.lastCompletedTime) {
      const nextTime = this.calculateNextRunTime(this.lastCompletedTime);
      this.scheduleNextRun(nextTime);
    } else {
      this.log(`💡 Daily automation enabled but no previous completion time. Will schedule after next manual run.`);
    }
    
    this.saveSchedule();
  }

  // Disable daily automation
  disable() {
    this.isEnabled = false;
    this.clearScheduledRun();
    this.log(`❌ Daily automation disabled`);
    this.saveSchedule();
  }

  // Record completion of mint cycle and schedule next run if enabled
  recordCompletedRun(timestamp = null) {
    const completionTime = timestamp || Date.now();
    this.lastCompletedTime = completionTime;
    
    this.log(`📝 Recorded completion at ${new Date(completionTime).toLocaleString()}`);
    
    if (this.isEnabled) {
      const nextTime = this.calculateNextRunTime(completionTime);
      this.scheduleNextRun(nextTime);
    }
    
    this.saveSchedule();
  }

  // Calculate next run time: 24 hours + 2 minute buffer
  calculateNextRunTime(fromTime) {
    const COOLDOWN_HOURS = 24;
    const SAFETY_BUFFER_MINUTES = 2;
    const nextTime = fromTime + (COOLDOWN_HOURS * 60 * 60 * 1000) + (SAFETY_BUFFER_MINUTES * 60 * 1000);
    return nextTime;
  }

  // Schedule the next automation run
  scheduleNextRun(timestamp, isRestore = false) {
    // Clear any existing timeout
    this.clearScheduledRun();
    
    const now = Date.now();
    const delay = timestamp - now;
    
    if (delay <= 0) {
      // Time has already passed
      if (isRestore) {
        this.log(`⚠️  Scheduled time has passed during restore. Consider running automation manually.`);
      } else {
        this.log(`⚠️  Calculated time is in the past, scheduling for immediate run`);
        this.triggerAutomation();
      }
      return;
    }
    
    this.nextRunTime = timestamp;
    this.currentTimeout = setTimeout(() => {
      this.triggerAutomation();
    }, delay);
    
    const runTimeString = new Date(timestamp).toLocaleString();
    const hoursUntil = Math.round(delay / (1000 * 60 * 60));
    
    this.log(`⏰ Daily automation scheduled for ${runTimeString} (${hoursUntil}h from now)`);
    this.saveSchedule();
  }

  // Clear scheduled run
  clearScheduledRun() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.nextRunTime = null;
  }

  // Trigger the automation (calls the callback)
  async triggerAutomation() {
    this.log(`🚀 Daily automation triggered!`, 'info');
    this.clearScheduledRun();
    
    try {
      if (this.onAutomationTriggered && typeof this.onAutomationTriggered === 'function') {
        await this.onAutomationTriggered();
      } else {
        this.log(`⚠️  No automation callback set`, 'warning');
      }
    } catch (error) {
      this.log(`❌ Daily automation failed: ${error.message}`, 'error');
    }
  }

  // Get status for UI
  getStatus() {
    const now = Date.now();
    
    return {
      isEnabled: this.isEnabled,
      nextRunTime: this.nextRunTime,
      nextRunString: this.getNextRunString(),
      timeUntilNext: this.nextRunTime ? Math.max(0, this.nextRunTime - now) : null,
      lastCompletedTime: this.lastCompletedTime,
      lastCompletedString: this.lastCompletedTime 
        ? new Date(this.lastCompletedTime).toLocaleString()
        : null
    };
  }

  // Get human-readable next run time
  getNextRunString() {
    if (!this.nextRunTime) return null;
    return new Date(this.nextRunTime).toLocaleString();
  }

  // Set the callback function to trigger automation
  setAutomationCallback(callback) {
    this.onAutomationTriggered = callback;
  }

  // Get time remaining as human readable string
  getTimeRemaining() {
    if (!this.nextRunTime) return null;
    
    const remaining = this.nextRunTime - Date.now();
    if (remaining <= 0) return "Ready to run";
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}