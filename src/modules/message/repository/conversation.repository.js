const BaseRepository = require("../../../common/repository/base.repository");
const Conversation = require("../../../models/Conversation");

class ConversationRepository extends BaseRepository {
  constructor() {
    super(Conversation);
  }
}

module.exports = new ConversationRepository();
