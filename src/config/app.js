const env = require('./environment');

module.exports = {
  name: 'Research Connect',
  version: '1.0.0',
  apiPrefix: '/api/v1',
  bodyLimit: '10mb',
  parameterLimit: 1000,
  isProduction: env.nodeEnv === 'production',
  email: env.email
};
