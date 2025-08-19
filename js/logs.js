/**
 * PlanWise Lite - Logs Service
 * Handles error logging, debugging, and log viewer functionality
 */

class PlanWiseLogsService {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      FATAL: 4
    };
    this.currentLevel = this.logLevels.INFO;
    this.init();
  }

  /**
   * Initialize logging system
   */
  init() {
    this.setupErrorHandlers();
    this.setupLogViewer();
    this.log('Logs service initialized', 'INFO');
  }

  /**
   * Setup global error handlers
   */
  setupErrorHandlers() {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.log(`JavaScript Error: ${event.message}`, 'ERROR', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
      
      // Show toast notification
      if (window.uiService) {
        window.uiService.showToast(`Error: ${event.message}`, 'error');
      }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log(`Unhandled Promise Rejection: ${event.reason}`, 'ERROR', {
        reason: event.reason,
        stack: event.reason?.stack
      });
      
      // Show toast notification
      if (window.uiService) {
        window.uiService.showToast(`Promise Error: ${event.reason}`, 'error');
      }
    });

    // Handle console errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.log(`Console Error: ${args.join(' ')}`, 'ERROR');
      originalConsoleError.apply(console, args);
    };

    // Handle console warnings
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      this.log(`Console Warning: ${args.join(' ')}`, 'WARN');
      originalConsoleWarn.apply(console, args);
    };
  }

  /**
   * Setup log viewer functionality
   */
  setupLogViewer() {
    // Add keyboard shortcut to show/hide log viewer
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+L to toggle log viewer
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.toggleLogViewer();
      }
    });

    // Add log viewer button to page (for debugging)
    setTimeout(() => {
      this.addLogViewerButton();
    }, 1000);
  }

  /**
   * Add log viewer button to page
   */
  addLogViewerButton() {
    const button = document.createElement('button');
    button.textContent = '📋 Logs';
    button.className = 'btn btn-small';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.left = '20px';
    button.style.zIndex = '9999';
    button.style.opacity = '0.7';
    button.onclick = () => this.toggleLogViewer();
    
    document.body.appendChild(button);
  }

  /**
   * Log a message
   */
  log(message, level = 'INFO', data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Add to logs array
    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console if level is appropriate
    if (this.logLevels[level] >= this.currentLevel) {
      const consoleMethod = this.getConsoleMethod(level);
      consoleMethod(`[${level}] ${message}`, data || '');
    }

    // Update log viewer if it's open
    this.updateLogViewer();
  }

  /**
   * Get console method for log level
   */
  getConsoleMethod(level) {
    switch (level) {
      case 'DEBUG':
        return console.debug;
      case 'INFO':
        return console.info;
      case 'WARN':
        return console.warn;
      case 'ERROR':
      case 'FATAL':
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Toggle log viewer visibility
   */
  toggleLogViewer() {
    const logViewer = document.getElementById('logViewer');
    if (logViewer) {
      const isVisible = logViewer.classList.contains('show');
      if (isVisible) {
        this.hideLogViewer();
      } else {
        this.showLogViewer();
      }
    }
  }

  /**
   * Show log viewer
   */
  showLogViewer() {
    const logViewer = document.getElementById('logViewer');
    if (logViewer) {
      logViewer.classList.add('show');
      this.updateLogViewer();
    }
  }

  /**
   * Hide log viewer
   */
  hideLogViewer() {
    const logViewer = document.getElementById('logViewer');
    if (logViewer) {
      logViewer.classList.remove('show');
    }
  }

  /**
   * Update log viewer content
   */
  updateLogViewer() {
    const logContent = document.getElementById('logContent');
    if (!logContent) return;

    // Filter logs by level
    const filteredLogs = this.logs.filter(log => 
      this.logLevels[log.level] >= this.currentLevel
    );

    // Create log entries HTML
    const logEntries = filteredLogs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const levelClass = `log-level-${log.level.toLowerCase()}`;
      const dataStr = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : '';
      
      return `<div class="log-entry ${levelClass}">
        <span class="log-time">${time}</span>
        <span class="log-level">${log.level}</span>
        <span class="log-message">${log.message}</span>
        ${dataStr ? `<pre class="log-data">${dataStr}</pre>` : ''}
      </div>`;
    }).join('');

    logContent.innerHTML = logEntries;

    // Auto-scroll to bottom
    logContent.scrollTop = logContent.scrollHeight;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.updateLogViewer();
    this.log('Logs cleared', 'INFO');
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    const logData = {
      exportedAt: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planwise-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.log('Logs exported', 'INFO');
  }

  /**
   * Set log level
   */
  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.currentLevel = this.logLevels[level];
      this.log(`Log level set to ${level}`, 'INFO');
      this.updateLogViewer();
    }
  }

  /**
   * Get current log level
   */
  getLogLevel() {
    return Object.keys(this.logLevels).find(key => 
      this.logLevels[key] === this.currentLevel
    );
  }

  /**
   * Get log statistics
   */
  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byHour: {},
      errors: 0,
      warnings: 0
    };

    this.logs.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Count errors and warnings
      if (log.level === 'ERROR' || log.level === 'FATAL') {
        stats.errors++;
      } else if (log.level === 'WARN') {
        stats.warnings++;
      }
      
      // Count by hour
      const hour = new Date(log.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    });

    return stats;
  }

  /**
   * Search logs
   */
  searchLogs(query) {
    if (!query) return this.logs;

    const searchTerm = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(searchTerm) ||
      log.level.toLowerCase().includes(searchTerm) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get logs by time range
   */
  getLogsByTimeRange(startTime, endTime) {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= startTime && logTime <= endTime;
    });
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }

  /**
   * Get error logs
   */
  getErrorLogs() {
    return this.logs.filter(log => 
      log.level === 'ERROR' || log.level === 'FATAL'
    );
  }

  /**
   * Performance logging
   */
  time(label) {
    console.time(label);
    return {
      end: () => {
        console.timeEnd(label);
        this.log(`Performance: ${label}`, 'DEBUG');
      }
    };
  }

  /**
   * Log performance measurement
   */
  measure(label, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;
    
    this.log(`Performance: ${label} took ${duration.toFixed(2)}ms`, 'DEBUG');
    return result;
  }

  /**
   * Log async performance measurement
   */
  async measureAsync(label, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    this.log(`Performance: ${label} took ${duration.toFixed(2)}ms`, 'DEBUG');
    return result;
  }

  /**
   * Log user actions
   */
  logUserAction(action, details = {}) {
    const user = window.authService?.getCurrentUser();
    const organization = window.authService?.getCurrentOrganization();
    
    this.log(`User Action: ${action}`, 'INFO', {
      ...details,
      user: user?.username,
      organization,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log API calls
   */
  logApiCall(method, endpoint, data = null, response = null, error = null) {
    this.log(`API Call: ${method} ${endpoint}`, 'DEBUG', {
      method,
      endpoint,
      data,
      response,
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log navigation
   */
  logNavigation(from, to) {
    this.log(`Navigation: ${from} → ${to}`, 'DEBUG', {
      from,
      to,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log form submissions
   */
  logFormSubmission(formName, data = {}) {
    this.log(`Form Submission: ${formName}`, 'INFO', {
      formName,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log errors with context
   */
  logError(error, context = {}) {
    this.log(`Error: ${error.message}`, 'ERROR', {
      error: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log warnings with context
   */
  logWarning(message, context = {}) {
    this.log(`Warning: ${message}`, 'WARN', {
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log info with context
   */
  logInfo(message, context = {}) {
    this.log(`Info: ${message}`, 'INFO', {
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log debug with context
   */
  logDebug(message, context = {}) {
    this.log(`Debug: ${message}`, 'DEBUG', {
      context,
      timestamp: new Date().toISOString()
    });
  }
}

// Create global instance
window.logsService = new PlanWiseLogsService();

// Global function to close log viewer
window.closeLogViewer = function() {
  window.logsService.hideLogViewer();
};
