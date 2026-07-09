const mongoose = require('mongoose');
const logger = require('../../common/logger/winston');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/research_connect';

const options = {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 50,
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 10,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000,
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  compressors: 'zlib',
  readPreference: 'primary',
  w: 'majority'
};

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    logger.info('Initializing MongoDB connection...');
    connectionPromise = mongoose.connect(MONGO_URI, options)
      .then(() => {
        logger.info('MongoDB connected successfully.');
        return mongoose.connection;
      })
      .catch((error) => {
        logger.error('MongoDB connection error:', error);
        connectionPromise = null; // allow the next request to retry
        throw error; // propagate failure to the caller instead of swallowing it
      });
  }

  return connectionPromise;
};

mongoose.connection.on('connected', () => {
  logger.info('Mongoose default connection open to ' + MONGO_URI);
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose default connection error: ' + err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose default connection disconnected.');
  connectionPromise = null; // let the next request re-trigger a connect
});

const checkHealth = () => {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting', 99: 'uninitialized' };
  const status = mongoose.connection.readyState;
  return {
    isHealthy: status === 1,
    status: states[status] || 'unknown',
    poolSize: mongoose.connection.getClient()?.topology?.s?.pool?.size || 0,
    activeConnections: mongoose.connection.getClient()?.topology?.s?.pool?.availableConnections?.length || 0
  };
};

const closeDB = async () => {
  if (mongoose.connection.readyState === 0) return;
  logger.info('Closing Mongoose connection...');
  try {
    await mongoose.disconnect();
    connectionPromise = null;
    logger.info('Mongoose connection closed successfully.');
  } catch (error) {
    logger.error('Error during Mongoose connection closure:', error);
  }
};

module.exports = { connectDB, checkHealth, closeDB };
