const ApiResponse = require('../responses/ApiResponse');

const responseFormatterMiddleware = (req, res, next) => {
  res.success = (message, data, statusCode) => {
    return ApiResponse.success(res, message, data, statusCode);
  };
  
  res.error = (message, error, statusCode) => {
    return ApiResponse.error(res, message, error, statusCode);
  };
  
  next();
};

module.exports = responseFormatterMiddleware;
