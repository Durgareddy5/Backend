const express = require('express');
const router = express.Router();
const controller = require('../controller/notification.controller');
const validator = require('../validator/notification.validator');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', validator.getNotificationsValidator, controller.getNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/read-all', controller.markAllRead);
router.patch('/settings', validator.updateSettingsValidator, controller.updateSettings);
router.delete('/clear-all', controller.clearAllNotifications);
router.patch('/:notificationId/read', validator.notificationIdValidator, controller.markAsRead);
router.delete('/:notificationId', validator.notificationIdValidator, controller.deleteNotification);

module.exports = router;
