/**
 * Structured logging with Pino
 *
 * Provides a centralized logger for the application.
 * Configured for both development and production environments.
 */

import pino from 'pino';

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logger instance
export const logger = pino({
  level: logLevel,
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger with additional context
 *
 * @param context - Additional context to include in all logs
 * @example
 * const gsiLogger = createLogger({ module: 'GSI' });
 * gsiLogger.info('Payload received');
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

// Module-specific loggers
export const gsiLogger = createLogger({ module: 'GSI' });
export const wsLogger = createLogger({ module: 'WebSocket' });
export const apiLogger = createLogger({ module: 'API' });
