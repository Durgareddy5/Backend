const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const collaborationController = require('../controller/collaboration.controller');

// Protect all routes
router.use(authMiddleware);

router.route('/')
  .post(collaborationController.createCollaboration)
  .get(collaborationController.getUserCollaborations);

router.route('/:slug')
  .get(collaborationController.getCollaborationBySlug);

router.route('/:id')
  .delete(collaborationController.deleteCollaboration);

router.route('/:id/invite')
  .post(collaborationController.inviteUser);

router.route('/invitations/:id/accept')
  .patch(collaborationController.acceptInvitation);

router.route('/invitations/:id/reject')
  .patch(collaborationController.rejectInvitation);

router.route('/:id/tasks')
  .post(collaborationController.createTask);

router.route('/:id/tasks/:taskId')
  .patch(collaborationController.updateTaskStatus);

router.route('/:id/files')
  .post(collaborationController.addFile);

router.route('/:id/meetings')
  .post(collaborationController.createMeeting);

module.exports = router;
