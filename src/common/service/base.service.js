const mongoose = require('mongoose');
const { ValidationError, AppError } = require('../errors/AppError');

class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Helper to perform validations. Override in subclass if needed.
   * @param {Object} data 
   */
  async validate(data) {
    // Custom validation logic can go here. Default is pass.
    return true;
  }

  async create(data) {
    await this.validate(data);
    return await this.repository.create(data);
  }

  async createMany(dataArray) {
    for (const data of dataArray) {
      await this.validate(data);
    }
    return await this.repository.createMany(dataArray);
  }

  async findById(id, populate = '', select = '') {
    const doc = await this.repository.findById(id, populate, select);
    if (!doc || doc.isDeleted) {
      throw new AppError('Resource not found', 404, 'NOT_FOUND');
    }
    return doc;
  }

  async findOne(filter = {}, populate = '', select = '') {
    return await this.repository.findOne(filter, populate, select);
  }

  async find(filter = {}, queryOptions = {}, populate = '') {
    // Implement standard pagination, sorting, searching, and filtering
    const options = {
      page: parseInt(queryOptions.page, 10) || 1,
      limit: parseInt(queryOptions.limit, 10) || 10,
      sort: queryOptions.sort || '-createdAt',
      search: queryOptions.search || '',
      searchFields: queryOptions.searchFields || []
    };

    return await this.repository.find(filter, options, populate);
  }

  async paginate(filter = {}, queryOptions = {}, populate = '') {
    return await this.find(filter, queryOptions, populate);
  }

  async update(id, updateData) {
    await this.validate(updateData);
    const doc = await this.repository.update(id, updateData);
    if (!doc) {
      throw new AppError('Resource not found for update', 404, 'NOT_FOUND');
    }
    return doc;
  }

  async updateMany(filter, updateData) {
    return await this.repository.updateMany(filter, updateData);
  }

  async delete(id) {
    const doc = await this.repository.delete(id);
    if (!doc) {
      throw new AppError('Resource not found for deletion', 404, 'NOT_FOUND');
    }
    return doc;
  }

  async softDelete(id, deletedBy = null) {
    const doc = await this.repository.softDelete(id, deletedBy);
    if (!doc) {
      throw new AppError('Resource not found for soft-deletion', 404, 'NOT_FOUND');
    }
    return doc;
  }

  async restore(id) {
    const doc = await this.repository.restore(id);
    if (!doc) {
      throw new AppError('Resource not found for restore', 404, 'NOT_FOUND');
    }
    return doc;
  }

  async exists(filter = {}) {
    return await this.repository.exists(filter);
  }

  async count(filter = {}) {
    return await this.repository.count(filter);
  }

  async aggregate(pipeline) {
    return await this.repository.aggregate(pipeline);
  }

  /**
   * Run operations in a Mongoose session transaction
   * @param {Function} operationsFn - async function taking session as argument
   */
  async executeTransaction(operationsFn) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await operationsFn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = BaseService;
