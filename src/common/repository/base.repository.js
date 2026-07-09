class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async findById(id, populate = '', select = '') {
    let query = this.model.findById(id);
    if (populate) query = query.populate(populate);
    if (select) query = query.select(select);
    return await query;
  }

  async findOne(filter = {}, populate = '', select = '') {
    let query = this.model.findOne({ ...filter, isDeleted: { $ne: true } });
    if (populate) query = query.populate(populate);
    if (select) query = query.select(select);
    return await query;
  }

  async find(filter = {}, queryOptions = {}, populate = '') {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search = '',
      searchFields = []
    } = queryOptions;

    const queryFilter = { ...filter, isDeleted: { $ne: true } };

    // Apply simple text search if provided
    if (search && searchFields.length > 0) {
      queryFilter.$or = searchFields.map(field => ({
        [field]: { $regex: search, $options: 'i' }
      }));
    }

    const skip = (page - 1) * limit;

    let query = this.model.find(queryFilter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    if (populate) {
      query = query.populate(populate);
    }

    const [docs, total] = await Promise.all([
      query,
      this.model.countDocuments(queryFilter)
    ]);

    return {
      docs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  async update(id, updateData, options = { new: true, runValidators: true }) {
    return await this.model.findByIdAndUpdate(id, updateData, options);
  }

  async updateMany(filter, updateData, options = {}) {
    return await this.model.updateMany({ ...filter, isDeleted: { $ne: true } }, updateData, options);
  }

  async delete(id) {
    return await this.model.findByIdAndDelete(id);
  }

  async softDelete(id, deletedBy = null) {
    return await this.model.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        ...(deletedBy && { deletedBy })
      },
      { new: true }
    );
  }

  async createMany(dataArray) {
    return await this.model.insertMany(dataArray);
  }

  async restore(id) {
    return await this.model.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      },
      { new: true }
    );
  }

  async exists(filter = {}) {
    return await this.model.exists({ ...filter, isDeleted: { $ne: true } });
  }

  async paginate(filter = {}, queryOptions = {}, populate = '') {
    return await this.find(filter, queryOptions, populate);
  }

  async bulkInsert(dataArray) {
    return await this.model.insertMany(dataArray);
  }

  async bulkUpdate(operations) {
    // operations should be formatted as bulkWrite transactions: [{ updateOne: { filter: {...}, update: {...} } }]
    return await this.model.bulkWrite(operations);
  }

  async aggregate(pipeline) {
    return await this.model.aggregate(pipeline);
  }

  async count(filter = {}) {
    return await this.model.countDocuments({ ...filter, isDeleted: { $ne: true } });
  }
}

module.exports = BaseRepository;
