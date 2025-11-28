import winston from 'winston';

// Create Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}] ${message}`;
          if (Object.keys(meta).length > 0 && !meta.stack) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          if (meta.stack) {
            msg += `\n${meta.stack}`;
          }
          return msg;
        })
      ),
    }),
  ],
});

// Add file transport if LOG_FILE is set
if (process.env.LOG_FILE) {
  logger.add(
    new winston.transports.File({
      filename: process.env.LOG_FILE,
      format: winston.format.json(),
    })
  );
}
