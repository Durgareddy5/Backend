const uploadService = require('../service/upload.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');
const { ValidationError } = require('../../../common/errors/AppError');

class UploadController {
  /**
   * Universal file upload handler
   */
  uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('No file was uploaded.');
    }

    const purpose = req.body.purpose || req.query.purpose;
    const resourceId = req.body.resourceId || req.query.resourceId;

    if (!purpose) {
      throw new ValidationError('Upload purpose is required.');
    }

    const result = await uploadService.uploadFile({
      file: req.file,
      userId: req.user._id,
      purpose,
      resourceId
    });

    return res.success('File uploaded and processed successfully.', {
      asset_id: result.asset_id,
      public_id: result.public_id,
      secure_url: result.secure_url,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      pages: result.pages,
      folder: result.folder,
      version: result.version,
      original_filename: result.original_filename,
      uploadedAt: result.uploadedAt,
      resourceId: result.resourceId
    }, 201);
  });

  /**
   * Delete uploaded asset from MongoDB & Cloudinary
   */
  deleteUpload = asyncHandler(async (req, res) => {
    const { assetId } = req.params;
    if (!assetId) {
      throw new ValidationError('Asset ID is required.');
    }

    const result = await uploadService.deleteUpload(assetId, req.user._id);

    return res.success('Uploaded asset deleted successfully.', result);
  });
}

module.exports = new UploadController();
