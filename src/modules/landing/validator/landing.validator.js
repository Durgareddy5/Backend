const { header } = require('express-validator');
const validationMiddleware = require('../../../common/middlewares/validation.middleware');

// For phase 0, no specific inputs require validation on landing page read endpoints.
// We can define a dummy validation chain as an example of validator implementation.
const getLandingDetailsValidator = [
  // Example: header('Accept').exists().withMessage('Accept header is required'),
  // validationMiddleware
];

module.exports = {
  getLandingDetailsValidator
};
