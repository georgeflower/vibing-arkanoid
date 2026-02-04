/**
 * Debug Logger - Stores debug logs with 500 row limit (circular buffer)
 * Persists to localStorage and can be exported for troubleshooting
 */

export interface DebugLogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error';
  message: string;
  data?: any;
}

const MAX_LOGS = 500;
const STORAGE_KEY = 'vibing_arkanoid_debug_logs';
const SAVE_DEBOUNCE_MS = 5000; // Debounce localStorage saves to 5 seconds (reduced from 2s for mobile perf)

class DebugLogger {
  private logs: DebugLogEntry[] = [];
  private enabled: boolean = true;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  };
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingSave: boolean = false;

  constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };

    // Load existing logs from localStorage
    this.loadFromStorage();
  }

  /**
   * Initialize console interception for debug-related logs
   * Optimized to avoid expensive serialization during lag events (prevents lag-detecting-lag cascade)
   */
  intercept() {
    const self = this;

    // Override console.log for [LAG] and [CCD] prefixed messages
    console.log = function (...args: any[]) {
      self.originalConsole.log(...args);
      
      // Fast path: check first arg without serialization
      const firstArg = args[0];
      if (typeof firstArg === 'string') {
        // Use startsWith for faster matching (avoids scanning full string)
        if (firstArg.startsWith('[LAG')) {
          // Lightweight logging for lag events - skip data serialization entirely
          self.addLogLite('log', firstArg);
          return;
        }
        if (firstArg.startsWith('[CCD') || firstArg.startsWith('[DEBUG')) {
          self.addLog('log', firstArg, args.length > 1 ? args.slice(1) : undefined);
        }
      }
    };

    // Override console.warn
    console.warn = function (...args: any[]) {
      self.originalConsole.warn(...args);
      
      const firstArg = args[0];
      if (typeof firstArg === 'string') {
        if (firstArg.startsWith('[LAG')) {
          self.addLogLite('warn', firstArg);
          return;
        }
        if (firstArg.startsWith('[CCD') || firstArg.startsWith('[DEBUG')) {
          self.addLog('warn', firstArg, args.length > 1 ? args.slice(1) : undefined);
        }
      }
    };

    // Override console.error
    console.error = function (...args: any[]) {
      self.originalConsole.error(...args);
      
      const firstArg = args[0];
      if (typeof firstArg === 'string') {
        if (firstArg.startsWith('[LAG')) {
          self.addLogLite('error', firstArg);
          return;
        }
        if (firstArg.startsWith('[CCD') || firstArg.startsWith('[DEBUG')) {
          self.addLog('error', firstArg, args.length > 1 ? args.slice(1) : undefined);
        }
      }
    };

    this.originalConsole.log('[DebugLogger] Console interception enabled');
  }

  /**
   * Restore original console methods
   */
  restore() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
  }

  /**
   * Add a log entry (circular buffer - overwrites oldest when full)
   */
  addLog(level: DebugLogEntry['level'], message: string, data?: any) {
    if (!this.enabled) return;

    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? this.sanitizeData(data) : undefined,
    };

    // Circular buffer - remove oldest if at capacity
    if (this.logs.length >= MAX_LOGS) {
      this.logs.shift();
    }

    this.logs.push(entry);
    this.saveToStorage();
  }

  /**
   * Lightweight log entry - skips data serialization entirely
   * Use for high-frequency events like lag detection to avoid cascade effect
   */
  addLogLite(level: DebugLogEntry['level'], message: string) {
    if (!this.enabled) return;

    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: undefined, // Skip serialization entirely
    };

    if (this.logs.length >= MAX_LOGS) {
      this.logs.shift();
    }

    this.logs.push(entry);
    this.saveToStorage();
  }

  /**
   * Sanitize data to prevent circular references and limit size
   */
  private sanitizeData(data: any): any {
    try {
      const str = JSON.stringify(data, (key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value instanceof HTMLElement) return '[HTMLElement]';
        return value;
      });
      // Limit data size to 1KB per entry
      if (str.length > 1024) {
        return str.substring(0, 1024) + '...[truncated]';
      }
      return JSON.parse(str);
    } catch {
      return '[Unable to serialize]';
    }
  }

  /**
   * Direct logging methods
   */
  log(message: string, data?: any) {
    this.originalConsole.log(`[DEBUG] ${message}`, data);
    this.addLog('log', `[DEBUG] ${message}`, data);
  }

  warn(message: string, data?: any) {
    this.originalConsole.warn(`[DEBUG] ${message}`, data);
    this.addLog('warn', `[DEBUG] ${message}`, data);
  }

  error(message: string, data?: any) {
    this.originalConsole.error(`[DEBUG] ${message}`, data);
    this.addLog('error', `[DEBUG] ${message}`, data);
  }

  /**
   * Get all logs
   */
  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs as formatted string
   */
  getLogsAsText(): string {
    return this.logs.map(log => {
      const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
      return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${dataStr}`;
    }).join('\n');
  }

  /**
   * Get log count
   */
  getCount(): number {
    return this.logs.length;
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    this.saveToStorage();
    this.originalConsole.log('[DebugLogger] Logs cleared');
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Save logs to localStorage (debounced to reduce I/O overhead)
   */
  private saveToStorage() {
    this.pendingSave = true;
    
    // Debounce: save at most once every 2 seconds
    if (this.saveTimeout) return;
    
    this.saveTimeout = setTimeout(() => {
      if (this.pendingSave) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
        } catch (e) {
          // localStorage might be full or unavailable
          this.originalConsole.warn('[DebugLogger] Failed to save to localStorage', e);
        }
        this.pendingSave = false;
      }
      this.saveTimeout = null;
    }, SAVE_DEBOUNCE_MS);
  }

  /**
   * Force immediate save (for critical events or before page unload)
   */
  flushToStorage() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
      this.pendingSave = false;
    } catch (e) {
      this.originalConsole.warn('[DebugLogger] Failed to flush to localStorage', e);
    }
  }

  /**
   * Load logs from localStorage
   */
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
        // Ensure we don't exceed MAX_LOGS
        if (this.logs.length > MAX_LOGS) {
          this.logs = this.logs.slice(-MAX_LOGS);
        }
      }
    } catch (e) {
      this.originalConsole.warn('[DebugLogger] Failed to load from localStorage', e);
      this.logs = [];
    }
  }

  /**
   * Download logs as a file
   */
  downloadLogs() {
    const text = this.getLogsAsText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get summary statistics
   */
  getStats() {
    const errors = this.logs.filter(l => l.level === 'error').length;
    const warns = this.logs.filter(l => l.level === 'warn').length;
    const lagEvents = this.logs.filter(l => l.message.includes('[LAG')).length;
    const ccdEvents = this.logs.filter(l => l.message.includes('[CCD')).length;
    const gcEvents = this.logs.filter(l => l.message.includes('[GC')).length;
    
    // Calculate average and max lag gap from lag logs
    const lagLogs = this.logs.filter(l => l.message.includes('[LAG DETECTED]'));
    const lagGaps = lagLogs.map(l => {
      const match = l.message.match(/Frame gap: ([\d.]+)ms/);
      return match ? parseFloat(match[1]) : 0;
    }).filter(g => g > 0);
    
    const avgLagGap = lagGaps.length > 0 
      ? lagGaps.reduce((a, b) => a + b, 0) / lagGaps.length 
      : 0;
    const maxLagGap = lagGaps.length > 0 ? Math.max(...lagGaps) : 0;
    
    return {
      total: this.logs.length,
      errors,
      warns,
      logs: this.logs.length - errors - warns,
      lagEvents,
      ccdEvents,
      gcEvents,
      avgLagGap: avgLagGap.toFixed(1),
      maxLagGap: maxLagGap.toFixed(1),
      maxCapacity: MAX_LOGS,
    };
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger;
}
