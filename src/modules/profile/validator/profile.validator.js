const { body } = require('express-validator');
const validationMiddleware = require('../../../common/middlewares/validation.middleware');

const updateProfileValidator = [
  body('firstName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('bio')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio description cannot exceed 500 characters'),
  body('country')
    .optional({ checkFalsy: true }) // empty string accept karega ab error nahi aayega
    .trim()
    .isString(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isString(),
  body('institution')
    .optional({ checkFalsy: true })
    .trim()
    .isString(),
  body('department')
    .optional({ checkFalsy: true })
    .trim()
    .isString(),
  body('designation')
    .optional({ checkFalsy: true })
    .trim()
    .isString(),
  body('company')
    .optional({ checkFalsy: true })
    .trim()
    .isString(),
  body('division')
    .optional({ checkFalsy: true })
    .trim()
    .isString(),
  body('position')
    .optional({ checkFalsy: true })
    .trim()
    .isString(),
  body('socialLinks')
    .optional()
    .isObject()
    .withMessage('socialLinks must be an object'),
  body('socialLinks.orcid')
    .optional({ checkFalsy: true }).trim().isString(),
  body('socialLinks.googleScholar')
    .optional({ checkFalsy: true }).trim().isString(),
  body('socialLinks.researchGate')
    .optional({ checkFalsy: true }).trim().isString(),
  body('socialLinks.linkedin')
    .optional({ checkFalsy: true }).trim().isString(),
  body('socialLinks.website')
    .optional({ checkFalsy: true }).trim().isString(),
  body('socialLinks.scopus')
    .optional({ checkFalsy: true }).trim().isString(),
  body('dateOfBirth')
    .optional({ checkFalsy: true }).trim().isString(),
  body('nationality')
    .optional({ checkFalsy: true }).trim().isString(),
  
  // Image removals explicitly allowed
  body('coverImage')
    .optional({ checkFalsy: true }) 
    .trim()
    .isString(),
  body('profileImage')
    .optional({ checkFalsy: true }) 
    .trim()
    .isString(),
    
  body('researchSummary')
    .optional({ checkFalsy: true }).trim().isString(),
  body('currentResearch')
    .optional({ checkFalsy: true }).trim().isString(),
  body('researchVision')
    .optional({ checkFalsy: true }).trim().isString(),

  // Arrays validations
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array'),
  body('education.*.degree')
    .notEmpty().withMessage('Degree is required in education'),
  body('education.*.university')
    .notEmpty().withMessage('University is required in education'),
  body('education.*.duration')
    .notEmpty().withMessage('Duration is required in education'),

  body('experience')
    .optional()
    .isArray()
    .withMessage('Experience must be an array'),
  body('experience.*.designation')
    .notEmpty().withMessage('Designation is required in experience'),
  body('experience.*.institution')
    .notEmpty().withMessage('Institution is required in experience'),
  body('experience.*.duration')
    .notEmpty().withMessage('Duration is required in experience'),

  body('projects')
    .optional()
    .isArray()
    .withMessage('Projects must be an array'),
  body('projects.*.title')
    .notEmpty().withMessage('Project title is required'),

  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('skills.*.name')
    .notEmpty().withMessage('Skill name is required'),
  body('skills.*.category')
    .optional()
    .isIn(['Programming', 'AI', 'ML', 'Cloud', 'Research', 'Writing', 'Statistics', 'Other'])
    .withMessage('Invalid skill category'),

  body('achievements')
    .optional()
    .isArray()
    .withMessage('Achievements must be an array'),
  body('achievements.*.title')
    .notEmpty().withMessage('Achievement title is required'),
  body('achievements.*.organization')
    .notEmpty().withMessage('Achievement organization is required'),
  body('achievements.*.year')
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Achievement year must be a valid integer'),

  body('certifications')
    .optional()
    .isArray()
    .withMessage('Certifications must be an array'),
  body('certifications.*.name')
    .notEmpty().withMessage('Certification name is required'),
  body('certifications.*.organization')
    .notEmpty().withMessage('Certification organization is required'),

  body('metrics')
    .optional()
    .isObject()
    .withMessage('Metrics must be an object'),
  
  validationMiddleware
];

module.exports = {
  updateProfileValidator
};