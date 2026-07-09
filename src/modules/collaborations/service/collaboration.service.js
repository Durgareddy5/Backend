const {
  collaborationRepository,
  collaborationMemberRepository,
  collaborationInvitationRepository,
  collaborationTaskRepository,
  collaborationFileRepository,
  collaborationActivityRepository,
  collaborationMeetingRepository,
  collaborationMessageRepository
} = require('../repository/collaboration.repository');
const User = require('../../../models/User');
const Notification = require('../../../models/Notification');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../../../common/errors/AppError');
const socketGateway = require('../../../socket');

class CollaborationService {
  /**
   * Helper to verify if user has required roles in workspace
   */
  async checkPermission(userId, collaborationId, allowedRoles = []) {
    const member = await collaborationMemberRepository.findOne({
      collaborationId,
      userId
    });
    if (!member) {
      throw new UnauthorizedError('Access denied: You are not a member of this workspace.');
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
      throw new UnauthorizedError('Access denied: Insufficient workspace permissions.');
    }
    return member;
  }

  /**
   * Create new research workspace
   */
  async createCollaboration(userId, data) {
    const workspace = await collaborationRepository.create(data);

    // Add creator as Owner
    await collaborationMemberRepository.create({
      collaborationId: workspace._id,
      userId,
      role: 'Owner'
    });

    // Log Activity
    await collaborationActivityRepository.create({
      collaborationId: workspace._id,
      userId,
      actionType: 'member_joined',
      details: 'Principal Investigator created workspace.'
    });

    return workspace;
  }

  /**
   * Get user collaborations
   */
  async getUserCollaborations(userId) {
    const memberships = await collaborationMemberRepository.model
      .find({ userId })
      .populate('collaborationId')
      .lean();
    return memberships.map(m => ({
      ...m.collaborationId,
      myRole: m.role
    }));
  }

  /**
   * Get workspace details by Slug
   */
  async getCollaborationBySlug(userId, slug) {
    const workspace = await collaborationRepository.findOne({ slug });
    if (!workspace) {
      throw new NotFoundError('Collaboration workspace not found.');
    }

    // Verify membership
    const member = await this.checkPermission(userId, workspace._id);

    // Fetch details
    const members = await collaborationMemberRepository.model
      .find({ collaborationId: workspace._id })
      .populate('userId', 'firstName lastName email username avatar profileSlug')
      .lean();

    const tasks = await collaborationTaskRepository.model
      .find({ collaborationId: workspace._id })
      .populate('assignedTo', 'firstName lastName avatar')
      .lean();

    const files = await collaborationFileRepository.model
      .find({ collaborationId: workspace._id })
      .populate('uploadedBy', 'firstName lastName')
      .lean();

    const activities = await collaborationActivityRepository.model
      .find({ collaborationId: workspace._id })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const meetings = await collaborationMeetingRepository.model
      .find({ collaborationId: workspace._id })
      .populate('participants', 'firstName lastName')
      .lean();

    return {
      workspace,
      myRole: member.role,
      members,
      tasks,
      files,
      activities,
      meetings
    };
  }

  /**
   * Invite researcher to collaboration
   */
  async inviteUser(userId, collaborationId, invitedEmail, role, note) {
    // Owner, PI, or Admin can invite
    await this.checkPermission(userId, collaborationId, ['Owner', 'PI', 'Admin']);

    // Find user
    const targetUser = await User.findOne({ email: invitedEmail });
    const invitedUserId = targetUser ? targetUser._id : null;

    // Check if already a member
    if (invitedUserId) {
      const existing = await collaborationMemberRepository.findOne({
        collaborationId,
        userId: invitedUserId
      });
      if (existing) {
        throw new ValidationError('User is already a member of this workspace.');
      }
    }

    // Create invite
    const invite = await collaborationInvitationRepository.create({
      collaborationId,
      invitedUserId,
      invitedEmail,
      invitedBy: userId,
      role,
      note
    });

    // Send notifications if user exists
    if (invitedUserId) {
      const workspace = await collaborationRepository.findById(collaborationId);
      const title = 'Collaboration Invitation';
      const message = `You have been invited to join the "${workspace.name}" workspace as a ${role}.`;

      await Notification.create({
        recipientId: invitedUserId,
        actorId: userId,
        type: 'collaboration_invitation',
        title,
        message,
        targetType: 'Project',
        targetId: collaborationId,
        targetUrl: `/collaborations/${workspace.slug}`
      });

      // Emit realtime notification
      socketGateway.emitToUser(invitedUserId.toString(), 'notification:new', {
        title,
        message,
        type: 'collaboration_invitation'
      });
    }

    return invite;
  }

