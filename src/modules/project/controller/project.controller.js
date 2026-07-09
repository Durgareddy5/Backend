const uploadService = require('../../upload/service/upload.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');
const { ValidationError } = require('../../../common/errors/AppError');

class ProjectController {
  /**
   * Upload project image/file
   */
  uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('No file was uploaded.');
    }

    const { projectId } = req.body;

    const result = await uploadService.uploadFile({
      file: req.file,
      userId: req.user._id,
      purpose: 'project-image',
      resourceId: projectId
    });

    return res.success('Project file uploaded successfully.', {
      projectId: result.resourceId,
      secure_url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id,
      resource_type: result.resource_type,
      bytes: result.bytes,
      format: result.format
    }, 201);
  });
}

module.exports = new ProjectController();
