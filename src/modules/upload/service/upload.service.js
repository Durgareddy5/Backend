const mongoose = require('mongoose');
// Replaced require('uuid') with Node's native crypto module to prevent ESM errors
const crypto = require('crypto');
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
  // 1. Encode 48-bit millisecond timestamp as 10 Base32 chars
  const now = Date.now();
  const timestampPart = encodeBase32(now, 10);

  // 2. Generate exactly 10 bytes (80 bits) of cryptographic randomness natively.
  //    This clean solution replaces the old uuidv4 hex string extraction.
  const randomBytes = crypto.randomBytes(10);

  // 3. Convert bytes buffer directly to a BigInt, then encode as 16 Base32 chars
  const randomInt = BigInt('0x' + randomBytes.toString('hex'));
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
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};
