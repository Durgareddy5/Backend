const { body } = require('express-validator');
const validationMiddleware = require('../../../common/middlewares/validation.middleware');
const User = require('../../../models/User');

const registerValidator = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .custom(async (email) => {
      const existingUser = await User.findOne({ email: email.toLowerCase(), status: { $ne: 'pending' }, isDeleted: { $ne: true } });
      if (existingUser) {
        throw new Error('Email is already registered');
      }
      return true;
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('researcherType')
    .notEmpty()
    .withMessage('Researcher type is required')
    .isIn(['academic', 'corporate', 'medical', 'non_researcher'])
    .withMessage('Invalid researcher type'),
  body('acceptTerms')
    .isBoolean()
    .withMessage('Accept terms must be a boolean')
    .custom(v => {
      if (v !== true && v !== 'true') throw new Error('You must accept the terms and conditions');
      return true;
    }),
  body('acceptPrivacy')
    .isBoolean()
    .withMessage('Accept privacy must be a boolean')
    .custom(v => {
      if (v !== true && v !== 'true') throw new Error('You must accept the privacy policy');
      return true;
    }),

  // Conditional validations based on researcherType
  body('institution')
    .if((value, { req }) => req.body.researcherType === 'academic')
    .trim()
    .notEmpty()
    .withMessage('Institution is required for academic researchers'),
  body('department')
    .if((value, { req }) => req.body.researcherType === 'academic' || req.body.researcherType === 'medical')
    .trim()
    .notEmpty()
    .withMessage('Department is required'),

  body('company')
    .if((value, { req }) => req.body.researcherType === 'corporate')
    .trim()
    .notEmpty()
    .withMessage('Company name is required for corporate researchers'),
  body('division')
    .if((value, { req }) => req.body.researcherType === 'corporate')
    .trim()
    .notEmpty()
    .withMessage('Division is required for corporate researchers'),
  body('position')
    .if((value, { req }) => req.body.researcherType === 'corporate')
    .trim()
    .notEmpty()
    .withMessage('Position is required for corporate researchers'),

  body('hospital')
    .if((value, { req }) => req.body.researcherType === 'medical')
    .trim()
    .notEmpty()
    .withMessage('Hospital name is required for medical researchers'),
  body('designation')
    .if((value, { req }) => req.body.researcherType === 'medical')
    .trim()
    .notEmpty()
    .withMessage('Designation is required for medical researchers'),

  body('organization')
    .if((value, { req }) => req.body.researcherType === 'non_researcher')
    .trim()
    .notEmpty()
    .withMessage('Organization is required'),
  body('occupation')
    .if((value, { req }) => req.body.researcherType === 'non_researcher')
    .trim()
    .notEmpty()
    .withMessage('Occupation is required'),
  body('interest')
    .if((value, { req }) => req.body.researcherType === 'non_researcher')
    .trim()
    .notEmpty()
    .withMessage('Research interest description is required'),

  validationMiddleware
];

const sendOtpValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  validationMiddleware
];

const verifyOtpValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain digits only'),
  validationMiddleware
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validationMiddleware
];

const resetPasswordValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  validationMiddleware
];

module.exports = {
  registerValidator,
  sendOtpValidator,
  verifyOtpValidator,
  loginValidator,
  resetPasswordValidator
};
