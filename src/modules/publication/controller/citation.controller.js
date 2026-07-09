const citationService = require('../service/citation.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');
const { ValidationError } = require('../../../common/errors/AppError');

class CitationController {
  // GET /api/v1/publications/:id/citation
  getAllCitations = asyncHandler(async (req, res) => {
    const result = await citationService.getAllCitations(req.params.id);
    return res.success('Citations generated successfully.', result);
  });

  // GET /api/v1/publications/:id/citation/:format
  getCitationByFormat = asyncHandler(async (req, res) => {
    const { id, format } = req.params;
    const result = await citationService.getCitationByFormat(id, format);
    return res.success(`${format.toUpperCase()} citation generated.`, result);
  });

  // POST /api/v1/publications/:id/citation/track
  trackCitationEvent = asyncHandler(async (req, res) => {
    const { format, eventType } = req.body;
    if (!format || !eventType) throw new ValidationError('format and eventType are required.');
    if (!['copy', 'export', 'download'].includes(eventType)) {
      throw new ValidationError('eventType must be copy, export, or download.');
    }
    await citationService.trackEvent(req.params.id, format, eventType);
    return res.success('Citation event tracked.', {});
  });

  // GET /api/v1/publications/:id/citation/stats
  getCitationStats = asyncHandler(async (req, res) => {
    const stats = await citationService.getStats(req.params.id);
    return res.success('Citation stats retrieved.', stats);
  });
}

module.exports = new CitationController();