  /**
   * Accept Invitation
   */
  async acceptInvitation(userId, invitationId) {
    const invite = await collaborationInvitationRepository.findById(invitationId);
    if (!invite || invite.status !== 'Pending') {
      throw new ValidationError('Invitation is invalid or has already been processed.');
    }

    const user = await User.findById(userId);
    if (invite.invitedEmail !== user.email && invite.invitedUserId?.toString() !== userId.toString()) {
      throw new UnauthorizedError('This invitation was not addressed to you.');
    }

    // Update status
    invite.status = 'Accepted';
    await invite.save();

    // Create member
    await collaborationMemberRepository.create({
      collaborationId: invite.collaborationId,
      userId,
      role: invite.role
    });

    // Log Activity
    await collaborationActivityRepository.create({
      collaborationId: invite.collaborationId,
      userId,
      actionType: 'member_joined',
      details: `${user.firstName} joined the workspace.`
    });

    // Notify workspace
    socketGateway.emitToRoom(`collaboration:${invite.collaborationId}`, 'workspace:activity', {
      actionType: 'member_joined',
      details: `${user.firstName} joined the workspace.`
    });

    return invite;
  }

  /**
   * Reject Invitation
   */
  async rejectInvitation(userId, invitationId) {
    const invite = await collaborationInvitationRepository.findById(invitationId);
    if (!invite || invite.status !== 'Pending') {
      throw new ValidationError('Invitation is invalid or has already been processed.');
    }

    const user = await User.findById(userId);
    if (invite.invitedEmail !== user.email && invite.invitedUserId?.toString() !== userId.toString()) {
      throw new UnauthorizedError('This invitation was not addressed to you.');
    }

    invite.status = 'Rejected';
    await invite.save();
    return invite;
  }

  /**
   * Create Task
   */
  async createTask(userId, collaborationId, taskData) {
    await this.checkPermission(userId, collaborationId);

    const task = await collaborationTaskRepository.create({
      ...taskData,
      collaborationId,
      createdBy: userId
    });

    await collaborationActivityRepository.create({
      collaborationId,
      userId,
      actionType: 'task_created',
      details: `Task "${task.title}" was created.`
    });

    socketGateway.emitToRoom(`collaboration:${collaborationId}`, 'workspace:task', task);

    return task;
  }

  /**
   * Update Task Status
   */
  async updateTaskStatus(userId, taskId, status) {
    const task = await collaborationTaskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    await this.checkPermission(userId, task.collaborationId);

    const oldStatus = task.status;
    task.status = status;
    await task.save();

    if (status === 'Completed' && oldStatus !== 'Completed') {
      await collaborationActivityRepository.create({
        collaborationId: task.collaborationId,
        userId,
        actionType: 'task_completed',
        details: `Task "${task.title}" was marked completed.`
      });
    }

    socketGateway.emitToRoom(`collaboration:${task.collaborationId}`, 'workspace:task', task);

    return task;
  }

  /**
   * Upload Document Metadata
   */
  async addFile(userId, collaborationId, fileData) {
    await this.checkPermission(userId, collaborationId);

    const file = await collaborationFileRepository.create({
      ...fileData,
      collaborationId,
      uploadedBy: userId
    });

    await collaborationActivityRepository.create({
      collaborationId,
      userId,
      actionType: 'file_uploaded',
      details: `File "${file.fileName}" was uploaded.`
    });

    socketGateway.emitToRoom(`collaboration:${collaborationId}`, 'workspace:file', file);

    return file;
  }

  /**
   * Create Meeting
   */
  async createMeeting(userId, collaborationId, meetingData) {
    await this.checkPermission(userId, collaborationId, ['Owner', 'PI', 'Co-PI', 'Admin']);

    const meeting = await collaborationMeetingRepository.create({
      ...meetingData,
      collaborationId,
      createdBy: userId
    });

    await collaborationActivityRepository.create({
      collaborationId,
      userId,
      actionType: 'meeting_scheduled',
      details: `Meeting "${meeting.title}" scheduled for ${meeting.date}.`
    });

    socketGateway.emitToRoom(`collaboration:${collaborationId}`, 'workspace:activity', {
      actionType: 'meeting_scheduled',
      details: `Meeting "${meeting.title}" scheduled.`
    });

    return meeting;
  }

  /**
   * Delete Workspace
   */
  async deleteCollaboration(userId, collaborationId) {
    // Only Owner can delete
    await this.checkPermission(userId, collaborationId, ['Owner']);

    await collaborationRepository.model.deleteOne({ _id: collaborationId });
    await collaborationMemberRepository.model.deleteMany({ collaborationId });
    await collaborationInvitationRepository.model.deleteMany({ collaborationId });
    await collaborationTaskRepository.model.deleteMany({ collaborationId });
    await collaborationFileRepository.model.deleteMany({ collaborationId });
    await collaborationActivityRepository.model.deleteMany({ collaborationId });
    await collaborationMeetingRepository.model.deleteMany({ collaborationId });
    await collaborationMessageRepository.model.deleteMany({ collaborationId });

    return { success: true, message: 'Workspace deleted successfully.' };
  }
}

module.exports = new CollaborationService();
