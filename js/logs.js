/**
 * PlanWise Lite - Logging Module
 * Handles error logging and debugging
 */

class LogService {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.init();
  }

  init() {
    // Load existing logs
    this.loadLogs();
    
    // Set up global error handlers
    this.setupErrorHandlers();
  }

  setupErrorHandlers() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.log('error', 'Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });

    // Handle console errors
    const originalError = console.error;
    console.error = (...args) => {
      this.log('error', 'Console error', { args });
      originalError.apply(console, args);
    };

    // Handle console warnings
    const originalWarn = console.warn;
    console.warn = (...args) => {
      this.log('warning', 'Console warning', { args });
      originalWarn.apply(console, args);
    };
  }

  log(level, message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logs.unshift(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.saveLogs();
    
    // Also log to console for debugging
    console.log(`[${level.toUpperCase()}] ${message}`, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warning(message, data = null) {
    this.log('warning', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  loadLogs() {
    try {
      const stored = localStorage.getItem('planwise_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.logs = [];
    }
  }

  saveLogs() {
    try {
      localStorage.setItem('planwise_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  getLogs(level = null) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.saveLogs();
  }

  getErrorCount() {
    return this.logs.filter(log => log.level === 'error').length;
  }

  getWarningCount() {
    return this.logs.filter(log => log.level === 'warning').length;
  }
}

// Create global instance
window.logService = new LogService();
