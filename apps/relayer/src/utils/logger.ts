import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'balloon-pump-relayer' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
        })
      )
    }),

    // File transport for production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      })
    ] : [])
  ]
});

// Add method for logging with request context
export const createRequestLogger = (requestId: string, userAddress: string) => ({
  info: (message: string, meta?: any) =>
    logger.info(message, { requestId, userAddress, ...meta }),
  warn: (message: string, meta?: any) =>
    logger.warn(message, { requestId, userAddress, ...meta }),
  error: (message: string, meta?: any) =>
    logger.error(message, { requestId, userAddress, ...meta }),
  debug: (message: string, meta?: any) =>
    logger.debug(message, { requestId, userAddress, ...meta })
});
