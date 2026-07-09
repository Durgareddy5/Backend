const ResearchIdentity = require('../../../models/ResearchIdentity');
const IdentityProvider = require('../../../models/IdentityProvider');
const AcademicMetrics = require('../../../models/AcademicMetrics');
const CoAuthorGraph = require('../../../models/CoAuthorGraph');
const User = require('../../../models/User');
const Profile = require('../../../models/Profile');
const { NotFoundError, ValidationError, ConflictError } = require('../../../common/errors/AppError');
const logger = require('../../../common/logger/winston');
const mongoose = require('mongoose');

class IdentityService {
  /**
   * Connect an identity provider to a researcher
   */
  async connectProvider(userId, { provider, providerUserId, providerUrl, preferredName }) {
    // 1. Create or update provider link
    let identityProvider = await IdentityProvider.findOne({ userId, provider, isDeleted: { $ne: true } });
    if (identityProvider) {
      throw new ConflictError(`Provider '${provider}' is already connected to this account.`);
    }

    identityProvider = await IdentityProvider.create({
      userId,
      provider,
      providerUserId,
      accessToken: '', // Option for OAuth credentials
      refreshToken: ''
    });

    // 2. Initialize or update ResearchIdentity record
    let identity = await ResearchIdentity.findOne({ userId, isDeleted: { $ne: true } });
    if (!identity) {
      // Find user to generate initial profile slug
      const user = await User.findById(userId);
      const slug = user ? user.profileSlug : `identity-${userId}`;
      identity = await ResearchIdentity.create({
        userId,
        profileSlug: slug,
        preferredName: preferredName || (user ? `${user.firstName} ${user.lastName}` : '')
      });
    }

    // Map provider to specific field
    const fieldMapping = {
      google_scholar: 'googleScholarId',
      orcid: 'orcid',
      scopus: 'scopusId',
      openalex: 'openAlexId',
      crossref: 'crossrefId',
      semantic_scholar: 'semanticScholarId'
    };

    const targetField = fieldMapping[provider];
    if (targetField) {
      identity[targetField] = providerUserId;
      if (provider === 'google_scholar') {
        identity.googleScholarUrl = providerUrl || `https://scholar.google.com/citations?user=${providerUserId}`;
      }
    } else {
      // Map social/profile URLs
      if (provider === 'linkedin') identity.linkedinUrl = providerUrl;
      else if (provider === 'github') identity.github = providerUserId;
    }

    await identity.save();

    // Set user type as academic if they complete identities
    const user = await User.findById(userId);
    if (user && user.researcherType === 'non_researcher') {
      user.researcherType = 'academic';
      await user.save();
    }

    // 3. Trigger async background synchronization job
    const queueService = require('./identitySyncQueue.service');
    await queueService.enqueueSyncJob(userId, provider, { providerUserId });

    return {
      success: true,
      message: `Connected ${provider} successfully. Profile sync started in background.`,
      provider: identityProvider
    };
  }

  /**
   * Disconnect an identity provider from a researcher
   */
  async disconnectProvider(userId, provider) {
    const identityProvider = await IdentityProvider.findOne({ userId, provider, isDeleted: { $ne: true } });
    if (!identityProvider) {
      throw new NotFoundError(`Provider '${provider}' connection not found.`);
    }

    // Soft delete the provider link
    identityProvider.isDeleted = true;
    await identityProvider.save();

    // Clear provider link in ResearchIdentity
    const identity = await ResearchIdentity.findOne({ userId, isDeleted: { $ne: true } });
    if (identity) {
      const fieldMapping = {
        google_scholar: 'googleScholarId',
        orcid: 'orcid',
        scopus: 'scopusId',
        openalex: 'openAlexId',
        crossref: 'crossrefId',
        semantic_scholar: 'semanticScholarId'
      };

      const targetField = fieldMapping[provider];
      if (targetField) {
        identity[targetField] = undefined;
        if (provider === 'google_scholar') {
          identity.googleScholarUrl = undefined;
        }
      } else {
        if (provider === 'linkedin') identity.linkedinUrl = undefined;
        else if (provider === 'github') identity.github = undefined;
      }
      await identity.save();
    }

    return {
      success: true,
      message: `Provider '${provider}' disconnected successfully.`
    };
  }

