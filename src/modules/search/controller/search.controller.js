const searchService = require('../service/search.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');
const { ValidationError } = require('../../../common/errors/AppError');

class SearchController {
  // GET /api/v1/search  (combined)
  search = asyncHandler(async (req, res) => {
    const { q, type, sort, page, limit, ...filters } = req.query;
    if (!q || !q.trim()) {
      // Return trending when no query
      const trending = await searchService.getTrending();
      return res.success('Trending data retrieved.', { trending, results: [], total: 0 });
    }

    const results = await searchService.searchPublications({ q, type, sort, page, limit, ...filters });

    // Save history for authenticated users (non-blocking)
    if (req.user) {
      searchService.saveHistory(req.user._id, q, filters, results.total, 'all').catch(() => {});
    }

    return res.success('Search completed.', results);
  });

  // GET /api/v1/search/publications
  searchPublications = asyncHandler(async (req, res) => {
    const { q, type, sort, page, limit, ...filters } = req.query;
    const results = await searchService.searchPublications({ q, type, sort, page, limit, ...filters });

    if (req.user && q?.trim()) {
      searchService.saveHistory(req.user._id, q, filters, results.total, 'publications').catch(() => {});
    }

    return res.success('Publications search completed.', results);
  });

  // GET /api/v1/search/authors
  searchAuthors = asyncHandler(async (req, res) => {
    const results = await searchService.searchAuthors(req.query);
    return res.success('Authors search completed.', results);
  });

  // GET /api/v1/search/researchers
  searchResearchers = asyncHandler(async (req, res) => {
    const results = await searchService.searchResearchers({
      ...req.query,
      currentUserId: req.user?.id
    });
    return res.success('Researchers search completed.', results);
  });

  // GET /api/v1/search/journals
  searchJournals = asyncHandler(async (req, res) => {
    const results = await searchService.searchJournals(req.query);
    return res.success('Journals search completed.', results);
  });

  // GET /api/v1/search/conferences
  searchConferences = asyncHandler(async (req, res) => {
    const results = await searchService.searchConferences(req.query);
    return res.success('Conferences search completed.', results);
  });

  // GET /api/v1/search/autocomplete
  autocomplete = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const results = await searchService.getAutocomplete(q || '');
    return res.success('Autocomplete results.', results);
  });

  // GET /api/v1/search/trending
  getTrending = asyncHandler(async (req, res) => {
    const results = await searchService.getTrending();
    return res.success('Trending data retrieved.', results);
  });

  // GET /api/v1/search/history
  getHistory = asyncHandler(async (req, res) => {
    const history = await searchService.getHistory(req.user._id);
    return res.success('Search history retrieved.', history);
  });

  // POST /api/v1/search/history
  saveHistory = asyncHandler(async (req, res) => {
    const { query, filters, resultCount, searchType } = req.body;
    if (!query?.trim()) throw new ValidationError('Query is required.');
    await searchService.saveHistory(req.user._id, query, filters, resultCount, searchType);
    return res.success('Search history saved.', {});
  });

  // DELETE /api/v1/search/history
  clearHistory = asyncHandler(async (req, res) => {
    const { id } = req.query;
    await searchService.clearHistory(req.user._id, id || null);
    return res.success('Search history cleared.', {});
  });

  // PATCH /api/v1/search/history/:id/favorite
  toggleFavorite = asyncHandler(async (req, res) => {
    const entry = await searchService.toggleFavoriteHistory(req.user._id, req.params.id);
    return res.success('Favorite toggled.', entry);
  });
}

module.exports = new SearchController();
