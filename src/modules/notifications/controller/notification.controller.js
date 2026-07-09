const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');
const ApiResponse = require('../../../common/responses/ApiResponse');
const notificationService = require('../service/notification.service');

class NotificationController {
  getNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.getNotifications(req.user._id, {
      limit: req.query.limit || 20,
      cursor: req.query.cursor || null,
      type: req.query.type || null,
      isRead: req.query.isRead !== undefined ? req.query.isRead : null
    });

    return ApiResponse.success(res, 'Notifications fetched successfully', result);
  });

  getUnreadCount = asyncHandler(async (req, res) => {
    const result = await notificationService.getUnreadCount(req.user._id);
    return ApiResponse.success(res, 'Unread count fetched successfully', result);
  });

  markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const result = await notificationService.markAsRead(notificationId, req.user._id);
    if (!result) {
      return ApiResponse.error(res, 'Notification not found', { code: 'NOT_FOUND' }, 404);
    }

    return ApiResponse.success(res, 'Notification marked as read', result);
  });

  markAllRead = asyncHandler(async (req, res) => {
    const result = await notificationService.markAllRead(req.user._id);
    return ApiResponse.success(res, 'All notifications marked as read', result);
  });

  deleteNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const result = await notificationService.deleteNotification(notificationId, req.user._id);
    if (!result) {
      return ApiResponse.error(res, 'Notification not found', { code: 'NOT_FOUND' }, 404);
    }

    return ApiResponse.success(res, 'Notification deleted successfully', result);
  });

  clearAllNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.clearAllNotifications(req.user._id);
    return ApiResponse.success(res, 'All notifications cleared', result);
  });

  updateSettings = asyncHandler(async (req, res) => {
    const result = await notificationService.updateSettings(req.user._id, req.body);
    if (!result) {
      return ApiResponse.error(res, 'Notification settings could not be updated', { code: 'INVALID_SETTINGS' }, 400);
    }

    return ApiResponse.success(res, 'Notification preferences updated', result);
  });
}

module.exports = new NotificationController();
