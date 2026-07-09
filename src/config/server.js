const env = require('./environment');

module.exports = {
  port: env.port,
  host: process.env.HOST || '0.0.0.0',
  env: env.nodeEnv,
  shutdownTimeout: 10000 // 10 seconds for graceful shutdown
};
