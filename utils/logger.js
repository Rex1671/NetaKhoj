// utils/logger.js - PRODUCTION LOGGER
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Logger {
  constructor(namespace, options = {}) {
    this.namespace = namespace;
    this.options = {
      writeToFile: options.writeToFile ?? (process.env.LOG_TO_FILE === 'true' || process.env.NODE_ENV === 'production'),
      logDir: options.logDir || path.join(__dirname, '..', 'logs'),
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 7, // Keep 7 days
      consoleOutput: options.consoleOutput ?? true,
      ...options
    };

    this.colors = {
      INFO: '\x1b[36m',     // Cyan
      ERROR: '\x1b[31m',    // Red
      WARN: '\x1b[33m',     // Yellow
      DEBUG: '\x1b[35m',    // Magenta
      SUCCESS: '\x1b[32m',  // Green
      REQUEST: '\x1b[34m',  // Blue
      RESET: '\x1b[0m',
    };

    this.icons = {
      INFO: 'ℹ️',
      ERROR: '❌',
      WARN: '⚠️',
      DEBUG: '🔍',
      SUCCESS: '✅',
      REQUEST: '🌐',
    };

    if (this.options.writeToFile) {
      this._ensureLogDir();
      this._cleanupOldLogs();
    }
  }

  _ensureLogDir() {
    if (!fs.existsSync(this.options.logDir)) {
      fs.mkdirSync(this.options.logDir, { recursive: true });
    }
  }

  _getLogFilePath(level) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = level === 'REQUEST' ? 'requests' : level === 'ERROR' ? 'error' : 'combined';
    return path.join(this.options.logDir, `${date}-${filename}.log`);
  }

  _rotateLogIfNeeded(filepath) {
    if (!fs.existsSync(filepath)) return;
    
    const stats = fs.statSync(filepath);
    if (stats.size > this.options.maxFileSize) {
      const timestamp = Date.now();
      const rotatedPath = filepath.replace('.log', `.${timestamp}.log`);
      fs.renameSync(filepath, rotatedPath);
      console.log(`🔄 Log rotated: ${path.basename(rotatedPath)}`);
    }
  }

  _writeToFile(level, logEntry) {
    if (!this.options.writeToFile) return;

    try {
      const filepath = this._getLogFilePath(level);
      this._rotateLogIfNeeded(filepath);
      
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(filepath, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }
  }

  _formatConsoleMessage(level, requestId, message, data) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const color = this.colors[level] || '';
    const icon = this.icons[level] || '';
    const reset = this.colors.RESET;
    
    const prefix = `${color}${icon} [${timestamp}] [${this.namespace}] [${requestId}]${reset}`;
    
    let dataStr = '';
    if (data) {
      if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length <= 3) {
          dataStr = ' ' + JSON.stringify(data);
        } else {
          dataStr = '\n' + JSON.stringify(data, null, 2);
        }
      } else {
        dataStr = ' ' + data;
      }
    }
    
    return `${prefix} ${message}${dataStr}`;
  }

  _log(level, requestId, message, data) {
    const timestamp = new Date().toISOString();
    
    // Create structured log entry
    const logEntry = {
      timestamp,
      level,
      namespace: this.namespace,
      requestId,
      message,
      ...(data && { data }),
      pid: process.pid,
      memory: process.memoryUsage().heapUsed
    };

    // Console output
    if (this.options.consoleOutput) {
      const consoleMsg = this._formatConsoleMessage(level, requestId, message, data);
      const logMethod = level === 'ERROR' ? console.error : console.log;
      logMethod(consoleMsg);
    }

    // File output
    this._writeToFile(level, logEntry);
  }

  info(requestId, message, data) {
    this._log('INFO', requestId, message, data);
  }

  error(requestId, message, error) {
    const errorData = error ? {
      message: error?.message || error,
      name: error?.name,
      code: error?.code,
      statusCode: error?.statusCode,
      ...(error?.stack ? { stack: error.stack.split('\n').slice(0, 5) } : {})
    } : null;
    
    this._log('ERROR', requestId, message, errorData);
  }

  warn(requestId, message, data) {
    this._log('WARN', requestId, message, data);
  }

  debug(requestId, message, data) {
    if (process.env.DEBUG === 'true') {
      this._log('DEBUG', requestId, message, data);
    }
  }

  success(requestId, message, data) {
    this._log('SUCCESS', requestId, message, data);
  }

  request(requestId, message, params) {
    const sanitized = { ...params };
    // Don't log sensitive data
    if (sanitized.meow) sanitized.meow = '***';
    if (sanitized.bhaw) sanitized.bhaw = '***';
    if (sanitized.apiKey) sanitized.apiKey = '***';

    this._log('REQUEST', requestId, message, sanitized);
  }

  // Store response data to file
  storeResponse(requestId, message, responseData) {
    if (!this.options.writeToFile) return;

    try {
      const date = new Date().toISOString().split('T')[0];
      const filepath = path.join(this.options.logDir, `${date}-prs-responses.log`);
      this._rotateLogIfNeeded(filepath);

      const logEntry = {
        timestamp: new Date().toISOString(),
        namespace: this.namespace,
        requestId,
        message,
        responseData,
        pid: process.pid
      };

      const logLine = JSON.stringify(logEntry, null, 2) + '\n---\n';
      fs.appendFileSync(filepath, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to store response:', error.message);
    }
  }

  // Cleanup old logs
  _cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.options.logDir);
      const cutoffDate = Date.now() - (this.options.maxFiles * 24 * 60 * 60 * 1000);
      let deleted = 0;

      files.forEach(file => {
        const filepath = path.join(this.options.logDir, file);
        const stats = fs.statSync(filepath);

        if (stats.mtimeMs < cutoffDate) {
          fs.unlinkSync(filepath);
          deleted++;
        }
      });

      if (deleted > 0) {
        console.log(`🧹 Log cleanup: Deleted ${deleted} old log files`);
      }
    } catch (error) {
      console.error('Failed to cleanup logs:', error.message);
    }
  }

  cleanupOldLogs() {
    this._cleanupOldLogs();
  }

  getStats() {
    try {
      const files = fs.readdirSync(this.options.logDir);
      let totalSize = 0;
      
      files.forEach(file => {
        const filepath = path.join(this.options.logDir, file);
        totalSize += fs.statSync(filepath).size;
      });

      return {
        logDir: this.options.logDir,
        files: files.length,
        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
        maxFileSize: `${(this.options.maxFileSize / 1024 / 1024).toFixed(2)} MB`,
        maxFiles: this.options.maxFiles
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

export const createLogger = (namespace, options) => new Logger(namespace, options);
export default new Logger('APP');