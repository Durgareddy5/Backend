const cloudinary = require('cloudinary').v2;
const env = require('../../../config/environment');
const logger = require('../../../common/logger/winston');

const log = logger || console;

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret
});

/**
 * Maps mime types to Cloudinary resource types.
 */
const getResourceTypeFromMime = (mimeType) => {
  if (!mimeType) return 'raw';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw';
};

/**
 * Maps upload purpose to the required Cloudinary folder path.
 */
const getFolderForPurpose = (purpose, userId, resourceId) => {
  const cleanUserId = String(userId).replace(/[^a-zA-Z0-9]/g, '');
  const cleanResourceId = String(resourceId || '').replace(/[^a-zA-Z0-9_-]/g, '_');

  switch (purpose) {
    case 'profile-avatar':
      return `research-connect/profile/avatar/${cleanUserId}`;
    case 'profile-banner':
      return `research-connect/profile/banner/${cleanUserId}`;
    case 'publication-pdf':
    case 'publication-cover':
      return `research-connect/publications/${cleanResourceId}`;
    case 'project-image':
      return `research-connect/projects/${cleanResourceId}`;
    case 'dataset':
      return `research-connect/datasets/${cleanResourceId}`;
    case 'certificate':
      return `research-connect/certificates/${cleanUserId}`;
    case 'institution-logo':
      return `research-connect/institutions/${cleanResourceId}`;
    case 'patent-document':
      return `research-connect/patents/${cleanResourceId}`;
    case 'thesis':
      return `research-connect/thesis/${cleanResourceId}`;
    default:
      return `research-connect/misc/${cleanUserId}`;
  }
};

/**
 * Upload a file buffer to Cloudinary.
 *
 * @param {Buffer} fileBuffer - The file content as a Buffer.
 * @param {string} originalName - Original filename.
 * @param {string} userId - ID of the user uploading.
 * @param {string} purpose - Upload purpose (e.g. profile-avatar, publication-pdf).
 * @param {string} [resourceId] - Optional associated resource ID.
 * @param {string} [mimeType] - MIME type of the file.
 * @returns {Promise<object>} Cloudinary upload result.
 */
const uploadFileBuffer = (fileBuffer, originalName, userId, purpose, resourceId, mimeType) => {
  return new Promise((resolve, reject) => {
    const uploadStart = Date.now();
    const folder = getFolderForPurpose(purpose, userId, resourceId);
    const resourceType = getResourceTypeFromMime(mimeType);

    // Create a unique public ID inside the folder
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const publicIdSuffix = originalName
      ? originalName.substring(0, originalName.lastIndexOf('.')).replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'file';
    const publicId = `${publicIdSuffix}_${uniqueSuffix}`;

    const uploadOptions = {
      folder,
      public_id: publicId,
      resource_type: resourceType,
      use_filename: false,
      unique_filename: false,
      overwrite: false,
      invalidate: true,
      tags: [`user:${userId}`, `purpose:${purpose}`]
    };

    if (resourceId) {
      uploadOptions.tags.push(`resource:${resourceId}`);
    }

    log.info(`[CLOUDINARY UPLOAD] Starting upload`, {
      folder,
      publicId,
      purpose,
      userId,
      fileSizeBytes: fileBuffer.length,
      resourceType,
      originalName
    });

    // 45-second upload timeout guard
    let settled = false;
    const timeoutHandle = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`[CLOUDINARY TIMEOUT] Upload timed out after 45s for purpose: ${purpose}`));
      }
    }, 45000);

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      clearTimeout(timeoutHandle);
      if (settled) return;
      settled = true;

      if (error) {
        log.error(`[CLOUDINARY UPLOAD FAILED]`, {
          purpose,
          error: error.message,
          httpCode: error.http_code
        });
        return reject(error);
      }

      const durationMs = Date.now() - uploadStart;
      log.info(`[CLOUDINARY UPLOAD SUCCESS]`, {
        purpose,
        publicId: result.public_id,
        assetId: result.asset_id,
        bytes: result.bytes,
        format: result.format,
        durationMs
      });

      resolve({
        asset_id: result.asset_id || '',
        public_id: result.public_id || `${folder}/${publicId}`,
        secure_url: result.secure_url || '',
        resource_type: result.resource_type || resourceType,
        format: result.format || '',
        bytes: result.bytes || fileBuffer.length,
        width: result.width || 0,
        height: result.height || 0,
        pages: result.pages || 0,
        folder: result.folder || folder,
        version: String(result.version || 0),
        original_filename: originalName || '',
        uploadedAt: new Date(result.created_at || new Date().toISOString()),
        uploadDurationMs: durationMs
      });
    });

    stream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary by its public_id.
 *
 * @param {string} publicId - Cloudinary public_id to delete.
 * @param {string} [resourceType] - 'raw' | 'image' | 'video' | 'auto'.
 * @returns {Promise<object>} Cloudinary deletion result.
 */
const deleteFile = async (publicId, resourceType = 'raw') => {
  if (!publicId) {
    log.warn('[CLOUDINARY DELETE] Called with empty publicId — skipping');
    return { result: 'skipped', reason: 'empty_public_id' };
  }

  try {
    log.info(`[CLOUDINARY DELETE] Deleting file`, { publicId, resourceType });
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
    log.info(`[CLOUDINARY DELETE] Result: ${result.result}`, { publicId });
    return result;
  } catch (error) {
    log.error(`[CLOUDINARY DELETE FAILED]`, { publicId, error: error.message });
    return { result: 'error', error: error.message };
  }
};

module.exports = {
  uploadFileBuffer,
  deleteFile
};
