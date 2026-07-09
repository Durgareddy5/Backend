const env = require('./environment');
const path = require('path');

module.exports = {
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  logDirectory: path.join(process.cwd(), 'logs'),
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
  datePattern: 'YYYY-MM-DD'
};
