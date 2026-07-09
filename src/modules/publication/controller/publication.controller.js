const publicationService = require('../service/publication.service');
const cloudinaryService = require('../service/cloudinary.service');
const publicationDTO = require('../dto/publication.dto');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');
const { ValidationError } = require('../../../common/errors/AppError');
const { validatePDFBuffer, inspectPDF, hasPDFSignature } = require('../helper/pdfValidator.util');
const { generatePublicationId } = require('../helper/publicationId.util');

// Helper to extract IP, User and User-Agent
const getClientInfo = (req) => {
  return {
    userId: req.user ? req.user._id : null,
    user: req.user || null,
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || ''
  };
};

class PublicationController {
  // Publish Research
  createPublication = asyncHandler(async (req, res) => {
    const pub = await publicationService.createPublication(req.user._id, req.body, false);
    return res.success(
      'Research published successfully.',
      publicationDTO.formatPublication(pub),
      201
    );
  });

  // Save Draft
  saveDraft = asyncHandler(async (req, res) => {
    const pub = await publicationService.createPublication(req.user._id, req.body, true);
    return res.success(
      'Draft saved successfully.',
      publicationDTO.formatPublication(pub),
      201
    );
  });

  // Upload File to Cloudinary
  // publicationId is generated HERE (before upload) so Cloudinary path is unique.
  // This publicationId is returned to the client who passes it when creating the publication record.
  uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('No file was uploaded.');
    }

    const mimeType = req.file.mimetype || '';
    const isPDF = mimeType === 'application/pdf' || req.file.originalname?.toLowerCase().endsWith('.pdf');

    // Validate PDF structure (using fixed pdf-parse API)
    if (isPDF) {
      await validatePDFBuffer(req.file.buffer, req.file.originalname);
    }

    const uploadService = require('../../upload/service/upload.service');
    const result = await uploadService.uploadFile({
      file: req.file,
      userId: req.user._id,
      purpose: 'publication-pdf'
    });

    return res.success('File uploaded to Cloudinary successfully.', {
      publicationId: result.resourceId,
      secure_url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id,
      resource_type: result.resource_type,
      bytes: result.bytes,
      format: result.format,
      pages: result.pages || 0,
      folder: result.folder
    });
  });

  // List Publications (supports filters: userId, status, visibility, etc.)
  // List Publications (supports filters: userId, status, visibility, etc.)
  getPublications = asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt', 
      userId, 
      status = 'published', 
      visibility = 'Public',
      search,
      publicationType,
      year,
      journal,
      conference,
      publisher,
      researchArea,
      source
    } = req.query;
    
    const filter = { isDeleted: { $ne: true } };
    if (userId) filter.userId = userId;
    filter.status = status;
    filter.visibility = visibility;

    if (publicationType && publicationType !== 'all') {
      filter.publicationType = publicationType;
    }
    if (year && year !== 'all') {
      filter.year = Number(year);
    }
    if (journal && journal !== 'all') {
      filter.journal = new RegExp(journal, 'i');
    }
    if (conference && conference !== 'all') {
      filter.conference = new RegExp(conference, 'i');
    }
    if (publisher && publisher !== 'all') {
      filter.publisher = new RegExp(publisher, 'i');
    }
    if (researchArea && researchArea !== 'all') {
      filter.researchAreas = new RegExp(researchArea, 'i');
    }

    if (source === 'scholar') {
      filter.googleScholarPublicationId = { $exists: true, $ne: null, $ne: '' };
    } else if (source === 'manual') {
      filter.$or = [
        { googleScholarPublicationId: { $exists: false } },
        { googleScholarPublicationId: null },
        { googleScholarPublicationId: '' }
      ];
    }

    const result = await publicationService.getPublications(filter, { page, limit, sort, search });
    
    return res.success('Publications retrieved successfully.', {
      docs: publicationDTO.formatPublicationList(result.docs),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
  });

  // Get publications by profileSlug
  getPublicationsByProfileSlug = asyncHandler(async (req, res) => {
    const { profileSlug } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt',
      search,
      publicationType,
      year,
      journal,
      conference,
      publisher,
      researchArea,
      source
    } = req.query;

    const User = require('../../../models/User');
    const user = await User.findOne({ profileSlug, isDeleted: { $ne: true } });
    if (!user) {
      throw new ValidationError('Profile not found.');
    }

    const isOwner = req.user && req.user._id.toString() === user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    const filter = { userId: user._id };

    if (!isOwner && !isAdmin) {
      filter.status = 'published';
      filter.visibility = 'Public';
      filter.isDeleted = { $ne: true };
    } else {
      if (req.query.status) filter.status = req.query.status;
      if (req.query.visibility) filter.visibility = req.query.visibility;
      if (req.query.trash === 'true') {
        filter.isDeleted = true;
      } else {
        filter.isDeleted = { $ne: true };
      }
    }

    if (publicationType && publicationType !== 'all') {
      filter.publicationType = publicationType;
    }
    if (year && year !== 'all') {
      filter.year = Number(year);
    }
    if (journal && journal !== 'all') {
      filter.journal = new RegExp(journal, 'i');
    }
    if (conference && conference !== 'all') {
      filter.conference = new RegExp(conference, 'i');
    }
    if (publisher && publisher !== 'all') {
      filter.publisher = new RegExp(publisher, 'i');
    }
    if (researchArea && researchArea !== 'all') {
      filter.researchAreas = new RegExp(researchArea, 'i');
    }

    if (source === 'scholar') {
      filter.googleScholarPublicationId = { $exists: true, $ne: null, $ne: '' };
    } else if (source === 'manual') {
      filter.$or = [
        { googleScholarPublicationId: { $exists: false } },
        { googleScholarPublicationId: null },
        { googleScholarPublicationId: '' }
      ];
    }

    const result = await publicationService.getPublications(filter, { page, limit, sort, search });

    let stats = null;
    if (isOwner) {
      stats = await publicationService.getPublicationStats(user._id);
    }

    return res.success('Publications retrieved successfully.', {
      docs: publicationDTO.formatPublicationList(result.docs),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      stats
    });
  });

  // Get My Publications (with trash, drafts, bookmarks, stats)
  getMyPublications = asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt', 
      status, 
      visibility, 
      trash,
      search,
      publicationType,
      year,
      journal,
      conference,
      publisher,
      researchArea,
      source
    } = req.query;

    const filter = { userId: req.user._id };
    
    if (trash === 'true' || status === 'trash') {
      filter.isDeleted = true;
    } else {
      filter.isDeleted = { $ne: true };
    }

    if (status && status !== 'all' && status !== 'trash' && status !== 'bookmarks') {
      filter.status = status;
    }

    if (visibility && visibility !== 'all') {
      filter.visibility = visibility;
    }

    if (publicationType && publicationType !== 'all') {
      filter.publicationType = publicationType;
    }

    if (year && year !== 'all') {
      filter.year = Number(year);
    }

    if (journal && journal !== 'all') {
      filter.journal = new RegExp(journal, 'i');
    }

    if (conference && conference !== 'all') {
      filter.conference = new RegExp(conference, 'i');
    }

    if (publisher && publisher !== 'all') {
      filter.publisher = new RegExp(publisher, 'i');
    }

    if (researchArea && researchArea !== 'all') {
      filter.researchAreas = new RegExp(researchArea, 'i');
    }

    if (source === 'scholar') {
      filter.googleScholarPublicationId = { $exists: true, $ne: null, $ne: '' };
    } else if (source === 'manual') {
      filter.$or = [
        { googleScholarPublicationId: { $exists: false } },
        { googleScholarPublicationId: null },
        { googleScholarPublicationId: '' }
      ];
    }

    if (status === 'bookmarks') {
      const PublicationBookmark = require('../../../models/PublicationBookmark');
      const bookmarks = await PublicationBookmark.find({ userId: req.user._id }).lean();
      const bookmarkedIds = bookmarks.map(b => b.publicationId);
      filter._id = { $in: bookmarkedIds };
    }

    const stats = await publicationService.getPublicationStats(req.user._id);

    const result = await publicationService.getPublications(filter, { page, limit, sort, search });

    return res.success('My publications retrieved successfully.', {
      docs: publicationDTO.formatPublicationList(result.docs),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      stats
    });
  });

  // Extract Metadata from PDF/DOCX/DOC/RTF/TXT Upload and cache in MongoDB
  extractMetadata = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError('No file was uploaded.');
    }

    const mimeType = req.file.mimetype || '';
    const isPDF = mimeType === 'application/pdf' || req.file.originalname?.toLowerCase().endsWith('.pdf');

    // Only validate structure for PDFs
    if (isPDF) {
      await validatePDFBuffer(req.file.buffer, req.file.originalname);
    }

    const metadataService = require('../service/metadataExtraction.service');
    const result = await metadataService.extractMetadata(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Cache the raw text and extraction metadata in publicationMetadata collection
    const PublicationMetadata = require('../../../models/PublicationMetadata');
    const cacheDoc = new PublicationMetadata({
      isOrphan: true,
      originalFileName: req.file.originalname || '',
      mimeType: req.file.mimetype || '',
      fileSizeBytes: req.file.buffer?.length || 0,
      extractionMethod: result.methodUsed || 'none',
      extractionDurationMs: result.extractionDurationMs || 0,
      rawText: req.file.buffer.toString('utf8').substring(0, 50000), // Larger limit (50KB)
      extractedMetadata: result,
      confidenceScores: result.confidenceScores || {},
      
      // Map extracted values flat
      title: result.title?.value || '',
      subtitle: result.subtitle?.value || '',
      abstract: result.abstract?.value || '',
      references: result.references?.value || [],
      publisher: result.publisher?.value || '',
      journal: result.journal?.value || '',
      conference: result.conference?.value || '',
      doi: result.doi?.value || '',
      isbn: result.isbn?.value || '',
      issn: result.issn?.value || '',
      language: result.language?.value || 'English',
      year: result.year?.value || null,
      pages: result.pages?.value || '',
      volume: result.volume?.value || '',
      issue: result.issue?.value || '',
      funding: result.funding?.value || '',
      license: result.license?.value || '',
      copyright: result.copyright?.value || '',
      emails: result.emails?.value || [],
      orcids: result.orcids?.value || []
    });
    await cacheDoc.save();

    return res.success('Metadata extracted successfully.', {
      cacheId: cacheDoc._id,
      extractedMetadata: result
    });
  });

  // Get cached metadata by ID
  getMetadataCache = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const PublicationMetadata = require('../../../models/PublicationMetadata');
    const cacheDoc = await PublicationMetadata.findById(id);
    if (!cacheDoc) {
      throw new NotFoundError('Cached metadata not found.');
    }
    return res.success('Cached metadata retrieved successfully.', cacheDoc);
  });

  // Get single publication by slug
  getPublicationBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const clientInfo = getClientInfo(req);
    
    const pub = await publicationService.getPublicationBySlug(slug, clientInfo);
    
    return res.success(
      'Publication details retrieved successfully.',
      publicationDTO.formatPublication(pub)
    );
  });

  // Get publication for reader and track analytics progress
  getPublicationForReader = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const clientInfo = getClientInfo(req);

    const pub = await publicationService.getPublicationBySlug(slug, clientInfo);

    // Track reader event in background
    try {
      const PublicationReader = require('../../../models/PublicationReader');
      if (PublicationReader && req.user) {
        await PublicationReader.findOneAndUpdate(
          { publicationId: pub.id || pub._id, userId: req.user._id },
          { lastReadAt: new Date() },
          { upsert: true, new: true }
        );
      }
    } catch (e) {
      // Ignore background tracking errors
    }

    return res.success(
      'Publication details retrieved for reader successfully.',
      publicationDTO.formatPublication(pub)
    );
  });

  // Update publication
  updatePublication = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pub = await publicationService.updatePublication(id, req.user._id, req.body);
    
    return res.success(
      'Publication updated successfully.',
      publicationDTO.formatPublication(pub)
    );
  });

  // Delete publication
  deletePublication = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await publicationService.deletePublication(id, req.user._id);
    
    return res.success('Publication deleted successfully.');
  });

  // Restore soft deleted publication
  restorePublication = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pub = await publicationService.restorePublication(id, req.user._id);

    return res.success(
      'Publication restored successfully.',
      publicationDTO.formatPublication(pub)
    );
  });

  // Track download of file
  trackDownload = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const clientInfo = getClientInfo(req);
    
    const result = await publicationService.trackDownload(id, clientInfo);
    
    return res.success('Download tracked successfully.', result);
  });

  // Get all publication types
  getTypes = asyncHandler(async (req, res) => {
    const types = {
      primary: [
        { name: 'Publish Research', slug: 'article', description: 'Publish a journal article, review, or letter.' },
        { name: 'Conference Paper', slug: 'conference-paper', description: 'Paper presented at a conference or proceeding.' },
        { name: 'Preprint', slug: 'preprint', description: 'Draft of paper shared before formal peer review.' },
        { name: 'Patent', slug: 'patent', description: 'Official patent publication or design application.' }
      ],
      more: [
        { name: 'Presentation', slug: 'presentation' },
        { name: 'Poster', slug: 'poster' },
        { name: 'Dataset', slug: 'dataset' },
        { name: 'Method', slug: 'method' },
        { name: 'Proposal', slug: 'proposal' },
        { name: 'Technical Report', slug: 'technical-report' },
        { name: 'Book', slug: 'book' },
        { name: 'Book Chapter', slug: 'book-chapter' },
        { name: 'Thesis', slug: 'thesis' },
        { name: 'White Paper', slug: 'white-paper' }
      ]
    };
    return res.success('Publication types retrieved successfully.', types);
  });

  // Get all publication formats
  getFormats = asyncHandler(async (req, res) => {
    const formats = {
      primary: [
        { name: 'Article', slug: 'article', description: 'Journal paper or research article.' },
        { name: 'Book', slug: 'book', description: 'Complete published monograph or volume.' },
        { name: 'Book Chapter', slug: 'book-chapter', description: 'Part of a compiled book publication.' },
        { name: 'Conference Paper', slug: 'conference-paper', description: 'Proceeding or meeting abstract.' },
        { name: 'Patent', slug: 'patent', description: 'Registered utility patent or application.' },
        { name: 'Preprint', slug: 'preprint', description: 'Early-stage paper shared before review.' }
      ],
      more: [
        { name: 'Presentation', slug: 'presentation' },
        { name: 'Poster', slug: 'poster' },
        { name: 'Dataset', slug: 'dataset' },
        { name: 'Method', slug: 'method' },
        { name: 'Proposal', slug: 'proposal' },
        { name: 'Technical Report', slug: 'technical-report' },
        { name: 'White Paper', slug: 'white-paper' },
        { name: 'Thesis', slug: 'thesis' }
      ]
    };
    return res.success('Publication formats retrieved successfully.', formats);
  });

  // Retrieve publications by unique profile username
  getPublicationsByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt',
      search,
      publicationType,
      status,
      visibility,
      year,
      journal,
      conference,
      publisher,
      researchArea,
      source
    } = req.query;

    const User = require('../../../models/User');
    // Try resolving by username first, fallback to profileSlug
    let user = await User.findOne({ username, isDeleted: { $ne: true } });
    if (!user) {
      user = await User.findOne({ profileSlug: username, isDeleted: { $ne: true } });
    }
    if (!user) {
      throw new ValidationError('User profile not found.');
    }

    const isOwner = req.user && req.user._id.toString() === user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    const filter = { userId: user._id };

    if (!isOwner && !isAdmin) {
      filter.status = 'published';
      filter.visibility = 'Public';
      filter.isDeleted = { $ne: true };
    } else {
      if (status) filter.status = status;
      if (visibility) filter.visibility = visibility;
      if (req.query.trash === 'true') {
        filter.isDeleted = true;
      } else {
        filter.isDeleted = { $ne: true };
      }
    }

    if (publicationType && publicationType !== 'all') {
      filter.publicationType = publicationType;
    }
    if (year && year !== 'all') {
      filter.year = Number(year);
    }
    if (journal && journal !== 'all') {
      filter.journal = new RegExp(journal, 'i');
    }
    if (conference && conference !== 'all') {
      filter.conference = new RegExp(conference, 'i');
    }
    if (publisher && publisher !== 'all') {
      filter.publisher = new RegExp(publisher, 'i');
    }
    if (researchArea && researchArea !== 'all') {
      filter.researchAreas = new RegExp(researchArea, 'i');
    }

    if (source === 'scholar') {
      filter.googleScholarPublicationId = { $exists: true, $ne: null, $ne: '' };
    } else if (source === 'manual') {
      filter.$or = [
        { googleScholarPublicationId: { $exists: false } },
        { googleScholarPublicationId: null },
        { googleScholarPublicationId: '' }
      ];
    }

    const result = await publicationService.getPublications(filter, { page, limit, sort, search });

    let stats = null;
    if (isOwner) {
      stats = await publicationService.getPublicationStats(user._id);
    }

    return res.success('Publications retrieved successfully.', {
      docs: publicationDTO.formatPublicationList(result.docs),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      stats
    });
  });

  // Duplicate publication
  duplicatePublication = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pub = await publicationService.duplicatePublication(id, req.user._id);
    return res.success(
      'Publication duplicated successfully.',
      publicationDTO.formatPublication(pub),
      201
    );
  });

  // Toggle bookmark on a publication
  toggleBookmark = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { folderName = 'General' } = req.body;
    const result = await publicationService.toggleBookmark(req.user._id, id, folderName);
    return res.success(
      result.bookmarked ? 'Publication bookmarked successfully.' : 'Bookmark removed successfully.',
      result
    );
  });

  // Bulk action handler
  bulkAction = asyncHandler(async (req, res) => {
    const { action, ids, visibility } = req.body;
    const result = await publicationService.bulkAction(req.user._id, { action, ids, visibility });
    return res.success('Bulk action executed successfully.', result);
  });

  // Track view with deduplication
  trackViewPost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const clientInfo = getClientInfo(req);
    const result = await publicationService.trackView(id, clientInfo);
    return res.success('View tracked successfully.', result);
  });

  // Toggle recommendation
  toggleRecommendation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await publicationService.toggleRecommendation(req.user._id, id);
    return res.success(result.recommended ? 'Publication recommended successfully.' : 'Recommendation removed successfully.', result);
  });

  // Track share
  trackShare = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { platform } = req.body;
    const result = await publicationService.trackShare(req.user._id, id, platform);
    return res.success('Share event tracked successfully.', result);
  });

  // Get related publications
  getRelatedPublications = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 5 } = req.query;
    const result = await publicationService.getRelatedPublications(id, limit);
    return res.success('Related publications retrieved successfully.', result);
  });

  // Get related researchers
  getRelatedResearchers = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 5 } = req.query;
    const result = await publicationService.getRelatedResearchers(id, limit);
    return res.success('Related researchers retrieved successfully.', result);
  });

  // Get threaded comments for a publication
  getComments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const comments = await publicationService.getComments(id);
    return res.success('Comments with replies retrieved successfully.', comments);
  });

  // Post a comment or threaded reply
  addComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content, parentId } = req.body;
    const comment = await publicationService.addComment(req.user._id, id, content, parentId);
    return res.success('Comment posted successfully.', comment, 201);
  });

  // Edit own comment
  editComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const comment = await publicationService.editComment(req.user._id, commentId, content);
    return res.success('Comment updated successfully.', comment);
  });

  // Delete own comment
  deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const result = await publicationService.deleteComment(req.user._id, commentId);
    return res.success('Comment deleted successfully.', result);
  });

  // Toggle comment like
  toggleLikeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const result = await publicationService.toggleLikeComment(req.user._id, commentId);
    return res.success(result.liked ? 'Comment liked.' : 'Comment unliked.', result);
  });
}

module.exports = new PublicationController();
