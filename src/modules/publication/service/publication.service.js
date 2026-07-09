const mongoose = require('mongoose');
const publicationRepository = require('../repository/publication.repository');
const Publication = require('../../../models/Publication');
const PublicationAuthor = require('../../../models/PublicationAuthor');
const PublicationFile = require('../../../models/PublicationFile');
const PublicationKeyword = require('../../../models/PublicationKeyword');
const PublicationResearchArea = require('../../../models/PublicationResearchArea');
const PublicationMetric = require('../../../models/PublicationMetric');
const PublicationAnalytic = require('../../../models/PublicationAnalytic');
const PublicationView = require('../../../models/PublicationView');
const PublicationDownload = require('../../../models/PublicationDownload');
const PublicationBookmark = require('../../../models/PublicationBookmark');
const PublicationComment = require('../../../models/PublicationComment');
const PublicationHistory = require('../../../models/PublicationHistory');
const ActivityLog = require('../../../models/ActivityLog');
const profileService = require('../../profile/service/profile.service');
const { generateSlug } = require('../helper/slug.helper');
const cloudinaryService = require('./cloudinary.service');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../../common/errors/AppError');

class PublicationService {
  /**
   * Helper to write sub-collection details
   */
  async _saveSubCollections(publicationId, userId, data) {
    const { authorsList = [], keywords = [], researchAreas = [] } = data;

    // 1. Save Authors
    if (authorsList && authorsList.length > 0) {
      await PublicationAuthor.deleteMany({ publicationId });
      const authorsData = authorsList.map((author, index) => ({
        publicationId,
        authorId: author.authorId || '',
        name: author.name,
        email: author.email || '',
        institution: author.institution || '',
        department: author.department || '',
        isCoAuthor: author.authorId !== userId.toString(),
        isCorresponding: !!author.isCorresponding,
        order: author.order !== undefined ? author.order : index
      }));
      await PublicationAuthor.insertMany(authorsData);
    }

    // 2. Save Keywords
    if (keywords && keywords.length > 0) {
      await PublicationKeyword.deleteMany({ publicationId });
      const keywordsData = keywords.map(kw => ({
        publicationId,
        keyword: kw.trim()
      }));
      await PublicationKeyword.insertMany(keywordsData);
    }

    // 3. Save Research Areas
    if (researchAreas && researchAreas.length > 0) {
      await PublicationResearchArea.deleteMany({ publicationId });
      const areasData = researchAreas.map(area => ({
        publicationId,
        researchArea: area.trim()
      }));
      await PublicationResearchArea.insertMany(areasData);
    }
  }

  /**
   * Create / Publish a Publication
   */
  async createPublication(userId, data, isDraft = false) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Enforce Validation
      if (!data.title) {
        throw new ValidationError('Publication title is required.');
      }
      if (!data.publicationType) {
        throw new ValidationError('Publication type is required.');
      }

      // Check duplicate by DOI or Google Scholar ID
      const duplicateConditions = [];
      if (data.doi && data.doi.trim()) duplicateConditions.push({ doi: data.doi.trim() });
      const scholarId = data.googleScholarPublicationId || data.citationId;
      if (scholarId && scholarId.trim()) duplicateConditions.push({ googleScholarPublicationId: scholarId.trim() });

      let existingPub = null;
      if (duplicateConditions.length > 0) {
        existingPub = await Publication.findOne({
          userId,
          isDeleted: { $ne: true },
          $or: duplicateConditions
        });
      }

      if (!existingPub && data.title) {
        // Check title duplicate for user
        const cleanTitle = data.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const userPublications = await Publication.find({ userId, isDeleted: { $ne: true } });
        existingPub = userPublications.find(p => p.title.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTitle);
      }

      // Bypass merge/update for manual file uploads to allow uploading the same PDF multiple times
      const isManualUpload = !!(data.fileDetails && data.fileDetails.secure_url);

      if (existingPub && !isManualUpload) {
        // If it's a real duplicate manually uploaded that has a PDF attached, throw validation error
        if (existingPub.status === 'published' && existingPub.cloudinaryFileUrl && !isDraft) {
          throw new ValidationError('A publication with this title, DOI, or Scholar ID already exists in your library.');
        }

        // Merge/update the existing record!
        const isPublishingDraft = existingPub.status === 'draft' && !isDraft;

        const updatableFields = [
          'title', 'subtitle', 'abstract', 'doi', 'isbn', 'issn',
          'journal', 'conference', 'publisher', 'volume', 'issue', 'pages',
          'publicationDate', 'language', 'visibility', 'publicationType', 'publicationFormat',
          'researchType', 'correspondingAuthor', 'institution', 'department', 'thumbnail',
          'license', 'funding', 'openAccess'
        ];

        updatableFields.forEach(field => {
          if (data[field] !== undefined) {
            existingPub[field] = data[field];
          }
        });

        if (isDraft) {
          existingPub.status = 'draft';
        } else {
          existingPub.status = 'published';
          existingPub.visibility = data.visibility || 'Public';
          if (!existingPub.researchScore) {
            existingPub.researchScore = 20 + Math.floor(Math.random() * 10);
          }
        }

        if (data.fileDetails && data.fileDetails.secure_url) {
          existingPub.cloudinaryFileUrl = data.fileDetails.secure_url;
          existingPub.pdfURL = data.fileDetails.secure_url;
          existingPub.fileDetails = {
            secure_url: data.fileDetails.secure_url || '',
            public_id: data.fileDetails.public_id || '',
            resource_type: data.fileDetails.resource_type || '',
            bytes: data.fileDetails.bytes || 0,
            format: data.fileDetails.format || '',
            pages: data.fileDetails.pages || 0,
            asset_id: data.fileDetails.asset_id || ''
          };

          await PublicationFile.deleteMany({ publicationId: existingPub._id });
          const fileDoc = new PublicationFile({
            publicationId: existingPub._id,
            secure_url: data.fileDetails.secure_url,
            public_id: data.fileDetails.public_id,
            resource_type: data.fileDetails.resource_type || 'raw',
            bytes: data.fileDetails.bytes || 0,
            format: data.fileDetails.format || '',
            pages: data.fileDetails.pages || 0,
            asset_id: data.fileDetails.asset_id || ''
          });
          await fileDoc.save({ session });
        }

        if (scholarId) {
          existingPub.googleScholarPublicationId = scholarId;
          existingPub.citationId = scholarId;
        }

        const authorNames = data.authorsList && data.authorsList.length > 0
          ? data.authorsList.map(a => a.name).join(', ')
          : data.authors || existingPub.authors;
        existingPub.authors = authorNames;

        await existingPub.save({ session });

        // Save detailed metadata in publicationMetadata
        const PublicationMetadata = require('../../../models/PublicationMetadata');
        await PublicationMetadata.findOneAndUpdate(
          { publicationId: existingPub._id },
          {
            abstract: data.abstract || existingPub.abstract || '',
            references: data.references || [],
            publisher: data.publisher || existingPub.publisher || ''
          },
          { upsert: true, session }
        );

        // Save subcollections
        await this._saveSubCollections(existingPub._id, userId, {
          authorsList: data.authorsList,
          keywords: data.keywords,
          researchAreas: data.researchAreas
        });

        // History log
        const historyDoc = new PublicationHistory({
          publicationId: existingPub._id,
          userId,
          action: isPublishingDraft ? 'publish' : 'update',
          changes: data
        });
        await historyDoc.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Recalculate metrics
        try {
          await profileService.calculateAndSaveResearchMetrics(userId);
        } catch (e) {}

        return existingPub;
      }

