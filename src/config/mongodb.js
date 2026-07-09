const env = require('./environment');

module.exports = {
  uri: env.mongo.uri,
  options: {
    maxPoolSize: env.mongo.maxPoolSize,
    minPoolSize: env.mongo.minPoolSize,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000
  }
};
