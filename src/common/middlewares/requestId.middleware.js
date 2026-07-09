const { randomUUID } = require('crypto');

const requestIdMiddleware = (req, res, next) => {
  const requestId = req.header('X-Request-Id') || randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

module.exports = requestIdMiddleware;