      // Check and prevent E11000 duplicate key error on unique indexes (doi and googleScholarPublicationId)
      // for new publication records.
      let finalDoi = data.doi ? data.doi.trim() : '';
      if (finalDoi) {
        const duplicateDoi = await Publication.findOne({ doi: finalDoi, isDeleted: { $ne: true } }).lean();
        if (duplicateDoi) {
          finalDoi = undefined; // Unset duplicate DOI to prevent collision
        }
      }

      let finalScholarId = scholarId ? scholarId.trim() : '';
      if (finalScholarId) {
        const duplicateScholar = await Publication.findOne({ googleScholarPublicationId: finalScholarId, isDeleted: { $ne: true } }).lean();
        if (duplicateScholar) {
          finalScholarId = undefined; // Unset duplicate Scholar ID to prevent collision
        }
      }

      // 2. Generate unique slug with DB collision check.
      // If "machine-learning-survey" already exists: try "machine-learning-survey-RC1", then "-RC2", etc.
      let slug = generateSlug(data.title);
      const baseSlug = slug;
      let slugAttempt = 0;
      let slugIsUnique = false;
      while (!slugIsUnique && slugAttempt < 10) {
        const existing = await Publication.findOne({ slug }).lean();
        if (!existing) {
          slugIsUnique = true;
        } else {
          slugAttempt++;
          slug = `${baseSlug}-RC${slugAttempt}`;
        }
      }

      const abstractWords = data.abstract ? data.abstract.split(/\s+/).length : 0;
      const readingTime = Math.max(1, Math.ceil(abstractWords / 150));
      const researchScore = isDraft ? 0 : (20 + Math.floor(Math.random() * 10));

      const authorNames = data.authorsList && data.authorsList.length > 0
        ? data.authorsList.map(a => a.name).join(', ')
        : data.authors || '';

      // 3. Save publication root document
      const pubPayload = {
        userId,
        ownerId: userId,
        // publicationId from the upload endpoint (RCPUB_ ULID format)
        // If the client passes it back after the upload step, use it.
        // Otherwise the model default (() => generatePublicationId()) generates a new one.
        ...(data.publicationId ? { publicationId: data.publicationId } : {}),
        slug,
        title: data.title,
        subtitle: data.subtitle || '',
        authors: authorNames,
        publication: data.publication || data.journal || data.conference || '',
        journal: data.journal || '',
        conference: data.conference || '',
        publisher: data.publisher || '',
        year: data.year || (data.publicationDate ? new Date(data.publicationDate).getFullYear() : new Date().getFullYear()),
        publicationDate: data.publicationDate || new Date(),
        doi: finalDoi || '',
        isbn: data.isbn || '',
        issn: data.issn || '',
        googleScholarPublicationId: finalScholarId || '',
        citationId: finalScholarId || '',
        volume: data.volume || '',
        issue: data.issue || '',
        pages: data.pages || '',
        abstract: data.abstract || '',
        keywords: data.keywords || [],
        researchAreas: data.researchAreas || [],
        publicationType: data.publicationType,
        publicationFormat: data.publicationFormat || '',
        researchType: data.researchType || '',
        correspondingAuthor: data.correspondingAuthor || '',
        institution: data.institution || '',
        department: data.department || '',
        language: data.language || '',
        visibility: isDraft ? 'Draft' : (data.visibility || 'Public'),
        status: isDraft ? 'draft' : 'published',
        cloudinaryFileUrl: data.fileDetails?.secure_url || '',
        pdfURL: data.fileDetails?.secure_url || '', // for compatibility
        thumbnail: data.thumbnail || '',
        readingTime,
        researchScore,
        license: data.license || '',
        funding: data.funding || '',
        openAccess: !!data.openAccess,
        fileDetails: data.fileDetails ? {
          secure_url: data.fileDetails.secure_url || '',
          public_id: data.fileDetails.public_id || '',
          resource_type: data.fileDetails.resource_type || '',
          bytes: data.fileDetails.bytes || 0,
          format: data.fileDetails.format || '',
          pages: data.fileDetails.pages || 0,
          asset_id: data.fileDetails.asset_id || ''
        } : undefined
      };

      const publication = new Publication(pubPayload);
      await publication.save({ session });

      // 3.5 Save detailed metadata in publicationMetadata collection
      const PublicationMetadata = require('../../../models/PublicationMetadata');
      let metadataDoc = null;
      if (data.metadataCacheId) {
        try {
          metadataDoc = await PublicationMetadata.findById(data.metadataCacheId);
        } catch (e) {}
      }
      if (metadataDoc) {
        metadataDoc.publicationId = publication._id;
        metadataDoc.abstract = data.abstract || metadataDoc.abstract || '';
        metadataDoc.references = data.references || metadataDoc.references || [];
        metadataDoc.publisher = data.publisher || metadataDoc.publisher || '';
        await metadataDoc.save({ session });
      } else {
        metadataDoc = new PublicationMetadata({
          publicationId: publication._id,
          abstract: data.abstract || '',
          references: data.references || [],
          publisher: data.publisher || ''
        });
        await metadataDoc.save({ session });
      }

      // 4. Save file metadata if present
      if (data.fileDetails && data.fileDetails.secure_url) {
        const fileDoc = new PublicationFile({
          publicationId: publication._id,
          secure_url: data.fileDetails.secure_url,
          public_id: data.fileDetails.public_id,
          resource_type: data.fileDetails.resource_type || 'raw',
          bytes: data.fileDetails.bytes || 0,
          format: data.fileDetails.format || '',
          pages: data.fileDetails.pages || 0,
          asset_id: data.fileDetails.asset_id || ''
        });
        await fileDoc.save({ session });
      }

