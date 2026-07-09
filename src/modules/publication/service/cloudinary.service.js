/**
 * Cloudinary Service
 * ==================
 * Handles all file upload and management operations for publication files.
 *
 * Public ID Strategy (collision-proof):
 *   research-connect/publications/{researcherId}/{publicationId}/original
 *
 * This ensures:
 *   - No two publications ever share a Cloudinary public_id
 *   - Files are organized by researcher for easy management
 *   - publicationId is embedded in the path (ULID-based, globally unique)
 *   - Re-uploads to the same publicationId do NOT overwrite (use_filename: false)
 */

const cloudinary = require('cloudinary').v2;
const env = require('../../../config/environment');
const logger = require('../../../common/logger/winston');

const log = logger || console;

// Configure Cloudinary once at module load
cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret
});

/**
 * Supported file types and their resource_type mapping.
 * Cloudinary requires 'raw' for PDFs, DOCX, RTF, TXT.
 * Only images/videos use 'image'/'video'.
 */
const MIME_TO_RESOURCE_TYPE = {
  'application/pdf': 'raw',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'raw',
  'application/msword': 'raw',
  'application/rtf': 'raw',
  'text/plain': 'raw'
};

/**
 * Upload a file buffer to Cloudinary with a collision-proof public_id.
 *
 * @param {Buffer} fileBuffer - Raw file bytes
 * @param {string} originalName - Original filename (for extension extraction)
 * @param {string} researcherId - MongoDB ObjectId string of the uploading researcher
 * @param {string} publicationId - RCPUB_ ULID publicationId (generated before upload)
 * @param {string} [mimeType] - MIME type for resource_type selection
 * @returns {Promise<object>} Full Cloudinary result with all metadata fields
 */
const uploadFileBuffer = (fileBuffer, originalName, researcherId, publicationId, mimeType) => {
  return new Promise((resolve, reject) => {
    const uploadStart = Date.now();

    // Build collision-proof public_id
    // research-connect/publications/{researcherId}/{publicationId}/original
    const safeResearcherId = String(researcherId).replace(/[^a-zA-Z0-9]/g, '');
    const safePublicationId = String(publicationId).replace(/[^a-zA-Z0-9_]/g, '_');
    const publicId = `research-connect/publications/${safeResearcherId}/${safePublicationId}/original`;

    // Determine resource_type from MIME
    const resourceType = (mimeType && MIME_TO_RESOURCE_TYPE[mimeType]) || 'raw';

    const uploadOptions = {
      folder: `research-connect/publications/${safeResearcherId}/${safePublicationId}`,
      public_id: 'original',
      resource_type: resourceType,
      use_filename: false,       // Never use original filename as Cloudinary ID
      unique_filename: false,    // We control uniqueness via publicationId in path
      overwrite: false,          // Never silently overwrite existing files
      invalidate: false,
      tags: [`researcher:${safeResearcherId}`, `publication:${safePublicationId}`]
    };

    log.info(`[CLOUDINARY UPLOAD] Starting upload`, {
      publicId,
      publicationId,
      researcherId: safeResearcherId,
      fileSizeBytes: fileBuffer.length,
      resourceType,
      originalName
    });

    // 30-second upload timeout guard
    let settled = false;
    const timeoutHandle = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`[CLOUDINARY TIMEOUT] Upload timed out after 30s for publicationId: ${publicationId}`));
      }
    }, 30000);

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      clearTimeout(timeoutHandle);
      if (settled) return;
      settled = true;

      if (error) {
        log.error(`[CLOUDINARY UPLOAD FAILED]`, {
          publicationId,
          error: error.message,
          httpCode: error.http_code
        });
        return reject(error);
      }

      const durationMs = Date.now() - uploadStart;
      log.info(`[CLOUDINARY UPLOAD SUCCESS]`, {
        publicationId,
        publicId: result.public_id,
        assetId: result.asset_id,
        bytes: result.bytes,
        format: result.format,
        pages: result.pages,
        durationMs
      });

      // Return all Cloudinary metadata fields for DB storage
      resolve({
        asset_id: result.asset_id || '',
        public_id: result.public_id || publicId,
        secure_url: result.secure_url || '',
        url: result.url || '',
        resource_type: result.resource_type || resourceType,
        format: result.format || '',
        bytes: result.bytes || fileBuffer.length,
        pages: result.pages || 0,
        version: result.version || 0,
        version_id: result.version_id || '',
        signature: result.signature || '',
        etag: result.etag || '',
        folder: result.folder || uploadOptions.folder,
        original_filename: originalName || '',
        created_at: result.created_at || new Date().toISOString(),
        uploadDurationMs: durationMs
      });
    });

    stream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary by its public_id.
 * Used in transaction rollback when MongoDB save fails after Cloudinary upload.
 *
 * @param {string} publicId - Cloudinary public_id to delete
 * @param {string} [resourceType] - 'raw' | 'image' | 'video' (default: 'raw')
 * @returns {Promise<object>} Cloudinary deletion result
 */
const deleteFile = async (publicId, resourceType = 'raw') => {
  if (!publicId) {
    log.warn('[CLOUDINARY DELETE] Called with empty publicId — skipping');
    return { result: 'skipped', reason: 'empty_public_id' };
  }

  try {
    log.info(`[CLOUDINARY DELETE] Deleting orphan file`, { publicId, resourceType });
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    log.info(`[CLOUDINARY DELETE] Result: ${result.result}`, { publicId });
    return result;
  } catch (error) {
    log.error(`[CLOUDINARY DELETE FAILED]`, { publicId, error: error.message });
    // Do not re-throw — deletion failure should not block the error response
    return { result: 'error', error: error.message };
  }
};

/**
 * Check if a Cloudinary public_id already exists.
 * Used to prevent accidental overwrites.
 *
 * @param {string} publicId
 * @param {string} [resourceType]
 * @returns {Promise<boolean>}
 */
const fileExists = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: resourceType });
    return !!result.public_id;
  } catch (error) {
    if (error.http_code === 404) return false;
    throw error;
  }
};

module.exports = {
  uploadFileBuffer,
  deleteFile,
  fileExists
};

