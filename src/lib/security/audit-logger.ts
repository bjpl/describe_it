import winston, { Logger, LoggerOptions, format } from 'winston';
import path from 'path';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

export interface AuditEvent {
  action: string;
  resource?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface AuditLoggerConfig {
  level?: string;
  filename?: string;
  maxSize?: string;
  maxFiles?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  sensitiveFields?: string[];
}

const DEFAULT_CONFIG: Required<AuditLoggerConfig> = {
  level: 'info',
  filename: 'security-audit.log',
  maxSize: '20m',
  maxFiles: '14d',
  enableConsole: process.env.NODE_ENV === 'development',
  enableFile: true,
  sensitiveFields: ['password', 'token', 'key', 'secret', 'authorization'],
};

class AuditLogger {
  private logger: Logger;
  private config: Required<AuditLoggerConfig>;

  constructor(component: string, config: AuditLoggerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = this.createLogger(component);
  }

  private createLogger(component: string): Logger {
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, this.config.filename);

    const customFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.json(),
      format.printf((info) => {
        const sanitized = this.sanitizeLog(info);
        return safeStringify({
          timestamp: sanitized.timestamp,
          level: sanitized.level,
          component,
          message: sanitized.message,
          ...sanitized,
        }, '{}', 'audit-logger');
      })
    );

    const transports: winston.transport[] = [];

    if (this.config.enableFile) {
      transports.push(
        new winston.transports.File({
          filename: logFile,
          level: this.config.level,
          format: customFormat,
          maxsize: parseInt(this.config.maxSize) || this.parseSize(this.config.maxSize),
          maxFiles: parseInt(this.config.maxFiles) || 14,
          tailable: true,
        })
      );
    }

    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          level: this.config.level,
          format: format.combine(
            format.colorize(),
            format.simple(),
            format.printf((info) => {
              const sanitized = this.sanitizeLog(info);
              return `${sanitized.timestamp} [${sanitized.level}] ${component}: ${sanitized.message}`;
            })
          ),
        })
      );
    }

    const loggerOptions: LoggerOptions = {
      level: this.config.level,
      transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
    };

    return winston.createLogger(loggerOptions);
  }

  private parseSize(size: string): number {
    const units = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
    const match = size.toLowerCase().match(/^(\d+)([kmg]?)$/);
    if (!match) return 20 * 1024 * 1024; // Default 20MB
    
    const value = parseInt(match[1], 10);
    const unit = match[2] as keyof typeof units;
    return value * (units[unit] || 1);
  }

  private sanitizeLog(logData: any): any {
    if (typeof logData !== 'object' || logData === null) {
      return logData;
    }

    const sanitized = { ...logData };
    
    for (const field of this.config.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeLog(sanitized[key]);
      }
    }

    return sanitized;
  }

  auditEvent(event: AuditEvent): void {
    const auditData = {
      action: event.action,
      resource: event.resource,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      success: event.success,
      timestamp: event.timestamp || new Date(),
      metadata: event.metadata || {},
    };

    if (event.success) {
      this.logger.info('Audit event', auditData);
    } else {
      this.logger.warn('Failed audit event', auditData);
    }
  }

  securityEvent(action: string, details: Record<string, any>, success: boolean = true): void {
    this.auditEvent({
      action: `SECURITY:${action}`,
      success,
      metadata: details,
    });
  }

  accessEvent(resource: string, action: string, userId?: string, success: boolean = true): void {
    this.auditEvent({
      action: `ACCESS:${action}`,
      resource,
      userId,
      success,
    });
  }

  authenticationEvent(userId: string, method: string, ip?: string, success: boolean = true): void {
    this.auditEvent({
      action: `AUTH:${method}`,
      userId,
      ip,
      success,
      metadata: { method },
    });
  }

  keyOperationEvent(operation: string, keyId: string, success: boolean = true): void {
    this.auditEvent({
      action: `KEY:${operation}`,
      resource: keyId,
      success,
      metadata: { operation },
    });
  }

  vaultOperationEvent(operation: string, path: string, success: boolean = true): void {
    this.auditEvent({
      action: `VAULT:${operation}`,
      resource: path,
      success,
      metadata: { operation },
    });
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.logger.info(message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.logger.warn(message, metadata);
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.logger.error(message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.logger.debug(message, metadata);
  }

  logEvent(event: { action: string; details: Record<string, any> }): void {
    this.auditEvent({
      action: event.action,
      success: true,
      metadata: event.details,
    });
  }
}

// Cache for audit loggers to prevent creating multiple instances
const loggerCache = new Map<string, AuditLogger>();

export function createAuditLogger(component: string, config?: AuditLoggerConfig): AuditLogger {
  const cacheKey = `${component}-${safeStringify(config || {}, '{}', 'cache-key')}`;

  if (!loggerCache.has(cacheKey)) {
    const auditLogger = new AuditLogger(component, config);
    loggerCache.set(cacheKey, auditLogger);
  }

  return loggerCache.get(cacheKey)!;
}

export function getAuditLogger(component: string, config?: AuditLoggerConfig): AuditLogger {
  const cacheKey = `${component}-${safeStringify(config || {}, '{}', 'cache-key')}`;

  if (!loggerCache.has(cacheKey)) {
    const auditLogger = new AuditLogger(component, config);
    loggerCache.set(cacheKey, auditLogger);
  }

  return loggerCache.get(cacheKey)!;
}

export { AuditLogger };