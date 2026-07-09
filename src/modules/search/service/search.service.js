const mongoose = require('mongoose');
const Publication = require('../../../models/Publication');
const PublicationAuthor = require('../../../models/PublicationAuthor');
const PublicationKeyword = require('../../../models/PublicationKeyword');
const PublicationResearchArea = require('../../../models/PublicationResearchArea');
const SearchHistory = require('../../../models/SearchHistory');
const SearchAnalytic = require('../../../models/SearchAnalytic');
const User = require('../../../models/User');
const Profile = require('../../../models/Profile');
const { ValidationError } = require('../../../common/errors/AppError');

// Sanitize a query string to prevent regex injection
const sanitizeQuery = (q = '') => {
  if (typeof q !== 'string') return '';
  return q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim().slice(0, 500);
};

// Build a safe regex for partial matching
const buildRegex = (q, options = 'i') => new RegExp(sanitizeQuery(q), options);

class SearchService {

  // ─── Core Publication Search ─────────────────────────────────────────────────
  async searchPublications(params) {
    const {
      q = '',
      type = 'all',        // keyword | title | abstract | doi | author | journal | conference
      publicationType,
      yearFrom,
      yearTo,
      journal,
      conference,
      publisher,
      researchArea,
      institution,
      country,
      language,
      openAccess,
      hasPDF,
      isScholarImported,
      visibility = 'Public',
      sort = 'relevance',
      page = 1,
      limit = 20,
      // Advanced search
      exactPhrase,
      booleanMode,         // AND | OR | NOT
    } = params;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // ── Base filter (always applied) ─────────────────────────────────
    const baseFilter = {
      isDeleted: { $ne: true },
      status: 'published',
      visibility: 'Public',
    };

    // ── Query filter ─────────────────────────────────────────────────
    let textFilter = {};
    if (q && q.trim()) {
      const useAtlas = process.env.ATLAS_SEARCH === 'true';
      if (useAtlas) {
        // Atlas $search handled separately via aggregation pipeline
        // Marker: will be added to pipeline stage
        textFilter._atlasSearch = true;
      } else {
        // MongoDB native text index
        if (exactPhrase) {
          textFilter.$text = { $search: `"${q.replace(/"/g, '')}"` };
        } else {
          // Build field-specific regex filter based on type
          switch (type) {
            case 'title':
              textFilter.title = buildRegex(q);
              break;
            case 'abstract':
              textFilter.abstract = buildRegex(q);
              break;
            case 'doi':
              textFilter.doi = buildRegex(q);
              break;
            case 'author':
              // Will handle via author subquery
              break;
            case 'journal':
              textFilter.$or = [
                { journal: buildRegex(q) },
                { publication: buildRegex(q) }
              ];
              break;
            case 'conference':
              textFilter.conference = buildRegex(q);
              break;
            default:
              // Full-text across all fields via $text
              textFilter.$text = { $search: q };
          }
        }
      }
    }

    // ── Optional Filters ──────────────────────────────────────────────
    if (publicationType && publicationType !== 'all') {
      baseFilter.publicationType = publicationType;
    }
    if (yearFrom || yearTo) {
      baseFilter.year = {};
      if (yearFrom) baseFilter.year.$gte = parseInt(yearFrom, 10);
      if (yearTo) baseFilter.year.$lte = parseInt(yearTo, 10);
    }
    if (journal) baseFilter.$or = [{ journal: buildRegex(journal) }, { publication: buildRegex(journal) }];
    if (conference) baseFilter.conference = buildRegex(conference);
    if (publisher) baseFilter.publisher = buildRegex(publisher);
    if (institution) baseFilter.institution = buildRegex(institution);
    if (language) baseFilter.language = buildRegex(language);
    if (openAccess === 'true' || openAccess === true) baseFilter.openAccess = true;
    if (hasPDF === 'true' || hasPDF === true) baseFilter.cloudinaryFileUrl = { $ne: '' };
    if (isScholarImported === 'true' || isScholarImported === true) baseFilter.googleScholarVerified = true;

    // ── Author sub-query (for author-type search) ────────────────────
    let publicationIdsFromAuthors = null;
    if (q && (type === 'author' || type === 'all')) {
      const authorDocs = await PublicationAuthor.find(
        { name: buildRegex(q) },
        { publicationId: 1 }
      ).lean();
      if (type === 'author') {
        publicationIdsFromAuthors = authorDocs.map(a => a.publicationId);
        if (publicationIdsFromAuthors.length === 0) {
          return { results: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
        }
        baseFilter._id = { $in: publicationIdsFromAuthors };
        textFilter = {}; // author filter supersedes text filter
      }
    }

    // ── Research Area sub-query ──────────────────────────────────────
    if (researchArea) {
      const areaDocs = await PublicationResearchArea.find(
        { researchArea: buildRegex(researchArea) },
        { publicationId: 1 }
      ).lean();
      const ids = areaDocs.map(a => a.publicationId);
      if (ids.length === 0) {
        return { results: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
      }
      baseFilter._id = { $in: ids };
    }

    const filter = { ...baseFilter, ...textFilter };
    if (filter._atlasSearch) delete filter._atlasSearch;

    // ── Sort ──────────────────────────────────────────────────────────
    let sortObj = { createdAt: -1 };
    switch (sort) {
      case 'newest':    sortObj = { createdAt: -1 }; break;
      case 'oldest':    sortObj = { createdAt: 1 };  break;
      case 'mostCited': sortObj = { citations: -1 }; break;
      case 'mostViewed': sortObj = { views: -1 };    break;
      case 'mostDownloaded': sortObj = { downloads: -1 }; break;
      case 'alphabetical': sortObj = { title: 1 };   break;
      case 'year':      sortObj = { year: -1 };      break;
      case 'relevance':
        if (filter.$text) sortObj = { score: { $meta: 'textScore' }, createdAt: -1 };
        else sortObj = { createdAt: -1 };
        break;
      default: sortObj = { createdAt: -1 };
    }

    const projection = {
      title: 1, subtitle: 1, authors: 1, journal: 1, publication: 1,
      conference: 1, publisher: 1, year: 1, publicationDate: 1,
      publicationType: 1, abstract: 1, keywords: 1, researchAreas: 1,
      slug: 1, doi: 1, views: 1, downloads: 1, citations: 1,
      recommendations: 1, cloudinaryFileUrl: 1, thumbnail: 1,
      openAccess: 1, googleScholarVerified: 1, institution: 1,
      language: 1, readingTime: 1, researchScore: 1, createdAt: 1,
      publicationCode: 1,
      ...(filter.$text ? { score: { $meta: 'textScore' } } : {})
    };

    const [results, total] = await Promise.all([
      Publication.find(filter, projection)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Publication.countDocuments(filter)
    ]);

    // Enrich with authorsList from PublicationAuthor
    const pubIds = results.map(p => p._id);
    const authorsDocs = await PublicationAuthor.find(
      { publicationId: { $in: pubIds } },
      { publicationId: 1, name: 1, institution: 1, isCorresponding: 1, order: 1 }
    ).sort({ order: 1 }).lean();

    const authorsMap = {};
    for (const a of authorsDocs) {
      const pid = a.publicationId.toString();
      if (!authorsMap[pid]) authorsMap[pid] = [];
      authorsMap[pid].push(a);
    }

    const enriched = results.map(pub => ({
      ...pub,
      id: pub._id,
      authorsList: authorsMap[pub._id.toString()] || [],
      hasPDF: !!(pub.cloudinaryFileUrl),
    }));

    return {
      results: enriched,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // ─── Author Search ───────────────────────────────────────────────────────────
  async searchAuthors(params) {
    const { q = '', page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    if (!q.trim()) return { results: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };

    const pipeline = [
      { $match: { name: buildRegex(q) } },
      {
        $group: {
          _id: '$name',
          institution: { $first: '$institution' },
          publicationCount: { $sum: 1 },
          email: { $first: '$email' },
          authorId: { $first: '$authorId' },
          profileSlug: { $first: '$profileSlug' },
        }
      },
      { $sort: { publicationCount: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          count: [{ $count: 'total' }]
        }
      }
    ];

    const [result] = await PublicationAuthor.aggregate(pipeline);
    const results = result?.data || [];
    const total = result?.count?.[0]?.total || 0;

    return { results, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  // ─── Researcher Search ────────────────────────────────────────────────────────
  async searchResearchers(params) {
    const { q = '', page = 1, limit = 20, country, institution, researchArea, currentUserId } = params;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Search query on user's fullName / email or profile's bio / institution / researchAreas
    const userQuery = {};
    const profileQuery = { isDeleted: { $ne: true } };

    if (country) profileQuery['institutionLocation.country'] = country;
    if (institution) profileQuery.institution = { $regex: institution, $options: 'i' };
    if (researchArea) profileQuery.researchAreas = { $in: [new RegExp(researchArea, 'i')] };

    if (q.trim()) {
      const regex = buildRegex(q);
      profileQuery.$or = [
        { institution: regex },
        { department: regex },
        { biography: regex },
        { researchAreas: { $in: [regex] } }
      ];
      userQuery.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex }
      ];
    }

    // First find matching profiles
    const matchedProfiles = await Profile.find(profileQuery).lean();
    const matchedUserIdsFromProfiles = matchedProfiles.map(p => p.userId);

    // Find users matching either userQuery OR having profile match
    const finalUserFilter = {
      isDeleted: { $ne: true },
      isActive: true
    };

    if (q.trim()) {
      finalUserFilter.$or = [
        ...userQuery.$or,
        { _id: { $in: matchedUserIdsFromProfiles } }
      ];
    } else if (matchedUserIdsFromProfiles.length > 0) {
      finalUserFilter._id = { $in: matchedUserIdsFromProfiles };
    } else if (country || institution || researchArea) {
      // If filters applied but no profiles matched, we should return empty
      return { results: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }

    const [users, total] = await Promise.all([
      User.find(finalUserFilter)
        .skip(skip)
        .limit(limitNum)
        .select('firstName lastName fullName email profileImage profileSlug researcherType institution')
        .lean(),
      User.countDocuments(finalUserFilter)
    ]);

    // Attach profile details & compatibility score if currentUserId is present
    const userIds = users.map(u => u._id);
    const profiles = await Profile.find({ userId: { $in: userIds }, isDeleted: { $ne: true } }).lean();

    const recommendationsService = require('../../recommendations/service/recommendations.service');

    const results = await Promise.all(users.map(async (user) => {
      const prof = profiles.find(p => p.userId.toString() === user._id.toString());
      
      let matchPercentage = 0;
      let reasons = [];
      if (currentUserId && currentUserId.toString() !== user._id.toString()) {
        try {
          const comp = await recommendationsService.calculateCompatibilityScore(currentUserId, user._id);
          matchPercentage = comp.score;
          reasons = comp.reasons;
        } catch (err) {
          console.error(`Failed to calculate compatibility for search result [${user._id}]:`, err);
        }
      }

      return {
        ...user,
        profile: prof || null,
        institution: prof?.institution || user.institution || '',
        researchAreas: prof?.researchAreas || [],
        matchPercentage,
        reasons
      };
    }));

    if (currentUserId) {
      results.sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    return { results, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  // ─── Journal / Conference Search ─────────────────────────────────────────────
  async searchJournals(params) {
    const { q = '', page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {
      isDeleted: { $ne: true },
      status: 'published',
      visibility: 'Public',
    };
    if (q.trim()) {
      matchStage.$or = [
        { journal: buildRegex(q) },
        { publication: buildRegex(q) },
      ];
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: { $ifNull: ['$journal', '$publication'] },
          publicationCount: { $sum: 1 },
          totalCitations: { $sum: '$citations' },
          latestYear: { $max: '$year' },
        }
      },
      { $match: { _id: { $ne: null, $ne: '' } } },
      { $sort: { publicationCount: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          count: [{ $count: 'total' }]
        }
      }
    ];

    const [result] = await Publication.aggregate(pipeline);
    const results = (result?.data || []).map(r => ({
      name: r._id,
      publicationCount: r.publicationCount,
      totalCitations: r.totalCitations,
      latestYear: r.latestYear,
    }));
    const total = result?.count?.[0]?.total || 0;

    return { results, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  async searchConferences(params) {
    const { q = '', page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {
      isDeleted: { $ne: true },
      status: 'published',
      visibility: 'Public',
      conference: { $ne: '' },
    };
    if (q.trim()) matchStage.conference = buildRegex(q);

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$conference',
          publicationCount: { $sum: 1 },
          totalCitations: { $sum: '$citations' },
          latestYear: { $max: '$year' },
        }
      },
      { $match: { _id: { $ne: null, $ne: '' } } },
      { $sort: { publicationCount: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          count: [{ $count: 'total' }]
        }
      }
    ];

    const [result] = await Publication.aggregate(pipeline);
    const results = (result?.data || []).map(r => ({
      name: r._id,
      publicationCount: r.publicationCount,
      totalCitations: r.totalCitations,
      latestYear: r.latestYear,
    }));
    const total = result?.count?.[0]?.total || 0;

    return { results, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  // ─── Autocomplete ────────────────────────────────────────────────────────────
  async getAutocomplete(query) {
    if (!query || query.trim().length < 2) return { publications: [], authors: [], journals: [], conferences: [], keywords: [] };

    const regex = buildRegex(query);
    const baseFilter = { isDeleted: { $ne: true }, status: 'published', visibility: 'Public' };

    const [publications, authors, journalDocs, conferenceDocs, keywordDocs] = await Promise.all([
      Publication.find(
        { ...baseFilter, title: regex },
        { title: 1, slug: 1, publicationType: 1, authors: 1, year: 1 }
      ).sort({ views: -1 }).limit(5).lean(),

      PublicationAuthor.aggregate([
        { $match: { name: regex } },
        { $group: { _id: '$name', institution: { $first: '$institution' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      Publication.distinct('journal', { ...baseFilter, journal: regex }).then(r => r.slice(0, 5)),
      Publication.distinct('conference', { ...baseFilter, conference: regex }).then(r => r.slice(0, 5)),
      PublicationKeyword.aggregate([
        { $match: { keyword: regex } },
        { $group: { _id: '$keyword', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    return {
      publications: publications.map(p => ({ id: p._id, title: p.title, slug: p.slug, type: p.publicationType, year: p.year })),
      authors: authors.map(a => ({ name: a._id, institution: a.institution })),
      journals: journalDocs.filter(Boolean),
      conferences: conferenceDocs.filter(Boolean),
      keywords: keywordDocs.map(k => k._id),
    };
  }

  // ─── Trending ────────────────────────────────────────────────────────────────
  async getTrending() {
    const [trendingQueries, popularAreas, popularJournals] = await Promise.all([
      SearchAnalytic.find({})
        .sort({ hitCount: -1 })
        .limit(10)
        .select('query hitCount searchType')
        .lean(),

      PublicationResearchArea.aggregate([
        { $group: { _id: '$researchArea', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]),

      Publication.aggregate([
        { $match: { isDeleted: { $ne: true }, status: 'published', journal: { $ne: '' } } },
        { $group: { _id: { $ifNull: ['$journal', '$publication'] }, count: { $sum: 1 } } },
        { $match: { _id: { $ne: null, $ne: '' } } },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ])
    ]);

    return {
      trendingQueries: trendingQueries.map(t => ({ query: t.query, count: t.hitCount })),
      trendingResearchAreas: popularAreas.map(a => ({ area: a._id, count: a.count })),
      popularJournals: popularJournals.map(j => ({ journal: j._id, count: j.count })),
    };
  }

  // ─── Search History ──────────────────────────────────────────────────────────
  async saveHistory(userId, query, filters, resultCount, searchType) {
    if (!userId || !query?.trim()) return;

    // Upsert: if same user queried this before, update timestamp
    await SearchHistory.findOneAndUpdate(
      { userId, query: query.trim(), isDeleted: { $ne: true } },
      { $set: { filters: filters || {}, resultCount: resultCount || 0, searchType: searchType || 'all', updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    // Bump analytic counter
    const normalized = query.trim().toLowerCase();
    await SearchAnalytic.findOneAndUpdate(
      { normalizedQuery: normalized, searchType: searchType || 'all' },
      {
        $inc: { hitCount: 1 },
        $set: { query: query.trim(), lastSearchedAt: new Date() }
      },
      { upsert: true }
    );
  }

  async getHistory(userId) {
    return SearchHistory.find({ userId, isDeleted: { $ne: true } })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('query filters resultCount searchType isFavorite createdAt updatedAt')
      .lean();
  }

  async clearHistory(userId, entryId) {
    if (entryId) {
      await SearchHistory.findOneAndUpdate(
        { _id: entryId, userId },
        { $set: { isDeleted: true } }
      );
    } else {
      await SearchHistory.updateMany({ userId }, { $set: { isDeleted: true } });
    }
  }

  async toggleFavoriteHistory(userId, entryId) {
    const entry = await SearchHistory.findOne({ _id: entryId, userId });
    if (!entry) return null;
    entry.isFavorite = !entry.isFavorite;
    await entry.save();
    return entry;
  }
}

module.exports = new SearchService();
