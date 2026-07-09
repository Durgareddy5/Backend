const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const cloudinaryService = require('./cloudinary.service');
const Upload = require('../../../models/Upload');
const Profile = require('../../../models/Profile');
const User = require('../../../models/User');
const Publication = require('../../../models/Publication');
const { ValidationError, NotFoundError } = require('../../../common/errors/AppError');
const logger = require('../../../common/logger/winston');

const log = logger || console;

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeBase32(value, length) {
  let result = '';
  for (let i = length - 1; i >= 0; i--) {
    result = CROCKFORD_BASE32[value & 31] + result;
    value = Math.floor(value / 32);
  }
  return result;
}

function generateULID() {
  const now = Date.now();
  const timestampPart = encodeBase32(now, 10);
  const uuid1 = uuidv4().replace(/-/g, '');
  const randomBytes = uuid1.substring(0, 20);
  const randomInt = BigInt('0x' + randomBytes);
  let randomPart = '';
  let remaining = randomInt;
  for (let i = 15; i >= 0; i--) {
    randomPart = CROCKFORD_BASE32[Number(remaining & 31n)] + randomPart;
    remaining = remaining >> 5n;
  }
  return timestampPart + randomPart;
}

/**
 * Generate a unique ID for a resource based on purpose.
 */
const generateIdForPurpose = (purpose) => {
  const ulid = generateULID();
  switch (purpose) {
    case 'publication-pdf':
    case 'publication-cover':
      return `RCPUB_${ulid}`;
    case 'project-image':
      return `RCPROJ_${ulid}`;
    case 'dataset':
      return `RCDATA_${ulid}`;
    case 'institution-logo':
      return `RCINST_${ulid}`;
    case 'patent-document':
      return `RCPAT_${ulid}`;
    case 'thesis':
      return `RCTHESIS_${ulid}`;
    default:
      return `RCMISC_${ulid}`;
  }
};

/**
 * Internal upload helper with transaction support flag.
 */
