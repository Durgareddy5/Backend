const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, stack, category }) => {
    const catPrefix = category ? `[${category.toUpperCase()}] ` : '';
    return `[${timestamp}] ${level}: ${catPrefix}${stack || message}`;
  })
);

const logDirectory = path.join(process.cwd(), 'logs');

const createCategoryLogger = (categoryName) => {
  const isProduction = process.env.NODE_ENV === 'production';
  return winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { service: 'research-connect', category: categoryName },
    transports: [
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
      }),
      new winston.transports.DailyRotateFile({
        filename: path.join(logDirectory, `${categoryName}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat
      }),
      // Re-route errors from any category to error file as well
      ...(categoryName !== 'error' ? [
        new winston.transports.DailyRotateFile({
          filename: path.join(logDirectory, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error',
          format: logFormat
        })
      ] : [])
    ]
  });
};

const appLogger = createCategoryLogger('application');
const apiLogger = createCategoryLogger('api');
const dbLogger = createCategoryLogger('mongodb');
const errorLogger = createCategoryLogger('error');
const authLogger = createCategoryLogger('auth');

const logger = {
  info: (msg, ...meta) => appLogger.info(msg, ...meta),
  error: (msg, ...meta) => errorLogger.error(msg, ...meta),
  warn: (msg, ...meta) => appLogger.warn(msg, ...meta),
  debug: (msg, ...meta) => appLogger.debug(msg, ...meta),
  app: appLogger,
  api: apiLogger,
  db: dbLogger,
  errorLogger: errorLogger,
  auth: authLogger
};

module.exports = logger;
