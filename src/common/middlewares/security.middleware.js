const helmet = require('helmet');
const cors = require('cors');

// Import config
const corsOptions = require('../../config/cors');
const { globalLimiter } = require('../../config/rateLimiter');

const securityMiddlewares = [
  helmet(),
  cors(corsOptions),
  globalLimiter
];

module.exports = securityMiddlewares;
