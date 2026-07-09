const BaseRepository = require("../../../common/repository/base.repository");
const Message = require("../../../models/Message");

class MessageRepository extends BaseRepository {
  constructor() {
    super(Message);
  }
}

module.exports = new MessageRepository();
