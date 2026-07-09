const mongoose = require('mongoose');
const logger = require('../../common/logger/winston');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/research_connect';

const options = {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 50,
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 10,
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  connectTimeoutMS: 30000, // Give up initial connection attempt after 30 seconds
  heartbeatFrequencyMS: 10000, // Send heartbeats every 10 seconds
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  compressors: 'zlib',
  readPreference: 'primary',
  w: 'majority'
};

let isConnecting = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  
  if (isConnecting) {
    logger.info('Database connection is already in progress...');
    return;
  }

  isConnecting = true;
  logger.info('Initializing MongoDB connection...');

  try {
    await mongoose.connect(MONGO_URI, options);
    isConnecting = false;
    logger.info('MongoDB connected successfully.');
  } catch (error) {
    isConnecting = false;
    logger.error('MongoDB initial connection error:', error);
    logger.info('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Monitor connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose default connection open to ' + MONGO_URI);
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose default connection error: ' + err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose default connection disconnected. Attempting auto-reconnect...');
  connectDB();
});

// Health check function
const checkHealth = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  
  const status = mongoose.connection.readyState;
  const isHealthy = status === 1;
  
  return {
    isHealthy,
    status: states[status] || 'unknown',
    poolSize: mongoose.connection.getClient()?.topology?.s?.pool?.size || 0,
    activeConnections: mongoose.connection.getClient()?.topology?.s?.pool?.availableConnections?.length || 0
  };
};

// Graceful shutdown helper
const closeDB = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }
  
  logger.info('Closing Mongoose connection...');
  try {
    await mongoose.disconnect();
    logger.info('Mongoose connection closed successfully.');
  } catch (error) {
    logger.error('Error during Mongoose connection closure:', error);
  }
};

module.exports = {
  connectDB,
  checkHealth,
  closeDB
};