      // 5. Save authors, keywords, research areas
      await this._saveSubCollections(publication._id, userId, {
        authorsList: data.authorsList,
        keywords: data.keywords,
        researchAreas: data.researchAreas
      });

      // 6. Initialize Metric
      const metricDoc = new PublicationMetric({
        publicationId: publication._id,
        views: 0,
        downloads: 0,
        citations: 0,
        shares: 0,
        bookmarks: 0,
        comments: 0
      });
      await metricDoc.save({ session });

      // 7. Log History
      const historyDoc = new PublicationHistory({
        publicationId: publication._id,
        userId,
        action: isDraft ? 'draft_save' : 'create',
        changes: pubPayload
      });
      await historyDoc.save({ session });

      // 8. Create Activity timeline log if published
      if (!isDraft) {
        const activityDoc = new ActivityLog({
          userId,
          action: 'publication_created',
          referenceId: publication._id,
          referenceModel: 'Publication',
          details: `Published research: "${publication.title}"`
        });
        await activityDoc.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      // 9. Recalculate researcher profile metrics in background
      if (!isDraft) {
        try {
          await profileService.calculateAndSaveResearchMetrics(userId);
        } catch (metricsError) {
          console.error('[METRICS RECALCULATION ERROR]:', metricsError);
        }

        // Notify followers and connections in the background
        try {
          const Follow = require('../../../models/Follow');
          const Connection = require('../../../models/Connection');
          const User = require('../../../models/User');
          const notificationService = require('../../notifications/service/notification.service');
          
          const actorUser = await User.findById(userId).select('firstName lastName').lean();
          const actorName = actorUser ? `${actorUser.firstName} ${actorUser.lastName}` : 'A researcher';
          
          // 1. Get Followers
          const followers = await Follow.find({ followingId: userId }).select('followerId').lean();
          const followerIds = followers.map(f => f.followerId.toString());

          // 2. Get Connections
          const connections = await Connection.find({
            $or: [{ researcherA: userId }, { researcherB: userId }]
          }).lean();
          const connectionIds = connections.map(c =>
            c.researcherA.toString() === userId.toString() ? c.researcherB.toString() : c.researcherA.toString()
          );

          // 3. Merge and De-duplicate recipient IDs
          const recipientIds = Array.from(new Set([...followerIds, ...connectionIds]));
          
          if (recipientIds.length > 0) {
            setImmediate(() => {
              recipientIds.forEach(async (recipientId) => {
                await notificationService.createNotification({
                  recipientId,
                  actorId: userId,
                  type: 'publication_uploaded',
                  title: 'New Publication Uploaded',
                  message: `${actorName} published a new research paper: "${publication.title}"`,
                  targetType: 'Publication',
                  targetId: publication._id,
                  targetUrl: `/publication/${publication.slug}`
                }).catch(err => console.error(`Failed to notify recipient [${recipientId}]: ${err.message}`));
              });
            });
          }
        } catch (notifErr) {
          console.error('[PUBLICATION UPLOAD NOTIFICATION ERROR]:', notifErr);
        }
      }

      return publication;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      // Cloudinary Rollback: delete the uploaded file if MongoDB transaction failed.
      // This prevents orphan files in Cloudinary storage.
      if (data.fileDetails && data.fileDetails.public_id) {
        const resourceType = data.fileDetails.resource_type || 'raw';
        try {
          await cloudinaryService.deleteFile(data.fileDetails.public_id, resourceType);
        } catch (rollbackErr) {
          // Log but do not rethrow — we want the original DB error to bubble up
          console.error('[CLOUDINARY ROLLBACK FAILED]:', rollbackErr.message);
        }
      }

      throw error;
    }
  }

  /**
   * Save a Draft Publication
   */
  async saveDraft(userId, data) {
    return await this.createPublication(userId, data, true);
  }

  /**
   * Retrieve Single Publication by SEO Slug and Record Analytics View
   */
  async getPublicationBySlug(slug, clientInfo = {}) {
    // Find regardless of soft-delete status to allow owners to access deleted/draft/private documents
    let publication;
    const mongoose = require('mongoose');
    if (slug && mongoose.Types.ObjectId.isValid(slug)) {
      publication = await Publication.findById(slug).lean();
    }
    if (!publication) {
      publication = await Publication.findOne({ slug }).lean();
    }
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    // Hydrate sub-collections
    const PublicationMetadata = require('../../../models/PublicationMetadata');
    const [authors, files, keywords, researchAreas, metrics, metadata] = await Promise.all([
      PublicationAuthor.find({ publicationId: publication._id }).sort({ order: 1 }).lean(),
      PublicationFile.find({ publicationId: publication._id, isDeleted: { $ne: true } }).lean(),
      PublicationKeyword.find({ publicationId: publication._id }).lean(),
      PublicationResearchArea.find({ publicationId: publication._id }).lean(),
      PublicationMetric.findOne({ publicationId: publication._id }).lean(),
      PublicationMetadata.findOne({ publicationId: publication._id }).lean()
    ]);

    // Visibility / Draft / Soft-delete checks
    const isOwner = clientInfo.userId && publication.userId.toString() === clientInfo.userId.toString();
    const isAdmin = clientInfo.user && clientInfo.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      if (publication.status === 'draft') {
        throw new ForbiddenError('You are not authorized to view this draft publication.');
      }
      if (publication.isDeleted) {
        throw new ForbiddenError('This publication has been soft deleted.');
      }
      if (publication.visibility === 'Private') {
        const isCoAuthor = authors.some(author => author.authorId && author.authorId.toString() === clientInfo.userId?.toString());
        if (!isCoAuthor) {
          throw new ForbiddenError('This publication is private.');
        }
      }
      if (publication.visibility === 'Institution Only') {
        const userInstitution = clientInfo.user?.institution;
        const pubInstitution = publication.institution;
        if (!userInstitution || userInstitution !== pubInstitution) {
          throw new ForbiddenError('This publication is restricted to members of the same institution.');
        }
      }
    }

    // Record view analytics & view event if published (with deduplication window of 15 minutes)
    if (publication.status === 'published' && !publication.isDeleted) {
      try {
        const timeWindow = new Date(Date.now() - 15 * 60 * 1000);
        const queryConditions = {
          publicationId: publication._id,
          createdAt: { $gte: timeWindow }
        };

        if (clientInfo.userId) {
          queryConditions.userId = clientInfo.userId;
        } else if (clientInfo.ip) {
          queryConditions.ipAddress = clientInfo.ip;
        } else {
          queryConditions._id = null;
        }

        const recentView = await PublicationView.findOne(queryConditions);

        if (!recentView) {
          await PublicationMetric.findOneAndUpdate(
            { publicationId: publication._id },
            { $inc: { views: 1 } },
            { upsert: true }
          );

          await Publication.updateOne({ _id: publication._id }, { $inc: { views: 1 } });
          publication.views = (publication.views || 0) + 1;

          await PublicationView.create({
            publicationId: publication._id,
            userId: clientInfo.userId || null,
            ipAddress: clientInfo.ip || '',
            userAgent: clientInfo.userAgent || ''
          });

          await PublicationAnalytic.create({
            publicationId: publication._id,
            userId: clientInfo.userId || null,
            eventType: 'view',
            ipAddress: clientInfo.ip || '',
            userAgent: clientInfo.userAgent || ''
          });
        }
      } catch (analyticsError) {
        console.error('[ANALYTICS LOG VIEW ERROR]:', analyticsError);
      }
    }

    return {
      ...publication,
      authorsList: authors,
      files,
      keywordsList: keywords.map(k => k.keyword),
      researchAreasList: researchAreas.map(r => r.researchArea),
      metrics: metrics || { views: publication.views || 0, downloads: publication.downloads || 0 },
      references: metadata ? metadata.references : [],
      publisher: metadata ? metadata.publisher : publication.publisher,
      abstract: metadata?.abstract || publication.abstract || ''
    };
  }

  /**
   * Retrieve List of Publications with Pagination
   */
  async getPublications(filter = {}, queryOptions = {}) {
    const { page = 1, limit = 10, sort = '-createdAt', search } = queryOptions;
    const skip = (page - 1) * limit;

    const baseFilter = { ...filter };
    if (baseFilter.isDeleted === undefined) {
      baseFilter.isDeleted = { $ne: true };
    }

    // Apply search query
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      baseFilter.$or = [
        { title: searchRegex },
        { doi: searchRegex },
        { authors: searchRegex },
        { journal: searchRegex },
        { conference: searchRegex },
        { publisher: searchRegex },
        { keywords: searchRegex },
        { researchAreas: searchRegex }
      ];
    }

    // Determine sort
    let sortOption = {};
    if (sort === 'newest' || sort === '-createdAt') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'oldest' || sort === 'createdAt') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'most-viewed' || sort === '-views') {
      sortOption = { views: -1 };
    } else if (sort === 'most-downloaded' || sort === '-downloads') {
      sortOption = { downloads: -1 };
    } else if (sort === 'most-cited' || sort === '-citations') {
      sortOption = { citations: -1 };
    } else if (sort === 'alphabetical' || sort === 'title') {
      sortOption = { title: 1 };
    } else {
      sortOption = typeof sort === 'string' ? { [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 } : sort;
    }

    const query = Publication.find(baseFilter)
      .populate('userId', 'firstName lastName fullName email profileImage institution department designation')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const [docs, total] = await Promise.all([
      query,
      Publication.countDocuments(baseFilter)
    ]);

    return {
      docs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update publication
   */
  async updatePublication(id, userId, updateData) {
    const publication = await Publication.findById(id);
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    // Authorization check
    if (publication.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You are not authorized to update this publication.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const isPublishingDraft = publication.status === 'draft' && updateData.status === 'published';

      // Capture previous values of updatable fields for edit history tracking
      const updatableFields = [
        'title', 'subtitle', 'abstract', 'doi', 'isbn', 'issn',
        'journal', 'conference', 'publisher', 'volume', 'issue', 'pages',
        'publicationDate', 'language', 'visibility', 'status', 'publicationType', 'publicationFormat',
        'researchType', 'correspondingAuthor', 'institution', 'department', 'thumbnail',
        'license', 'funding', 'openAccess'
      ];

      const previousValues = {};
      const newValues = {};
      const editedFields = [];

      updatableFields.forEach(field => {
        if (updateData[field] !== undefined && updateData[field] !== publication[field]) {
          previousValues[field] = publication[field];
          newValues[field] = updateData[field];
          editedFields.push(field);
          publication[field] = updateData[field];
        }
      });

      // Special handling of arrays or sub-collections
      if (updateData.keywords && JSON.stringify(updateData.keywords) !== JSON.stringify(publication.keywords)) {
        previousValues.keywords = publication.keywords;
        newValues.keywords = updateData.keywords;
        editedFields.push('keywords');
        publication.keywords = updateData.keywords;
      }
      if (updateData.researchAreas && JSON.stringify(updateData.researchAreas) !== JSON.stringify(publication.researchAreas)) {
        previousValues.researchAreas = publication.researchAreas;
        newValues.researchAreas = updateData.researchAreas;
        editedFields.push('researchAreas');
        publication.researchAreas = updateData.researchAreas;
      }

      if (updateData.title && updateData.title !== publication.title) {
        publication.slug = generateSlug(updateData.title);
      }

      if (updateData.fileDetails && updateData.fileDetails.secure_url) {
        publication.cloudinaryFileUrl = updateData.fileDetails.secure_url;
        publication.pdfURL = updateData.fileDetails.secure_url;
        publication.fileDetails = {
          secure_url: updateData.fileDetails.secure_url || '',
          public_id: updateData.fileDetails.public_id || '',
          resource_type: updateData.fileDetails.resource_type || '',
          bytes: updateData.fileDetails.bytes || 0,
          format: updateData.fileDetails.format || '',
          pages: updateData.fileDetails.pages || 0,
          asset_id: updateData.fileDetails.asset_id || ''
        };
        
        await PublicationFile.deleteMany({ publicationId: id });
        const fileDoc = new PublicationFile({
          publicationId: id,
          secure_url: updateData.fileDetails.secure_url,
          public_id: updateData.fileDetails.public_id,
          resource_type: updateData.fileDetails.resource_type || 'raw',
          bytes: updateData.fileDetails.bytes || 0,
          format: updateData.fileDetails.format || '',
          pages: updateData.fileDetails.pages || 0,
          asset_id: updateData.fileDetails.asset_id || ''
        });
        await fileDoc.save({ session });
      }

      if (updateData.authorsList) {
        publication.authors = updateData.authorsList.map(a => a.name).join(', ');
      }

      if (isPublishingDraft) {
        publication.status = 'published';
        publication.visibility = updateData.visibility || 'Public';
        publication.researchScore = 20 + Math.floor(Math.random() * 10);
      }

      await publication.save({ session });

      // Save sub-collections
      await this._saveSubCollections(id, userId, {
        authorsList: updateData.authorsList,
        keywords: updateData.keywords,
        researchAreas: updateData.researchAreas
      });

      // Save detailed metadata in publicationMetadata collection
      const PublicationMetadata = require('../../../models/PublicationMetadata');
      await PublicationMetadata.findOneAndUpdate(
        { publicationId: id },
        {
          abstract: updateData.abstract !== undefined ? updateData.abstract : publication.abstract,
          references: updateData.references !== undefined ? updateData.references : undefined,
          publisher: updateData.publisher !== undefined ? updateData.publisher : publication.publisher
        },
        { upsert: true, session }
      );

      // Log in PublicationHistory
      const historyDoc = new PublicationHistory({
        publicationId: id,
        userId,
        action: isPublishingDraft ? 'publish' : 'update',
        changes: updateData
      });
      await historyDoc.save({ session });

      // Log in PublicationEdit if any fields were modified manually
      if (editedFields.length > 0) {
        const PublicationEdit = require('../../../models/PublicationEdit');
        const editDoc = new PublicationEdit({
          publicationId: id,
          userId,
          editedFields,
          previousValues,
          newValues
        });
        await editDoc.save({ session });
      }

      // Activity timeline log
      if (isPublishingDraft) {
        const activityDoc = new ActivityLog({
          userId,
          action: 'publication_created',
          referenceId: id,
          referenceModel: 'Publication',
          details: `Published research: "${publication.title}"`
        });
        await activityDoc.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      // Recalculate metrics
      await profileService.calculateAndSaveResearchMetrics(userId);

      return publication;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Delete publication (Soft delete by default, permanent if already soft deleted)
   */
  async deletePublication(id, userId, permanent = false) {
    const publication = await Publication.findById(id);
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    if (publication.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You are not authorized to delete this publication.');
    }

    // Permanent delete if already soft deleted, or if permanent is explicitly requested
    if (publication.isDeleted || permanent) {
      await Publication.deleteOne({ _id: id });
      await PublicationFile.deleteMany({ publicationId: id });
      await PublicationAuthor.deleteMany({ publicationId: id });
      await PublicationKeyword.deleteMany({ publicationId: id });
      await PublicationResearchArea.deleteMany({ publicationId: id });
      await PublicationMetric.deleteMany({ publicationId: id });
      await PublicationAnalytic.deleteMany({ publicationId: id });
      await PublicationView.deleteMany({ publicationId: id });
      await PublicationDownload.deleteMany({ publicationId: id });
      await PublicationBookmark.deleteMany({ publicationId: id });
      await PublicationComment.deleteMany({ publicationId: id });
      await PublicationHistory.deleteMany({ publicationId: id });

      const PublicationMetadata = require('../../../models/PublicationMetadata');
      if (PublicationMetadata) {
        await PublicationMetadata.deleteMany({ publicationId: id });
      }

      const PublicationReader = require('../../../models/PublicationReader');
      if (PublicationReader) {
        await PublicationReader.deleteMany({ publicationId: id });
      }

      const PublicationEdit = require('../../../models/PublicationEdit');
      if (PublicationEdit) {
        await PublicationEdit.deleteMany({ publicationId: id });
      }
    } else {
      // Soft Delete only
      publication.isDeleted = true;
      publication.deletedAt = new Date();
      publication.deletedBy = userId;
      await publication.save();

      // Log in history
      await PublicationHistory.create({
        publicationId: id,
        userId,
        action: 'delete',
        changes: { isDeleted: true }
      });
    }

    // Recalculate metrics
    await profileService.calculateAndSaveResearchMetrics(userId);

    return publication;
  }

  /**
   * Restore publication
   */
  async restorePublication(id, userId) {
    const publication = await Publication.findById(id);
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    if (publication.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You are not authorized to restore this publication.');
    }

    publication.isDeleted = false;
    publication.deletedAt = undefined;
    publication.deletedBy = undefined;
    await publication.save();

    // Log restore action
    await PublicationHistory.create({
      publicationId: id,
      userId,
      action: 'restore',
      changes: { isDeleted: false }
    });

    // Recalculate metrics
    await profileService.calculateAndSaveResearchMetrics(userId);

    return publication;
  }

  /**
   * Increment file download analytic and metric
   */
  async trackDownload(id, clientInfo = {}) {
    const publication = await Publication.findById(id).lean();
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    await PublicationMetric.findOneAndUpdate(
      { publicationId: id },
      { $inc: { downloads: 1 } },
      { upsert: true }
    );

    await Publication.updateOne({ _id: id }, { $inc: { downloads: 1 } });
    publication.downloads = (publication.downloads || 0) + 1;

    await PublicationDownload.create({
      publicationId: id,
      userId: clientInfo.userId || null,
      ipAddress: clientInfo.ip || '',
      userAgent: clientInfo.userAgent || ''
    });

    await PublicationAnalytic.create({
      publicationId: id,
      userId: clientInfo.userId || null,
      eventType: 'download',
      ipAddress: clientInfo.ip || '',
      userAgent: clientInfo.userAgent || ''
    });

    // Also recalculate profile download count in background
    try {
      await profileService.calculateAndSaveResearchMetrics(publication.userId);
    } catch (metricsError) {
      console.error('[DOWNLOAD METRICS RECALCULATION ERROR]:', metricsError);
    }

    return { downloads: publication.downloads };
  }

  /**
   * Retrieve publications for a researcher by their profileSlug
   */
  async getPublicationsByProfileSlug(profileSlug, queryOptions = {}) {
    const User = require('../../../models/User');
    const user = await User.findOne({ profileSlug, isDeleted: { $ne: true } });
    if (!user) {
      throw new NotFoundError('Researcher profile not found.');
    }

    const filter = { userId: user._id, status: 'published', isDeleted: { $ne: true } };
    return await this.getPublications(filter, queryOptions);
  }

  /**
   * Aggregates 9 key metrics for a researcher's publications dashboard
   */
  async getPublicationStats(userId) {
    const counts = await Publication.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          drafts: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          privateCount: {
            $sum: { $cond: [{ $eq: ['$visibility', 'Private'] }, 1, 0] }
          },
          publicCount: {
            $sum: { $cond: [{ $eq: ['$visibility', 'Public'] }, 1, 0] }
          },
          views: { $sum: { $ifNull: ['$views', 0] } },
          downloads: { $sum: { $ifNull: ['$downloads', 0] } },
          citations: { $sum: { $ifNull: ['$citations', 0] } }
        }
      }
    ]);

    const bookmarksCount = await PublicationBookmark.countDocuments({ userId });

    const stats = counts[0] || {
      total: 0,
      published: 0,
      drafts: 0,
      privateCount: 0,
      publicCount: 0,
      views: 0,
      downloads: 0,
      citations: 0
    };

    return {
      totalPublications: stats.total || 0,
      published: stats.published || 0,
      drafts: stats.drafts || 0,
      private: stats.privateCount || 0,
      public: stats.publicCount || 0,
      views: stats.views || 0,
      downloads: stats.downloads || 0,
      bookmarks: bookmarksCount,
      citations: stats.citations || 0
    };
  }

  /**
   * Duplicates a publication and its related details, saving as a Draft
   */
  async duplicatePublication(id, userId) {
    const publication = await Publication.findById(id).lean();
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }
    if (publication.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You are not authorized to duplicate this publication.');
    }

    const { _id, createdAt, updatedAt, slug, publicationCode, doi, googleScholarPublicationId, citationId, views, downloads, citations, ...rest } = publication;

    const newTitle = `${publication.title} (Copy)`;
    const newSlug = generateSlug(newTitle);

    const duplicated = new Publication({
      ...rest,
      title: newTitle,
      slug: newSlug,
      status: 'draft',
      visibility: 'Draft',
      userId,
      ownerId: userId,
      views: 0,
      downloads: 0,
      citations: 0,
      researchScore: 0
    });

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await duplicated.save({ session });

      const [authors, keywords, researchAreas, metadata] = await Promise.all([
        PublicationAuthor.find({ publicationId: id }).lean(),
        PublicationKeyword.find({ publicationId: id }).lean(),
        PublicationResearchArea.find({ publicationId: id }).lean(),
        mongoose.model('PublicationMetadata').findOne({ publicationId: id }).lean()
      ]);

      if (authors.length > 0) {
        const duplicatedAuthors = authors.map(({ _id, createdAt, updatedAt, publicationId, ...author }) => ({
          ...author,
          publicationId: duplicated._id
        }));
        await PublicationAuthor.insertMany(duplicatedAuthors, { session });
      }

      if (keywords.length > 0) {
        const duplicatedKeywords = keywords.map(({ _id, createdAt, updatedAt, publicationId, ...kw }) => ({
          ...kw,
          publicationId: duplicated._id
        }));
        await PublicationKeyword.insertMany(duplicatedKeywords, { session });
      }

      if (researchAreas.length > 0) {
        const duplicatedAreas = researchAreas.map(({ _id, createdAt, updatedAt, publicationId, ...area }) => ({
          ...area,
          publicationId: duplicated._id
        }));
        await PublicationResearchArea.insertMany(duplicatedAreas, { session });
      }

      if (metadata) {
        const PublicationMetadata = mongoose.model('PublicationMetadata');
        const duplicatedMetadata = new PublicationMetadata({
          publicationId: duplicated._id,
          abstract: metadata.abstract || '',
          references: metadata.references || [],
          publisher: metadata.publisher || ''
        });
        await duplicatedMetadata.save({ session });
      }

      const metricDoc = new PublicationMetric({
        publicationId: duplicated._id,
        views: 0,
        downloads: 0,
        citations: 0,
        shares: 0,
        bookmarks: 0,
        comments: 0
      });
      await metricDoc.save({ session });

      const historyDoc = new PublicationHistory({
        publicationId: duplicated._id,
        userId,
        action: 'draft_save',
        changes: { duplicatedFrom: id }
      });
      await historyDoc.save({ session });

      await session.commitTransaction();
      session.endSession();

      try {
        await profileService.calculateAndSaveResearchMetrics(userId);
      } catch (metricsError) {
        console.error('[METRICS RECALCULATION ERROR]:', metricsError);
      }

      return duplicated;
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }

  /**
   * Toggles a user's bookmark for a publication
   */
  async toggleBookmark(userId, publicationId, folderName = 'General') {
    const existing = await PublicationBookmark.findOne({ userId, publicationId });

    if (existing) {
      await PublicationBookmark.deleteOne({ userId, publicationId });
      await PublicationMetric.findOneAndUpdate(
        { publicationId },
        { $inc: { bookmarks: -1 } }
      );
      return { bookmarked: false };
    } else {
      const bookmark = new PublicationBookmark({
        userId,
        publicationId,
        folder: folderName
      });
      await bookmark.save();
      await PublicationMetric.findOneAndUpdate(
        { publicationId },
        { $inc: { bookmarks: 1 } },
        { upsert: true }
      );

      // Send Real-Time Notification to publication owner
      const publication = await Publication.findById(publicationId);
      if (publication && publication.userId.toString() !== userId.toString()) {
        try {
          const User = require('../../../models/User');
          const notificationService = require('../../notifications/service/notification.service');
          const actorUser = await User.findById(userId).select('firstName lastName').lean();
          const actorName = actorUser ? `${actorUser.firstName} ${actorUser.lastName}` : 'A researcher';
          
          await notificationService.createNotification({
            recipientId: publication.userId,
            actorId: userId,
            type: 'publication_bookmarked',
            title: 'Publication Bookmarked',
            message: `${actorName} bookmarked your publication: "${publication.title}"`,
            targetType: 'Publication',
            targetId: publicationId,
            targetUrl: `/publication/${publication.slug}`
          }).catch(err => console.error(`Failed to create bookmark notification: ${err.message}`));
        } catch (err) {
          console.error('Bookmark notification error:', err);
        }
      }

      return { bookmarked: true, folderName };
    }
  }

  /**
   * Executes batch operations on selected publications
   */
  async bulkAction(userId, { action, ids, visibility }) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('No publication IDs provided.');
    }

    const publications = await Publication.find({ _id: { $in: ids } });
    const nonOwned = publications.filter(p => p.userId.toString() !== userId.toString());
    if (nonOwned.length > 0) {
      throw new ForbiddenError('You do not own all of the selected publications.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (action === 'delete') {
        // Soft delete all
        await Publication.updateMany(
          { _id: { $in: ids } },
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } },
          { session }
        );
        const historyDocs = ids.map(id => ({
          publicationId: id,
          userId,
          action: 'delete',
          changes: { isDeleted: true }
        }));
        await PublicationHistory.insertMany(historyDocs, { session });
      } else if (action === 'restore') {
        await Publication.updateMany(
          { _id: { $in: ids } },
          { $set: { isDeleted: false, deletedAt: undefined, deletedBy: undefined } },
          { session }
        );
        const historyDocs = ids.map(id => ({
          publicationId: id,
          userId,
          action: 'restore',
          changes: { isDeleted: false }
        }));
        await PublicationHistory.insertMany(historyDocs, { session });
      } else if (action === 'permanent-delete') {
        await Publication.deleteMany({ _id: { $in: ids } }, { session });
        await PublicationFile.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationAuthor.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationKeyword.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationResearchArea.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationMetric.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationAnalytic.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationView.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationDownload.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationBookmark.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationComment.deleteMany({ publicationId: { $in: ids } }, { session });
        await PublicationHistory.deleteMany({ publicationId: { $in: ids } }, { session });

        const PublicationMetadata = require('../../../models/PublicationMetadata');
        await PublicationMetadata.deleteMany({ publicationId: { $in: ids } }, { session });

        const PublicationReader = require('../../../models/PublicationReader');
        await PublicationReader.deleteMany({ publicationId: { $in: ids } }, { session });

        const PublicationEdit = require('../../../models/PublicationEdit');
        if (PublicationEdit) {
          await PublicationEdit.deleteMany({ publicationId: { $in: ids } }, { session });
        }
      } else if (action === 'publish') {
        await Publication.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'published', visibility: 'Public' } },
          { session }
        );
        const historyDocs = ids.map(id => ({
          publicationId: id,
          userId,
          action: 'publish',
          changes: { status: 'published', visibility: 'Public' }
        }));
        await PublicationHistory.insertMany(historyDocs, { session });
      } else if (action === 'move-draft') {
        await Publication.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'draft', visibility: 'Draft' } },
          { session }
        );
        const historyDocs = ids.map(id => ({
          publicationId: id,
          userId,
          action: 'draft_save',
          changes: { status: 'draft', visibility: 'Draft' }
        }));
        await PublicationHistory.insertMany(historyDocs, { session });
      } else if (action === 'update-visibility') {
        if (!visibility || !['Draft', 'Private', 'Institution Only', 'Public'].includes(visibility)) {
          throw new ValidationError('Invalid visibility option.');
        }
        await Publication.updateMany(
          { _id: { $in: ids } },
          { $set: { visibility } },
          { session }
        );
        const historyDocs = ids.map(id => ({
          publicationId: id,
          userId,
          action: 'update',
          changes: { visibility }
        }));
        await PublicationHistory.insertMany(historyDocs, { session });
      }
      await session.commitTransaction();
      session.endSession();

      await profileService.calculateAndSaveResearchMetrics(userId);
      return { success: true, count: ids.length };
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }

  /**
   * Track view with deduplication (for POST /api/v1/publications/:id/view)
   */
  async trackView(id, clientInfo = {}) {
    const publication = await Publication.findById(id);
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    const timeWindow = new Date(Date.now() - 15 * 60 * 1000);
    const queryConditions = {
      publicationId: id,
      createdAt: { $gte: timeWindow }
    };

    if (clientInfo.userId) {
      queryConditions.userId = clientInfo.userId;
    } else if (clientInfo.ip) {
      queryConditions.ipAddress = clientInfo.ip;
    } else {
      queryConditions._id = null;
    }

    const recentView = await PublicationView.findOne(queryConditions);
    let incremented = false;

    if (!recentView) {
      await PublicationMetric.findOneAndUpdate(
        { publicationId: id },
        { $inc: { views: 1 } },
        { upsert: true }
      );
      await Publication.updateOne({ _id: id }, { $inc: { views: 1 } });
      
      await PublicationView.create({
        publicationId: id,
        userId: clientInfo.userId || null,
        ipAddress: clientInfo.ip || '',
        userAgent: clientInfo.userAgent || ''
      });

      await PublicationAnalytic.create({
        publicationId: id,
        userId: clientInfo.userId || null,
        eventType: 'view',
        ipAddress: clientInfo.ip || '',
        userAgent: clientInfo.userAgent || ''
      });
      
      incremented = true;
    }

    const metric = await PublicationMetric.findOne({ publicationId: id }).lean();
    return { 
      views: metric?.views || 0,
      incremented
    };
  }

  /**
   * Toggle recommendation
   */
  async toggleRecommendation(userId, publicationId) {
    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    const Recommendation = require('../../../models/Recommendation');
    const existing = await Recommendation.findOne({ userId, publicationId });

    if (existing) {
      await Recommendation.deleteOne({ userId, publicationId });
      await PublicationMetric.findOneAndUpdate(
        { publicationId },
        { $inc: { recommendations: -1 } },
        { upsert: true }
      );
      await Publication.updateOne({ _id: publicationId }, { $inc: { recommendations: -1 } });
      
      return { recommended: false };
    } else {
      const rec = new Recommendation({ userId, publicationId });
      await rec.save();
      await PublicationMetric.findOneAndUpdate(
        { publicationId },
        { $inc: { recommendations: 1 } },
        { upsert: true }
      );
      await Publication.updateOne({ _id: publicationId }, { $inc: { recommendations: 1 } });
      
      return { recommended: true };
    }
  }

  /**
   * Track sharing event
   */
  async trackShare(userId, publicationId, platform = 'internal') {
    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    const Share = require('../../../models/Share');
    const share = new Share({ userId, publicationId, platform });
    await share.save();

    await PublicationMetric.findOneAndUpdate(
      { publicationId },
      { $inc: { shares: 1 } },
      { upsert: true }
    );

    const metric = await PublicationMetric.findOne({ publicationId }).lean();
    return { shares: metric?.shares || 0 };
  }

  /**
   * Get related publications
   */
  async getRelatedPublications(publicationId, limit = 5) {
    const publication = await Publication.findById(publicationId).lean();
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    const keywords = publication.keywords || [];
    const researchAreas = publication.researchAreas || [];

    const query = {
      _id: { $ne: publicationId },
      status: 'published',
      visibility: 'Public',
      isDeleted: { $ne: true }
    };

    if (keywords.length > 0 || researchAreas.length > 0) {
      query.$or = [
        { keywords: { $in: keywords } },
        { researchAreas: { $in: researchAreas } }
      ];
    }

    return await Publication.find(query)
      .sort({ citations: -1, views: -1 })
      .limit(Number(limit))
      .lean();
  }

  /**
   * Get related researchers
   */
  async getRelatedResearchers(publicationId, limit = 5) {
    const publication = await Publication.findById(publicationId).lean();
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    const User = require('../../../models/User');
    const Profile = require('../../../models/Profile');

    const query = {
      userId: { $ne: publication.userId },
      isDeleted: { $ne: true }
    };

    if (publication.institution) {
      query.institution = publication.institution;
    }

    let profiles = await Profile.find(query)
      .populate('userId', 'firstName lastName fullName email profileImage institution department designation profileSlug username')
      .limit(Number(limit))
      .lean();

    if (profiles.length < limit) {
      const remainingLimit = limit - profiles.length;
      const existingUserIds = profiles.map(p => p.userId?._id?.toString() || p.userId?.toString());
      existingUserIds.push(publication.userId.toString());

      const fallbackQuery = {
        userId: { $nin: existingUserIds },
        isDeleted: { $ne: true }
      };

      const fallbackProfiles = await Profile.find(fallbackQuery)
        .populate('userId', 'firstName lastName fullName email profileImage institution department designation profileSlug username')
        .limit(remainingLimit)
        .lean();

      profiles = [...profiles, ...fallbackProfiles];
    }

    return profiles;
  }

  /**
   * Add a comment or reply to a publication
   */
  async addComment(userId, publicationId, content, parentId = null) {
    if (!content || !content.trim()) {
      throw new ValidationError('Comment content cannot be empty.');
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new NotFoundError('Publication not found.');
    }

    if (parentId) {
      const parent = await PublicationComment.findById(parentId);
      if (!parent) {
        throw new NotFoundError('Parent comment not found.');
      }
    }

    const comment = new PublicationComment({
      userId,
      publicationId,
      content: content.trim(),
      parentId
    });

    await comment.save();

    // Increment comment metrics count
    await PublicationMetric.findOneAndUpdate(
      { publicationId },
      { $inc: { comments: 1 } },
      { upsert: true }
    );
    await Publication.updateOne({ _id: publicationId }, { $inc: { comments: 1 } });

    // Populate user details for returning comment
    const populated = await PublicationComment.findById(comment._id)
      .populate('userId', 'firstName lastName fullName email profileImage institution department designation profileSlug username')
      .lean();

    // Send Real-Time Notification to publication owner
    if (publication.userId.toString() !== userId.toString()) {
      try {
        const User = require('../../../models/User');
        const notificationService = require('../../notifications/service/notification.service');
        const actorUser = await User.findById(userId).select('firstName lastName').lean();
        const actorName = actorUser ? `${actorUser.firstName} ${actorUser.lastName}` : 'A researcher';
        
        await notificationService.createNotification({
          recipientId: publication.userId,
          actorId: userId,
          type: 'publication_commented',
          title: 'New Comment on Publication',
          message: `${actorName} commented on your publication: "${publication.title}"`,
          targetType: 'Comment',
          targetId: comment._id,
          targetUrl: `/publication/${publication.slug}`
        }).catch(err => console.error(`Failed to create comment notification: ${err.message}`));
      } catch (err) {
        console.error('Comment notification error:', err);
      }
    }

    // Parse and handle @username mentions in comments
    const mentionRegex = /@([a-zA-Z0-9_\-]+)/g;
    let match;
    const mentionedUsernames = [];
    while ((match = mentionRegex.exec(content.trim())) !== null) {
      mentionedUsernames.push(match[1]);
    }

    if (mentionedUsernames.length > 0) {
      try {
        const User = require('../../../models/User');
        const notificationService = require('../../notifications/service/notification.service');
        const actorUser = await User.findById(userId).select('firstName lastName').lean();
        const actorName = actorUser ? `${actorUser.firstName} ${actorUser.lastName}` : 'A researcher';
        
        // Find users with matching usernames
        const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } }).select('_id').lean();
        
        mentionedUsers.forEach(async (mu) => {
          if (mu._id.toString() !== userId.toString()) { // Don't notify self-mentions
            await notificationService.createNotification({
              recipientId: mu._id,
              actorId: userId,
              type: 'mention',
              title: 'You were mentioned',
              message: `${actorName} mentioned you in a comment on "${publication.title}"`,
              targetType: 'Comment',
              targetId: comment._id,
              targetUrl: `/publication/${publication.slug}`
            }).catch(err => console.error(`Failed to create mention notification: ${err.message}`));
          }
        });
      } catch (err) {
        console.error('Mention parsing/notification error:', err);
      }
    }

    return populated;
  }

  /**
   * Get all comments for a publication in a threaded tree format
   */
  async getComments(publicationId) {
    const rawComments = await PublicationComment.find({ publicationId })
      .populate('userId', 'firstName lastName fullName email profileImage institution department designation profileSlug username')
      .sort({ createdAt: 1 })
      .lean();

    // Build comment map
    const commentMap = {};
    const rootComments = [];

    rawComments.forEach(comment => {
      comment.replies = [];
      commentMap[comment._id.toString()] = comment;
    });

    rawComments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap[comment.parentId.toString()];
        if (parent) {
          parent.replies.push(comment);
        } else {
          // If parent not found, render as root
          rootComments.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  }

  /**
   * Edit a comment
   */
  async editComment(userId, commentId, content) {
    if (!content || !content.trim()) {
      throw new ValidationError('Comment content cannot be empty.');
    }

    const comment = await PublicationComment.findById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment not found.');
    }

    if (comment.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You are not authorized to edit this comment.');
    }

    comment.content = content.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    return await PublicationComment.findById(commentId)
      .populate('userId', 'firstName lastName fullName email profileImage institution department designation profileSlug username')
      .lean();
  }

  /**
   * Delete a comment (and recursively delete children if necessary)
   */
  async deleteComment(userId, commentId) {
    const comment = await PublicationComment.findById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment not found.');
    }

    if (comment.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You are not authorized to delete this comment.');
    }

    const publicationId = comment.publicationId;

    // Find and delete replies
    const findRepliesRecursive = async (pid) => {
      const children = await PublicationComment.find({ parentId: pid }).lean();
      const ids = [pid];
      for (const child of children) {
        const childIds = await findRepliesRecursive(child._id);
        ids.push(...childIds);
      }
      return ids;
    };

    const idsToDelete = await findRepliesRecursive(commentId);
    const deleteCount = idsToDelete.length;

    await PublicationComment.deleteMany({ _id: { $in: idsToDelete } });

    // Decrement comments count in publication metrics
    await PublicationMetric.findOneAndUpdate(
      { publicationId },
      { $inc: { comments: -deleteCount } },
      { upsert: true }
    );
    await Publication.updateOne({ _id: publicationId }, { $inc: { comments: -deleteCount } });

    return { success: true, deletedCount: deleteCount };
  }

  /**
   * Toggle comment like
   */
  async toggleLikeComment(userId, commentId) {
    const comment = await PublicationComment.findById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment not found.');
    }

    if (!comment.likes) {
      comment.likes = [];
    }

    const index = comment.likes.indexOf(userId);
    let liked = false;

    if (index > -1) {
      comment.likes.splice(index, 1);
    } else {
      comment.likes.push(userId);
      liked = true;
    }

    await comment.save();
    return { liked, likeCount: comment.likes.length };
  }
}

module.exports = new PublicationService();
