const mongoose = require('mongoose');
const logger = require('../../common/logger/winston');

// Import all models to register their schemas
require('../../models/User');
require('../../models/Profile');
require('../../models/Settings');
require('../../models/Notification');
require('../../models/Session');
require('../../models/ActivityLog');
require('../../models/RefreshToken');
require('../../models/EmailOtp');
require('../../models/SystemConfiguration');
require('../../models/ApplicationLog');
require('../../models/GoogleScholarProfile');
require('../../models/Publication');
require('../../models/PublicationAuthor');
require('../../models/CoAuthor');
require('../../models/CitationGraph');
require('../../models/ResearchArea');
require('../../models/Keyword');
require('../../models/ResearchMetric');
require('../../models/Import');
require('../../models/ImportLog');
require('../../models/DerivedAnalytics');
require('../../models/SyncHistory');

const syncDatabaseIndexes = async () => {
  logger.info('Auditing and syncing database indexes...');
  try {
    // Drop the old text index on publications to apply language_override: 'none'
    try {
      const Publication = mongoose.model('Publication');
      await Publication.collection.dropIndex('publication_full_text_search');
      logger.info('Successfully dropped publication_full_text_search to apply language_override: none');
    } catch (e) {
      // Ignore if index doesn't exist
      logger.debug('Index publication_full_text_search not found or could not be dropped: ' + e.message);
    }

    const models = mongoose.modelNames();
    for (const modelName of models) {
      const Model = mongoose.model(modelName);
      logger.info(`Syncing indexes for model: ${modelName}`);
      await Model.syncIndexes();
    }
    logger.info('Database indexes synced successfully.');
  } catch (error) {
    logger.error('Error syncing database indexes:', error);
  }
};

module.exports = {
  syncDatabaseIndexes
};
