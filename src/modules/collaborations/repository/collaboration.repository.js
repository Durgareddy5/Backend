const BaseRepository = require('../../../common/repository/base.repository');
const Collaboration = require('../model/Collaboration');
const CollaborationMember = require('../model/CollaborationMember');
const CollaborationInvitation = require('../model/CollaborationInvitation');
const CollaborationTask = require('../model/CollaborationTask');
const CollaborationFile = require('../model/CollaborationFile');
const CollaborationActivity = require('../model/CollaborationActivity');
const CollaborationMeeting = require('../model/CollaborationMeeting');
const CollaborationMessage = require('../model/CollaborationMessage');

class CollaborationRepository extends BaseRepository {
  constructor() {
    super(Collaboration);
  }
}

class CollaborationMemberRepository extends BaseRepository {
  constructor() {
    super(CollaborationMember);
  }
}

class CollaborationInvitationRepository extends BaseRepository {
  constructor() {
    super(CollaborationInvitation);
  }
}

class CollaborationTaskRepository extends BaseRepository {
  constructor() {
    super(CollaborationTask);
  }
}

class CollaborationFileRepository extends BaseRepository {
  constructor() {
    super(CollaborationFile);
  }
}

class CollaborationActivityRepository extends BaseRepository {
  constructor() {
    super(CollaborationActivity);
  }
}

class CollaborationMeetingRepository extends BaseRepository {
  constructor() {
    super(CollaborationMeeting);
  }
}

class CollaborationMessageRepository extends BaseRepository {
  constructor() {
    super(CollaborationMessage);
  }
}

module.exports = {
  collaborationRepository: new CollaborationRepository(),
  collaborationMemberRepository: new CollaborationMemberRepository(),
  collaborationInvitationRepository: new CollaborationInvitationRepository(),
  collaborationTaskRepository: new CollaborationTaskRepository(),
  collaborationFileRepository: new CollaborationFileRepository(),
  collaborationActivityRepository: new CollaborationActivityRepository(),
  collaborationMeetingRepository: new CollaborationMeetingRepository(),
  collaborationMessageRepository: new CollaborationMessageRepository()
};
