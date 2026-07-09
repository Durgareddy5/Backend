const BaseRepository = require('../../../common/repository/base.repository');
const ImportLog = require('../../../models/ImportLog');

class ImportLogRepository extends BaseRepository {
  constructor() {
    super(ImportLog);
  }

  async findByImportId(importId) {
    return await this.model.find({ importId }).sort({ timestamp: 1 });
  }

  async deleteByImportId(importId) {
    return await this.model.deleteMany({ importId });
  }
}

module.exports = new ImportLogRepository();
