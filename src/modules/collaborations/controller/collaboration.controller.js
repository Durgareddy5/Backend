const collaborationService = require('../service/collaboration.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');

/**
 * Create Collaboration Workspace
 */
const createCollaboration = asyncHandler(async (req, res) => {
  const workspace = await collaborationService.createCollaboration(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: 'Workspace created successfully.',
    data: workspace,
    error: null
  });
});

/**
 * Get User Collaborations list
 */
const getUserCollaborations = asyncHandler(async (req, res) => {
  const workspaces = await collaborationService.getUserCollaborations(req.user.id);
  res.status(200).json({
    success: true,
    message: 'User collaborations retrieved successfully.',
    data: workspaces,
    error: null
  });
});

/**
 * Get Collaboration Workspace by Slug
 */
const getCollaborationBySlug = asyncHandler(async (req, res) => {
  const details = await collaborationService.getCollaborationBySlug(req.user.id, req.params.slug);
  res.status(200).json({
    success: true,
    message: 'Workspace details retrieved successfully.',
    data: details,
    error: null
  });
});

/**
 * Invite User
 */
const inviteUser = asyncHandler(async (req, res) => {
  const { email, role, note } = req.body;
  const invite = await collaborationService.inviteUser(req.user.id, req.params.id, email, role, note);
  res.status(200).json({
    success: true,
    message: 'Invitation sent successfully.',
    data: invite,
    error: null
  });
});

/**
 * Accept Invitation
 */
const acceptInvitation = asyncHandler(async (req, res) => {
  const invite = await collaborationService.acceptInvitation(req.user.id, req.params.id);
  res.status(200).json({
    success: true,
    message: 'Invitation accepted successfully.',
    data: invite,
    error: null
  });
});

/**
 * Reject Invitation
 */
const rejectInvitation = asyncHandler(async (req, res) => {
  const invite = await collaborationService.rejectInvitation(req.user.id, req.params.id);
  res.status(200).json({
    success: true,
    message: 'Invitation rejected successfully.',
    data: invite,
    error: null
  });
});

/**
 * Create Workspace Task
 */
const createTask = asyncHandler(async (req, res) => {
  const task = await collaborationService.createTask(req.user.id, req.params.id, req.body);
  res.status(201).json({
    success: true,
    message: 'Task created successfully.',
    data: task,
    error: null
  });
});

/**
 * Update Task Status
 */
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const task = await collaborationService.updateTaskStatus(req.user.id, req.params.taskId, status);
  res.status(200).json({
    success: true,
    message: 'Task status updated successfully.',
    data: task,
    error: null
  });
});

/**
 * Add Document File
 */
const addFile = asyncHandler(async (req, res) => {
  const file = await collaborationService.addFile(req.user.id, req.params.id, req.body);
  res.status(201).json({
    success: true,
    message: 'File shared successfully.',
    data: file,
    error: null
  });
});

/**
 * Create Meeting
 */
const createMeeting = asyncHandler(async (req, res) => {
  const meeting = await collaborationService.createMeeting(req.user.id, req.params.id, req.body);
  res.status(201).json({
    success: true,
    message: 'Meeting scheduled successfully.',
    data: meeting,
    error: null
  });
});

/**
 * Delete Workspace
 */
const deleteCollaboration = asyncHandler(async (req, res) => {
  const result = await collaborationService.deleteCollaboration(req.user.id, req.params.id);
  res.status(200).json({
    success: true,
    message: result.message,
    data: null,
    error: null
  });
});

module.exports = {
  createCollaboration,
  getUserCollaborations,
  getCollaborationBySlug,
  inviteUser,
  acceptInvitation,
  rejectInvitation,
  createTask,
  updateTaskStatus,
  addFile,
  createMeeting,
  deleteCollaboration
};
