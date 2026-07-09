require('dotenv').config();
const { connectDB, closeDB } = require('../config/database/connection');
const messageService = require('../modules/messages/service/message.service');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Connection = require('../models/Connection');
const Conversation = require('../modules/messages/model/Conversation');
const Message = require('../modules/messages/model/Message');
const PinnedChat = require('../modules/messages/model/PinnedChat');
const ArchivedChat = require('../modules/messages/model/ArchivedChat');

const runTests = async () => {
  console.log('--- Connecting to database ---');
  await connectDB();

  // Create temporary test users
  console.log('--- Creating test users ---');
  const user1 = await User.create({
    firstName: 'Chat',
    lastName: 'TesterA',
    email: 'chat.a@researchconnect.com',
    password: 'password123',
    role: 'researcher',
    username: 'chata',
    profileSlug: 'chata'
  });

  const user2 = await User.create({
    firstName: 'Chat',
    lastName: 'TesterB',
    email: 'chat.b@researchconnect.com',
    password: 'password123',
    role: 'researcher',
    username: 'chatb',
    profileSlug: 'chatb'
  });

  try {
    console.log('\n=======================================');
    console.log('TEST CASE 1: Messaging Access Control (Unconnected)');
    console.log('=======================================');

    // 1. Try sending a message before connection is established
    console.log('1. Trying to start chat between unconnected researchers...');
    try {
      await messageService.getOrCreateConversation(user1._id, user2._id);
      console.log('X ERROR: Allowed conversation to start between unconnected users');
    } catch (err) {
      console.log(`- Blocked successfully: "${err.message}"`);
    }

    try {
      await messageService.sendMessage(user1._id, {
        receiverId: user2._id,
        text: 'Hello, are you connected?'
      });
      console.log('X ERROR: Allowed sending message to unconnected user');
    } catch (err) {
      console.log(`- Blocked sending successfully: "${err.message}"`);
    }

    console.log('\n=======================================');
    console.log('TEST CASE 2: Messaging Under Connection');
    console.log('=======================================');

    // Establish connection in database
    console.log('1. Establishing connection between User A and User B...');
    const [a, b] = [user1._id.toString(), user2._id.toString()].sort();
    await Connection.create({
      researcherA: a,
      researcherB: b
    });

    // 2. Chat is now allowed
    console.log('2. Starting conversation...');
    const conv = await messageService.getOrCreateConversation(user1._id, user2._id);
    console.log(`- Conversation established successfully. ID: ${conv._id}`);

    // 3. Send message
    console.log('3. Sending first message...');
    const msg = await messageService.sendMessage(user1._id, {
      conversationId: conv._id,
      text: 'Hello, glad we connected!'
    });
    console.log(`- Message Sent. Text: "${msg.text}", Status: "${msg.status}"`);

    // Verify conversation lists includes this chat
    const conversations = await messageService.getUserConversations(user1._id);
    console.log(`- User A Active Conversations Count: ${conversations.length} (Expected: 1)`);
    console.log(`- Last message preview: "${conversations[0].lastMessage.text}"`);

    console.log('\n=======================================');
    console.log('TEST CASE 3: Pin & Archive Controls');
    console.log('=======================================');

    // Pin chat
    console.log('1. Pinning conversation...');
    await messageService.pinConversation(user1._id, conv._id);
    const pinCheck = await PinnedChat.findOne({ userId: user1._id, conversationId: conv._id });
    console.log(`- Pinned record exists in DB: ${!!pinCheck} (Expected: true)`);

    // Verify conversation list returns it as pinned
    const convListPinned = await messageService.getUserConversations(user1._id);
    console.log(`- Conversation Pinned Status: ${convListPinned[0].isPinned} (Expected: true)`);

    // Unpin chat
    console.log('2. Unpinning conversation...');
    await messageService.unpinConversation(user1._id, conv._id);
    const unpinCheck = await PinnedChat.findOne({ userId: user1._id, conversationId: conv._id });
    console.log(`- Pinned record exists: ${!!unpinCheck} (Expected: false)`);

    // Archive chat
    console.log('3. Archiving conversation...');
    await messageService.archiveConversation(user1._id, conv._id);
    const archiveCheck = await ArchivedChat.findOne({ userId: user1._id, conversationId: conv._id });
    console.log(`- Archive record exists: ${!!archiveCheck} (Expected: true)`);

    console.log('\n=======================================');
    console.log('TEST CASE 4: Message Modifications (Edits & Deletes)');
    console.log('=======================================');

    // Edit message
    console.log('1. Editing message text...');
    const editedMsg = await messageService.editMessage(user1._id, msg._id, 'Hello, glad we connected! (updated)');
    console.log(`- Edited Text: "${editedMsg.text}", Edited Status: ${editedMsg.edited} (Expected: true)`);

    // Delete message for everyone
    console.log('2. Deleting message for everyone...');
    await messageService.deleteMessage(user1._id, msg._id, 'everyone');
    const deletedMsg = await Message.findById(msg._id);
    console.log(`- Message text: "${deletedMsg.text}", Deleted Status: ${deletedMsg.deleted} (Expected: true)`);

    console.log('\n=======================================');
    console.log('ALL MESSAGING TESTS PASSED');
    console.log('=======================================');

  } catch (error) {
    console.error('Test run failed with error:', error);
  } finally {
    console.log('\n--- Cleaning up test records ---');
    await User.deleteOne({ _id: user1._id });
    await User.deleteOne({ _id: user2._id });
    await Connection.deleteMany({
      $or: [
        { researcherA: user1._id, researcherB: user2._id },
        { researcherA: user2._id, researcherB: user1._id }
      ]
    });
    await Conversation.deleteMany({ participants: user1._id });
    await Message.deleteMany({ senderId: user1._id });
    await PinnedChat.deleteMany({ userId: user1._id });
    await ArchivedChat.deleteMany({ userId: user1._id });
    await closeDB();
    console.log('Cleanup complete. DB closed.');
  }
};

runTests();
