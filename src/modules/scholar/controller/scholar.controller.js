const scholarService = require('../service/scholar.service');
const researchIdentityService = require('../service/research-identity.service');
const scholarDTO = require('../dto/scholar.dto');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');

class ScholarController {
  // Save research identity social links
  saveResearchIdentity = asyncHandler(async (req, res) => {
    const profile = await researchIdentityService.saveResearchIdentity(req.user._id, req.body);
    return res.success('Research identity links updated successfully.', {
      socialLinks: profile.socialLinks,
      profileCompletion: profile.profileCompletion
    });
  });

  // Start background importing for Google Scholar
  importScholar = asyncHandler(async (req, res) => {
    const job = await scholarService.syncScholar(req.user._id);
    return res.success('Academic portfolio import enqueued successfully.', { job });
  });

  // Re-import portfolio
  reimportScholar = asyncHandler(async (req, res) => {
    const job = await scholarService.reImportScholar(req.user._id);
    return res.success('Academic portfolio reimport enqueued successfully.', { job });
  });

  // Manual / Incremental sync
  syncScholar = asyncHandler(async (req, res) => {
    const job = await scholarService.syncScholar(req.user._id);
    return res.success('Academic portfolio sync enqueued successfully.', { job });
  });

  // Sync publications only
  syncPublications = asyncHandler(async (req, res) => {
    const job = await scholarService.syncScholarPublications(req.user._id);
    return res.success('Publications sync enqueued successfully.', { job });
  });

  // Sync metrics only
  syncMetrics = asyncHandler(async (req, res) => {
    const job = await scholarService.syncScholarMetrics(req.user._id);
    return res.success('Metrics sync enqueued successfully.', { job });
  });

  // Fetch Scholar profile metadata
  getProfile = asyncHandler(async (req, res) => {
    const profile = await scholarService.getProfile(req.user._id);
    return res.success('Google Scholar profile retrieved successfully.', scholarDTO.formatProfile(profile));
  });

  // Fetch paginated publications list
  getPublications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sort = '-year', search = '' } = req.query;
    const result = await scholarService.getPublications(req.user._id, { page, limit, sort, search });
    return res.success('Publications list retrieved successfully.', scholarDTO.formatPublications(result));
  });

  // Fetch Co-authors
  getCoAuthors = asyncHandler(async (req, res) => {
    const coauthors = await scholarService.getCoAuthors(req.user._id);
    return res.success('Co-authors retrieved successfully.', scholarDTO.formatCoAuthors(coauthors));
  });

  // Fetch Citations graph
  getCitations = asyncHandler(async (req, res) => {
    const citations = await scholarService.getCitations(req.user._id);
    return res.success('Citation history retrieved successfully.', scholarDTO.formatCitations(citations));
  });

  // Fetch derived analytics
  getAnalytics = asyncHandler(async (req, res) => {
    const analytics = await scholarService.getAnalytics(req.user._id);
    return res.success('Derived analytics retrieved successfully.', analytics);
  });

  // Fetch background import job progress logs
  getImportStatus = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    if (jobId) {
      const importRepository = require('../repository/import.repository');
      const importLogRepository = require('../repository/import-log.repository');
      const job = await importRepository.findById(jobId);
      if (!job) {
        return res.error('Import job not found.', { code: 'NOT_FOUND' });
      }
      const logs = await importLogRepository.findByImportId(jobId);
      return res.success('Import job status retrieved successfully.', {
        active: ['pending', 'running'].includes(job.status),
        job,
        logs
      });
    }

    const status = await scholarService.getImportStatus(req.user._id);
    return res.success('Import sync status retrieved successfully.', status);
  });
}

module.exports = new ScholarController();
