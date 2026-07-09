const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

// Warn about missing environment variables in production
if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.warn(`[WARNING]: Environment variable ${varName} is missing!`);
    }
  });
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
        .split(',')
        .map(origin => origin.trim()),
  serverUrl: process.env.SERVER_URL || 'http://localhost:5000',
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/research_connect',
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 50,
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 10
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkeyforresearchconnect',
    expire: process.env.JWT_EXPIRE || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'supersecretjwtrefreshkeyforresearchconnect',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d'
  },
  email: {
    user: process.env.EMAIL_USER || 'demo@researchconnect.org',
    pass: process.env.EMAIL_PASS || 'demopassword'
  },
  serpApi: {
    key: process.env.SERP_API_KEY || 'demoserpapikey'
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  }
};