const uploadFileInternal = async ({ file, userId, purpose, resourceId, useTransaction }) => {
  const uploadStart = Date.now();

  if (!file) {
    throw new ValidationError('No file provided for upload.');
  }

  // Ensure purpose is valid
  const allowedPurposes = [
    'profile-avatar', 'profile-banner', 'publication-pdf', 'publication-cover',
    'dataset', 'poster', 'presentation', 'research-image', 'certificate',
    'project-image', 'institution-logo', 'research-document',
    'patent-document', 'book-cover', 'thesis'
  ];

  if (!allowedPurposes.includes(purpose)) {
    throw new ValidationError(`Invalid upload purpose: ${purpose}`);
  }

  // If resourceId is required but not provided, generate one
  let activeResourceId = resourceId || '';
  const requiresResourceId = [
    'publication-pdf', 'publication-cover', 'dataset', 'project-image',
    'institution-logo', 'patent-document', 'thesis'
  ];

  if (!activeResourceId && requiresResourceId.includes(purpose)) {
    activeResourceId = generateIdForPurpose(purpose);
  }

  let session = null;
  if (useTransaction) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (err) {
      log.warn('Failed to start MongoDB session/transaction. Retrying without transaction.', err.message);
      useTransaction = false;
      session = null;
    }
  }

  let uploadedAsset = null;
  let oldAsset = null;

  try {
    const transactionStart = Date.now();

    // 1. Identify if we are replacing an existing asset
    const replacementQuery = { userId, purpose, isDeleted: { $ne: true } };
    if (activeResourceId) {
      replacementQuery.resourceId = activeResourceId;
    }
    // We only replace single-value assets
    const replaceTypes = ['profile-avatar', 'profile-banner', 'publication-pdf', 'publication-cover', 'project-image', 'dataset'];
    if (replaceTypes.includes(purpose)) {
      if (useTransaction && session) {
        oldAsset = await Upload.findOne(replacementQuery).session(session);
      } else {
        oldAsset = await Upload.findOne(replacementQuery);
      }
    }

    const cloudinaryStart = Date.now();
    // 2. Upload new asset to Cloudinary
    uploadedAsset = await cloudinaryService.uploadFileBuffer(
      file.buffer,
      file.originalname,
      userId,
      purpose,
      activeResourceId,
      file.mimetype
    );
    const cloudinaryTime = Date.now() - cloudinaryStart;

    const mongoStart = Date.now();
    // 3. Save Upload metadata document
    let newUploadDoc;
    if (useTransaction && session) {
      const uploadDocs = await Upload.create([
        {
          userId,
          purpose,
          resourceId: activeResourceId,
          asset_id: uploadedAsset.asset_id,
          public_id: uploadedAsset.public_id,
          secure_url: uploadedAsset.secure_url,
          resource_type: uploadedAsset.resource_type,
          format: uploadedAsset.format,
          bytes: uploadedAsset.bytes,
          width: uploadedAsset.width,
          height: uploadedAsset.height,
          pages: uploadedAsset.pages,
          folder: uploadedAsset.folder,
          version: uploadedAsset.version,
          original_filename: uploadedAsset.original_filename,
          uploadedAt: uploadedAsset.uploadedAt
        }
      ], { session });
      newUploadDoc = uploadDocs[0];
    } else {
      newUploadDoc = await Upload.create({
        userId,
        purpose,
        resourceId: activeResourceId,
        asset_id: uploadedAsset.asset_id,
        public_id: uploadedAsset.public_id,
        secure_url: uploadedAsset.secure_url,
        resource_type: uploadedAsset.resource_type,
        format: uploadedAsset.format,
        bytes: uploadedAsset.bytes,
        width: uploadedAsset.width,
        height: uploadedAsset.height,
        pages: uploadedAsset.pages,
        folder: uploadedAsset.folder,
        version: uploadedAsset.version,
        original_filename: uploadedAsset.original_filename,
        uploadedAt: uploadedAsset.uploadedAt
      });
    }

    // 4. Soft delete old upload reference in MongoDB if replacing
    if (oldAsset) {
      if (useTransaction && session) {
        await Upload.findByIdAndUpdate(
          oldAsset._id,
          { isDeleted: true, deletedAt: new Date() },
          { session }
        );
      } else {
        await Upload.findByIdAndUpdate(
          oldAsset._id,
          { isDeleted: true, deletedAt: new Date() }
        );
      }
    }

    // 5. Update the parent MongoDB resource directly (avatar, banner, etc.)
    if (purpose === 'profile-avatar') {
      if (useTransaction && session) {
        await Profile.findOneAndUpdate({ userId }, { profileImage: uploadedAsset.secure_url }, { session });
        await User.findByIdAndUpdate(userId, { profileImage: uploadedAsset.secure_url }, { session });
      } else {
        await Profile.findOneAndUpdate({ userId }, { profileImage: uploadedAsset.secure_url });
        await User.findByIdAndUpdate(userId, { profileImage: uploadedAsset.secure_url });
      }
    } else if (purpose === 'profile-banner') {
      if (useTransaction && session) {
        await Profile.findOneAndUpdate({ userId }, { coverImage: uploadedAsset.secure_url }, { session });
      } else {
        await Profile.findOneAndUpdate({ userId }, { coverImage: uploadedAsset.secure_url });
      }
    }

    // 6. Commit the MongoDB Transaction
    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
    }
    const mongoTime = Date.now() - mongoStart;

    // 7. Post-Commit: delete replaced Cloudinary asset if successful
    if (oldAsset && oldAsset.public_id) {
      await cloudinaryService.deleteFile(oldAsset.public_id, oldAsset.resource_type);
    }

    const totalDuration = Date.now() - uploadStart;
    log.info(`[UPLOAD SERVICE SUCCESS]`, {
      userId,
      purpose,
      resourceId: activeResourceId,
      assetId: newUploadDoc.asset_id,
      bytes: newUploadDoc.bytes,
      cloudinaryTimeMs: cloudinaryTime,
      mongoTimeMs: mongoTime,
      transactionTimeMs: Date.now() - transactionStart,
      totalDurationMs: totalDuration,
      useTransaction
    });

    return newUploadDoc;
  } catch (error) {
    // Check if error is due to transaction numbers not allowed (standalone local MongoDB)
    const isTxError = error.message?.includes('Transaction numbers are only allowed') ||
                      error.errmsg?.includes('Transaction numbers are only allowed') ||
                      error.code === 20;

    if (useTransaction && isTxError) {
      log.warn('MongoDB transactions not supported by the database server. Retrying without transaction.');
      if (session) {
        try {
          await session.abortTransaction();
        } catch (e) {}
        session.endSession();
      }
      return uploadFileInternal({ file, userId, purpose, resourceId, useTransaction: false });
    }

    log.error(`[UPLOAD SERVICE FAILED] Aborting upload`, { error: error.message, userId, purpose });

    // Rollback the MongoDB transaction
    if (useTransaction && session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        log.error('[UPLOAD SERVICE ABORT FAILED]', abortErr);
      }
      session.endSession();
    }

    // Clean up Cloudinary asset to avoid orphaned files
    if (uploadedAsset && uploadedAsset.public_id) {
      log.info(`[UPLOAD SERVICE ROLLBACK] Deleting newly uploaded Cloudinary asset to avoid orphans`, {
        publicId: uploadedAsset.public_id
      });
      await cloudinaryService.deleteFile(uploadedAsset.public_id, uploadedAsset.resource_type);
    }

    throw error;
  }
};

