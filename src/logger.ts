/**
 * Logging utilities for White Rabbit server, inspired by vLLM's logging system
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  level: LogLevel;
  prefix: string;
  enableColors: boolean;
  dateFormat: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  prefix: "🐰",
  enableColors: true,
  dateFormat: "MM-DD HH:mm:ss",
};

class Logger {
  public config: LoggerConfig;
  private onceCache: Set<string> = new Set();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private formatTimestamp(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private formatMessage(
    level: string,
    message: string,
    filename?: string,
    lineNumber?: number,
  ): string {
    const timestamp = this.formatTimestamp();
    const location = filename && lineNumber ? `[${filename}:${lineNumber}]` : "";
    return `${this.config.prefix} ${level} ${timestamp} ${location} ${message}`;
  }

  private colorize(text: string, level: LogLevel): string {
    if (!this.config.enableColors) return text;

    const colors = {
      [LogLevel.DEBUG]: "\x1b[36m", // Cyan
      [LogLevel.INFO]: "\x1b[32m", // Green
      [LogLevel.WARNING]: "\x1b[33m", // Yellow
      [LogLevel.ERROR]: "\x1b[31m", // Red
    };

    const reset = "\x1b[0m";
    return `${colors[level]}${text}${reset}`;
  }

  private log(level: LogLevel, message: string, filename?: string, lineNumber?: number): void {
    if (level < this.config.level) return;

    const levelNames = {
      [LogLevel.DEBUG]: "DEBUG",
      [LogLevel.INFO]: "INFO ",
      [LogLevel.WARNING]: "WARNING",
      [LogLevel.ERROR]: "ERROR",
    };

    const levelName = levelNames[level];
    const formattedMessage = this.formatMessage(levelName, message, filename, lineNumber);
    const coloredMessage = this.colorize(formattedMessage, level);

    if (level >= LogLevel.WARNING) {
      console.error(coloredMessage);
    } else {
      console.log(coloredMessage);
    }
  }

  debug(message: string, filename?: string, lineNumber?: number): void {
    this.log(LogLevel.DEBUG, message, filename, lineNumber);
  }

  info(message: string, filename?: string, lineNumber?: number): void {
    this.log(LogLevel.INFO, message, filename, lineNumber);
  }

  warning(message: string, filename?: string, lineNumber?: number): void {
    this.log(LogLevel.WARNING, message, filename, lineNumber);
  }

  error(message: string, filename?: string, lineNumber?: number): void {
    this.log(LogLevel.ERROR, message, filename, lineNumber);
  }

  // "Once" variants that only log the first occurrence of a message
  debugOnce(message: string, filename?: string, lineNumber?: number): void {
    const key = `DEBUG:${message}`;
    if (this.onceCache.has(key)) return;
    this.onceCache.add(key);
    this.debug(message, filename, lineNumber);
  }

  infoOnce(message: string, filename?: string, lineNumber?: number): void {
    const key = `INFO:${message}`;
    if (this.onceCache.has(key)) return;
    this.onceCache.add(key);
    this.info(message, filename, lineNumber);
  }

  warningOnce(message: string, filename?: string, lineNumber?: number): void {
    const key = `WARNING:${message}`;
    if (this.onceCache.has(key)) return;
    this.onceCache.add(key);
    this.warning(message, filename, lineNumber);
  }

  errorOnce(message: string, filename?: string, lineNumber?: number): void {
    const key = `ERROR:${message}`;
    if (this.onceCache.has(key)) return;
    this.onceCache.add(key);
    this.error(message, filename, lineNumber);
  }
}

// Global logger instance
const globalLogger = new Logger();

// Configure logging based on environment variables
function configureLogger(): void {
  const level = Deno.env.get("WR_LOG_LEVEL")?.toUpperCase();
  const prefix = Deno.env.get("WR_LOG_PREFIX");
  const enableColors = Deno.env.get("WR_LOG_COLORS") !== "false";

  const config: Partial<LoggerConfig> = {
    level: LogLevel.INFO, // Default level
    enableColors,
  };

  if (level) {
    switch (level) {
      case "DEBUG":
        config.level = LogLevel.DEBUG;
        break;
      case "INFO":
        config.level = LogLevel.INFO;
        break;
      case "WARNING":
      case "WARN":
        config.level = LogLevel.WARNING;
        break;
      case "ERROR":
        config.level = LogLevel.ERROR;
        break;
        // Invalid levels will keep the default INFO level
    }
  }

  if (prefix) {
    config.prefix = prefix;
  }

  globalLogger.config = { ...globalLogger.config, ...config };
}

// Reconfigure logging based on current environment variables
export function reconfigureLogger(): void {
  configureLogger();
}

// Initialize logger configuration
configureLogger();

// Factory function to create module-specific loggers
export function initLogger(moduleName: string): Logger {
  const moduleConfig: Partial<LoggerConfig> = {
    ...globalLogger.config,
    prefix: `${globalLogger.config.prefix}:${moduleName}`,
  };
  return new Logger(moduleConfig);
}

// Export the global logger as default
export default globalLogger;
