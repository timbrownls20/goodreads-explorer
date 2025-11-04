import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Create Winston logger instance
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }), // Include stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.json(), // JSON format for structured logging
  ),
  defaultMeta: {
    service: 'analytics-dashboard-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console output (pretty-printed in development)
    new transports.Console({
      format:
        process.env.NODE_ENV === 'development'
          ? combine(colorize(), timestamp(), consoleFormat)
          : combine(timestamp(), format.json()),
    }),
  ],
});

// Helper function for logging with context
export const logWithContext = (
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: Record<string, any>,
) => {
  logger.log(level, message, context);
};

export default logger;
