const mongoose = require('mongoose');
const Publication = require('../../../models/Publication');
const PublicationView = require('../../../models/PublicationView');
const PublicationDownload = require('../../../models/PublicationDownload');
const PublicationBookmark = require('../../../models/PublicationBookmark');
const PublicationComment = require('../../../models/PublicationComment');
const PublicationAnalytic = require('../../../models/PublicationAnalytic');
const PublicationMetric = require('../../../models/PublicationMetric');
const PublicationCitation = require('../../../models/PublicationCitation');
const Profile = require('../../../models/Profile');
const { NotFoundError, ForbiddenError } = require('../../../common/errors/AppError');

class AnalyticsService {
  /**
   * Main analytics summary for a single publication
   */
  async getPublicationAnalytics(pubId, requestingUserId) {
    const pub = await Publication.findById(pubId)
      .select('userId title slug views downloads citations recommendations createdAt publicationType')
      .lean();

    if (!pub) throw new NotFoundError('Publication not found.');

    // Ownership check — only owner can see analytics
    if (pub.userId.toString() !== requestingUserId.toString()) {
      throw new ForbiddenError('You do not have permission to view analytics for this publication.');
    }

    const objectId = new mongoose.Types.ObjectId(pubId);

    const [
      totalViews,
      totalDownloads,
      totalBookmarks,
      totalComments,
      citationStats,
      metric,
      recentViews7d,
      recentDownloads7d,
      recentViews30d,
      recentDownloads30d,
    ] = await Promise.all([
      PublicationView.countDocuments({ publicationId: objectId }),
      PublicationDownload.countDocuments({ publicationId: objectId }),
      PublicationBookmark.countDocuments({ publicationId: objectId, isDeleted: { $ne: true } }),
      PublicationComment.countDocuments({ publicationId: objectId, isDeleted: { $ne: true } }),
      PublicationCitation.findOne({ publicationId: objectId }).lean(),
      PublicationMetric.findOne({ publicationId: objectId }).lean(),

      // 7-day views
      PublicationView.countDocuments({
        publicationId: objectId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      PublicationDownload.countDocuments({
        publicationId: objectId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      // 30-day views
      PublicationView.countDocuments({
        publicationId: objectId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      PublicationDownload.countDocuments({
        publicationId: objectId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
    ]);

    return {
      publication: {
        id: pub._id,
        title: pub.title,
        slug: pub.slug,
        type: pub.publicationType,
        publishedAt: pub.createdAt,
      },
      summary: {
        totalViews,
        totalDownloads,
        totalBookmarks,
        totalComments,
        totalCitations: pub.citations || 0,
        totalRecommendations: pub.recommendations || 0,
        totalCitationCopies: citationStats?.copyCount || 0,
        totalCitationExports: citationStats?.exportCount || 0,
        researchScore: metric?.researchScore || pub.researchScore || 0,
      },
      recentActivity: {
        views7d: recentViews7d,
        downloads7d: recentDownloads7d,
        views30d: recentViews30d,
        downloads30d: recentDownloads30d,
      }
    };
  }

  /**
   * Views timeline grouped by day (for line chart)
   */
  async getViewsTimeline(pubId, period = '30d') {
    const objectId = new mongoose.Types.ObjectId(pubId);
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          publicationId: objectId,
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ];

    const raw = await PublicationView.aggregate(pipeline);

    // Fill gaps with 0 for missing days
    const dataMap = {};
    for (const r of raw) {
      const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`;
      dataMap[key] = r.count;
    }

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, views: dataMap[key] || 0 });
    }

    return { period, timeline: result };
  }

  /**
   * Downloads timeline grouped by day
   */
  async getDownloadsTimeline(pubId, period = '30d') {
    const objectId = new mongoose.Types.ObjectId(pubId);
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          publicationId: objectId,
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ];

    const raw = await PublicationDownload.aggregate(pipeline);

    const dataMap = {};
    for (const r of raw) {
      const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`;
      dataMap[key] = r.count;
    }

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, downloads: dataMap[key] || 0 });
    }

    return { period, timeline: result };
  }

  /**
   * Profile-level aggregate analytics across all publications
   */
  async getProfilePublicationAnalytics(profileSlug, requestingUserId) {
    const profile = await Profile.findOne({ profileSlug }).select('userId').lean();
    if (!profile) throw new NotFoundError('Profile not found.');

    // Only owner can view profile analytics
    if (profile.userId.toString() !== requestingUserId.toString()) {
      throw new ForbiddenError('You do not have permission to view these analytics.');
    }

    const userId = profile.userId;

    const [publications, totalViews, totalDownloads, totalBookmarks] = await Promise.all([
      Publication.find({ userId, isDeleted: { $ne: true } })
        .select('title slug publicationType views downloads citations recommendations createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      PublicationView.countDocuments({ publicationId: { $in: await Publication.distinct('_id', { userId }) } }),
      PublicationDownload.countDocuments({ publicationId: { $in: await Publication.distinct('_id', { userId }) } }),
      PublicationBookmark.countDocuments({
        publicationId: { $in: await Publication.distinct('_id', { userId }) },
        isDeleted: { $ne: true }
      }),
    ]);

    const totalCitations = publications.reduce((sum, p) => sum + (p.citations || 0), 0);
    const totalRecommendations = publications.reduce((sum, p) => sum + (p.recommendations || 0), 0);

    // Publications per type breakdown
    const typeBreakdown = publications.reduce((acc, p) => {
      const type = p.publicationType || 'Article';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      summary: {
        totalPublications: publications.length,
        totalViews,
        totalDownloads,
        totalBookmarks,
        totalCitations,
        totalRecommendations,
      },
      typeBreakdown: Object.entries(typeBreakdown).map(([type, count]) => ({ type, count })),
      topPublications: publications.slice(0, 5).map(p => ({
        id: p._id,
        title: p.title,
        slug: p.slug,
        type: p.publicationType,
        views: p.views || 0,
        downloads: p.downloads || 0,
        citations: p.citations || 0,
      })),
    };
  }
}

module.exports = new AnalyticsService();
