const { body } = require('express-validator');
const validationMiddleware = require('../../../common/middlewares/validation.middleware');
const scholarService = require('../service/scholar.service');

const researchIdentityValidator = [
  body('googleScholar')
    .trim()
    .notEmpty()
    .withMessage('Google Scholar URL is required')
    .custom((value) => {
      if (!scholarService.validateScholarURL(value)) {
        throw new Error('Please enter a valid Google Scholar profile URL (e.g. https://scholar.google.com/citations?user=XXXXXXXX)');
      }
      return true;
    }),
  body('orcid')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/)
    .withMessage('Please enter a valid ORCID ID (e.g. 0000-0002-1825-0097)'),
  body('linkedin')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Please enter a valid LinkedIn profile URL')
    .contains('linkedin.com')
    .withMessage('LinkedIn URL must point to linkedin.com'),
  body('researchGate')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Please enter a valid ResearchGate URL')
    .contains('researchgate.net')
    .withMessage('ResearchGate URL must point to researchgate.net'),
  body('scopus')
    .optional({ checkFalsy: true })
    .trim()
    .isNumeric()
    .withMessage('Scopus Author ID must be numeric'),
  
  validationMiddleware
];

module.exports = {
  researchIdentityValidator
};