  /**
   * Trigger immediate manual sync of provider data
   */
  async triggerSync(userId, provider) {
    const identityProvider = await IdentityProvider.findOne({ userId, provider, isDeleted: { $ne: true } });
    if (!identityProvider) {
      throw new ValidationError(`Provider '${provider}' is not connected to this account.`);
    }

    const queueService = require('./identitySyncQueue.service');
    const activeJob = await queueService.enqueueSyncJob(userId, provider, { providerUserId: identityProvider.providerUserId });

    return {
      success: true,
      message: 'Sync job enqueued successfully.',
      jobId: activeJob._id
    };
  }

  /**
   * Get researcher's canonical connected academic profiles
   */
  async getProfile(userId) {
    const identity = await ResearchIdentity.findOne({ userId, isDeleted: { $ne: true } });
    if (!identity) {
      throw new NotFoundError('Academic identity profile not found.');
    }
    return identity;
  }

  /**
   * List all identity providers and their connection statuses for a user
   */
  async getProviders(userId) {
    const activeLinks = await IdentityProvider.find({ userId, isDeleted: { $ne: true } }).lean();
    const providers = [
      { id: 'google_scholar', name: 'Google Scholar', connected: false },
      { id: 'orcid', name: 'ORCID', connected: false },
      { id: 'scopus', name: 'Scopus ID', connected: false },
      { id: 'openalex', name: 'OpenAlex', connected: false },
      { id: 'crossref', name: 'Crossref ID', connected: false },
      { id: 'semantic_scholar', name: 'Semantic Scholar', connected: false },
      { id: 'github', name: 'GitHub', connected: false },
      { id: 'linkedin', name: 'LinkedIn', connected: false }
    ];

    activeLinks.forEach(link => {
      const p = providers.find(prov => prov.id === link.provider);
      if (p) {
        p.connected = true;
        p.providerUserId = link.providerUserId;
        p.linkedAt = link.createdAt;
      }
    });

    return providers;
  }

  /**
   * Get academic metrics
   */
  async getMetrics(userId) {
    const metrics = await AcademicMetrics.findOne({ userId, provider: 'aggregate', isDeleted: { $ne: true } }).lean();
    if (!metrics) {
      return {
        publications: 0,
        citations: 0,
        hIndex: 0,
        i10Index: 0,
        reads: 0,
        downloads: 0,
        views: 0,
        followers: 0,
        following: 0,
        connections: 0
      };
    }
    return metrics;
  }

  /**
   * Get co-author collaboration graph data
   */
  async getCoAuthors(userId) {
    const graph = await CoAuthorGraph.findOne({ userId, isDeleted: { $ne: true } }).lean();
    if (!graph) {
      return {
        coAuthorNetwork: [],
        institutionGraph: [],
        researchAreaGraph: [],
        collaborationTimeline: []
      };
    }
    return graph;
  }

  /**
   * Merge publications to avoid duplication using Title and DOI
   */
  async mergePublications(userId, publications) {
    const Publication = require('../../../models/Publication');
    const existingList = await Publication.find({ userId, isDeleted: { $ne: true } }).lean();

    let addedCount = 0;
    let mergedCount = 0;

    for (const pub of publications) {
      // Clean and normalize strings for matching
      const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      
      const isDuplicate = existingList.some(existing => {
        if (pub.doi && existing.doi && pub.doi.toLowerCase() === existing.doi.toLowerCase()) {
          return true;
        }
        return normalize(pub.title) === normalize(existing.title);
      });

      if (!isDuplicate) {
        await Publication.create({
          userId,
          title: pub.title,
          abstract: pub.abstract || '',
          doi: pub.doi || '',
          year: pub.year,
          journal: pub.journal || pub.publication || '',
          citations: pub.citations || 0,
          googleScholarVerified: pub.isScholar || false,
          status: 'published'
        });
        addedCount++;
      } else {
        mergedCount++;
      }
    }

    return { addedCount, mergedCount };
  }
}

module.exports = new IdentityService();
