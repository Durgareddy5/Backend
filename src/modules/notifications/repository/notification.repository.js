const BaseRepository = require('../../../common/repository/base.repository');
const Notification = require('../../../models/Notification');

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  async findByRecipient(recipientId, queryOptions = {}) {
    const {
      limit = 20,
      cursor = null,
      type = null,
      isRead = null,
      sort = '-createdAt'
    } = queryOptions;

    const filter = { recipientId };

    if (type) {
      const normalizedType = this._normalizeTypeFilter(type);
      if (Array.isArray(normalizedType)) {
        filter.type = { $in: normalizedType };
      } else {
        filter.type = normalizedType;
      }
    }

    if (isRead !== null && isRead !== undefined) {
      filter.isRead = isRead === true || isRead === 'true';
    }

    if (cursor) {
      filter.createdAt = { $lt: new Date(cursor) };
    }

    const docs = await this.model
      .find(filter)
      .sort(sort)
      .limit(Number(limit) + 1)
      .populate('actorId', 'firstName lastName fullName profileImage username profileSlug')
      .lean();

    const hasNextPage = docs.length > Number(limit);
    const pageDocs = docs.slice(0, Number(limit));
    const nextCursor = hasNextPage && pageDocs.length > 0
      ? pageDocs[pageDocs.length - 1].createdAt.toISOString()
      : null;

    return {
      docs: pageDocs,
      nextCursor,
      hasNextPage,
      total: await this.model.countDocuments(filter)
    };
  }

  async countUnreadByRecipient(recipientId) {
    return await this.model.countDocuments({ recipientId, isRead: false });
  }

  async markAsRead(notificationId, recipientId) {
    return await this.model.findOneAndUpdate(
      { _id: notificationId, recipientId },
      { $set: { isRead: true } },
      { new: true }
    );
  }

  async markAllRead(recipientId) {
    return await this.model.updateMany(
      { recipientId, isRead: false },
      { $set: { isRead: true } }
    );
  }

  async deleteForRecipient(notificationId, recipientId) {
    return await this.model.findOneAndDelete({ _id: notificationId, recipientId });
  }

  async clearAll(recipientId) {
    return await this.model.deleteMany({ recipientId });
  }

  _normalizeTypeFilter(type) {
    if (!type) return null;

    if (type === 'connection') {
      return ['connection_request', 'connection_accepted', 'connection_rejected', 'connection_removed'];
    }

    if (type === 'publication') {
      return ['publication_uploaded', 'publication_updated', 'publication_commented', 'publication_bookmarked', 'publication_shared', 'publication_cited', 'publication_recommended'];
    }

    if (type === 'system') {
      return ['system', 'admin'];
    }

    return type;
  }
}

module.exports = new NotificationRepository();
