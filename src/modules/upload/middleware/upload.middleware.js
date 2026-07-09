const multer = require('multer');
const path = require('path');
const { ValidationError } = require('../../../common/errors/AppError');

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.docx', '.doc', '.ppt', '.pptx', '.xlsx', '.csv', '.zip'
];

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

const validateUpload = (req, res, next) => {
  if (!req.file) {
    return next(new ValidationError('No file uploaded.'));
  }

  const originalName = req.file.originalname || '';
  const extension = path.extname(originalName).toLowerCase();

  const isExtensionValid = ALLOWED_EXTENSIONS.includes(extension);
  const isMimeValid = ALLOWED_MIME_TYPES.includes(req.file.mimetype);

  if (!isExtensionValid || !isMimeValid) {
    return next(new ValidationError(
      `Unsupported file format. Supported formats: ${ALLOWED_EXTENSIONS.map(ext => ext.replace('.', '').toUpperCase()).join(', ')}`
    ));
  }

  // Enforce purpose-based size limits
  // (Images: max 10MB, Documents/Datasets/Zip: max 100MB)
  const purpose = req.body.purpose || req.query.purpose || '';

  if (purpose === 'profile-avatar') {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(req.file.mimetype)) {
      return next(new ValidationError('Profile avatar must be a JPG, PNG, or WEBP image.'));
    }
    if (req.file.size > 5 * 1024 * 1024) {
      return next(new ValidationError('Profile avatar cannot exceed 5MB.'));
    }
  }

  const isImagePurpose = [
    'profile-avatar', 'profile-banner', 'publication-cover',
    'project-image', 'institution-logo', 'book-cover'
  ].includes(purpose) || req.file.mimetype.startsWith('image/');

  if (isImagePurpose && req.file.size > 10 * 1024 * 1024) {
    return next(new ValidationError('Image files cannot exceed 10MB.'));
  }

  if (req.file.size > 100 * 1024 * 1024) {
    return next(new ValidationError('Uploaded files cannot exceed 100MB.'));
  }

  next();
};

module.exports = {
  upload,
  validateUpload
};
