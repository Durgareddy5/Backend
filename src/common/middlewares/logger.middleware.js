const morgan = require('morgan');
const logger = require('../logger/winston');

morgan.token('id', (req) => req.id);

const stream = {
  write: (message) => logger.info(message.trim(), { tags: ['api-request'] })
};

const loggerMiddleware = morgan(
  ':id :remote-addr :method :url :status :res[content-length] - :response-time ms',
  { stream }
);

module.exports = loggerMiddleware;