/**
 * Universal Upload File logic.
 */
const uploadFile = async ({ file, userId, purpose, resourceId }) => {
  return uploadFileInternal({ file, userId, purpose, resourceId, useTransaction: true });
};

/**
 * Internal delete helper with transaction support flag.
 */
const deleteUploadInternal = async (assetId, userId, useTransaction = true) => {
  const upload = await Upload.findOne({ asset_id: assetId, isDeleted: { $ne: true } });
  if (!upload) {
    throw new NotFoundError('Upload not found.');
  }

  // Ensure owner or admin deletes
  if (upload.userId.toString() !== userId.toString()) {
    throw new ValidationError('Unauthorized. You do not own this file.');
  }

  let session = null;
  if (useTransaction) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (err) {
      useTransaction = false;
      session = null;
    }
  }

  try {
    // 1. Soft delete upload metadata
    if (useTransaction && session) {
      await Upload.findByIdAndUpdate(
        upload._id,
        { isDeleted: true, deletedAt: new Date() },
        { session }
      );
    } else {
      await Upload.findByIdAndUpdate(
        upload._id,
        { isDeleted: true, deletedAt: new Date() }
      );
    }

    // 2. Remove references from parent resources
    if (upload.purpose === 'profile-avatar') {
      if (useTransaction && session) {
        await Profile.findOneAndUpdate({ userId }, { profileImage: '' }, { session });
        await User.findByIdAndUpdate(userId, { profileImage: '' }, { session });
      } else {
        await Profile.findOneAndUpdate({ userId }, { profileImage: '' });
        await User.findByIdAndUpdate(userId, { profileImage: '' });
      }
    } else if (upload.purpose === 'profile-banner') {
      if (useTransaction && session) {
        await Profile.findOneAndUpdate({ userId }, { coverImage: 'https://iili.io/C7pZ8Ss.jpg' }, { session });
      } else {
        await Profile.findOneAndUpdate({ userId }, { coverImage: 'https://iili.io/C7pZ8Ss.jpg' });
      }
    } else if (upload.purpose === 'publication-pdf') {
      if (useTransaction && session) {
        await Publication.findOneAndUpdate(
          { publicationId: upload.resourceId },
          { cloudinaryFileUrl: '', 'fileDetails.secure_url': '' },
          { session }
        );
      } else {
        await Publication.findOneAndUpdate(
          { publicationId: upload.resourceId },
          { cloudinaryFileUrl: '', 'fileDetails.secure_url': '' }
        );
      }
    }

    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
    }

    // 3. Delete from Cloudinary
    await cloudinaryService.deleteFile(upload.public_id, upload.resource_type);

    return { success: true };
  } catch (error) {
    const isTxError = error.message?.includes('Transaction numbers are only allowed') ||
                      error.errmsg?.includes('Transaction numbers are only allowed') ||
                      error.code === 20;

    if (useTransaction && isTxError) {
      log.warn('MongoDB transactions not supported by the database server on delete. Retrying without transaction.');
      if (session) {
        try {
          await session.abortTransaction();
        } catch (e) {}
        session.endSession();
      }
      return deleteUploadInternal(assetId, userId, false);
    }

    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

/**
 * Delete an upload from MongoDB and Cloudinary.
 */
const deleteUpload = async (assetId, userId) => {
  return deleteUploadInternal(assetId, userId, true);
};

module.exports = {
  uploadFile,
  deleteUpload
};
