const mongoose = require('mongoose');

/**
 * Cursor pagination utility for mongoose queries
 */
const cursorPaginate = async (model, query, { limit = 10, cursor, sortField = '_id', sortOrder = -1, populate = '' }) => {
  const filter = { ...query };

  if (cursor) {
    const castCursor = mongoose.Types.ObjectId.isValid(cursor) 
      ? new mongoose.Types.ObjectId(cursor) 
      : cursor;
    
    if (sortOrder === -1) {
      filter[sortField] = { $lt: castCursor };
    } else {
      filter[sortField] = { $gt: castCursor };
    }
  }

  let dbQuery = model.find(filter)
    .sort({ [sortField]: sortOrder })
    .limit(limit + 1)
    .lean();

  if (populate) {
    dbQuery = dbQuery.populate(populate);
  }

  const results = await dbQuery;

  const hasNextPage = results.length > limit;
  const docs = hasNextPage ? results.slice(0, limit) : results;
  const nextCursor = hasNextPage ? docs[docs.length - 1][sortField].toString() : null;

  return {
    docs,
    nextCursor,
    hasNextPage
  };
};

/**
 * Cursor pagination utility for aggregation pipelines
 */
const cursorPaginateAggregate = async (model, pipeline, { limit = 10, cursor, sortField = '_id', sortOrder = -1 }) => {
  const aggPipeline = [...pipeline];

  if (cursor) {
    const castCursor = mongoose.Types.ObjectId.isValid(cursor) 
      ? new mongoose.Types.ObjectId(cursor) 
      : cursor;

    const cursorFilter = {
      [sortField]: sortOrder === -1 ? { $lt: castCursor } : { $gt: castCursor }
    };
    
    // Inject at the beginning of the pipeline
    aggPipeline.unshift({ $match: cursorFilter });
  }

  aggPipeline.push({ $sort: { [sortField]: sortOrder } });
  aggPipeline.push({ $limit: limit + 1 });

  const results = await model.aggregate(aggPipeline);

  const hasNextPage = results.length > limit;
  const docs = hasNextPage ? results.slice(0, limit) : results;
  const nextCursor = hasNextPage ? docs[docs.length - 1][sortField].toString() : null;

  return {
    docs,
    nextCursor,
    hasNextPage
  };
};

module.exports = {
  cursorPaginate,
  cursorPaginateAggregate
};
