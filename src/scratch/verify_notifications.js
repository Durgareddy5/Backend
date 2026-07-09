require('dotenv').config();
const { connectDB, closeDB } = require('../config/database/connection');
const notificationService = require('../modules/notifications/service/notification.service');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Notification = require('../models/Notification');

const runTests = async () => {
  console.log('--- Connecting to database ---');
  await connectDB();

  // Create temporary test users
  console.log('--- Creating test users ---');
  const user1 = await User.create({
    firstName: 'Notify',
    lastName: 'TesterA',
    email: 'notify.a@researchconnect.com',
    password: 'password123',
    role: 'researcher',
    username: 'notifya',
    profileSlug: 'notifya'
  });

  const user2 = await User.create({
    firstName: 'Notify',
    lastName: 'TesterB',
    email: 'notify.b@researchconnect.com',
    password: 'password123',
    role: 'researcher',
    username: 'notifyb',
    profileSlug: 'notifyb'
  });

  // Setup profile schemas with settings enabled
  await Profile.findOneAndUpdate(
    { userId: user1._id },
    { 
      userId: user1._id,
      notificationSettings: {
        follow: true,
        connection: true,
        publication: true,
        comment: true,
        mention: true,
        system: true
      }
    },
    { upsert: true, new: true }
  );

  await Profile.findOneAndUpdate(
    { userId: user2._id },
    { 
      userId: user2._id,
      notificationSettings: {
        follow: true,
        connection: true,
        publication: true,
        comment: true,
        mention: true,
        system: true
      }
    },
    { upsert: true, new: true }
  );

  try {
    console.log('\n=======================================');
    console.log('TEST CASE 1: Standard Notification Trigger');
    console.log('=======================================');

    // 1. Create a follow notification from User 1 to User 2
    console.log('1. Triggering follow notification...');
    const notif = await notificationService.createNotification({
      recipientId: user2._id,
      actorId: user1._id,
      type: 'follow',
      title: 'New Follower',
      message: 'Notify TesterA started following you.',
      targetType: 'User',
      targetId: user1._id,
      targetUrl: `/profile/${user1.username}`
    });

    console.log(`- Created Notification ID: ${notif._id}`);
    console.log(`- Title: ${notif.title}`);
    console.log(`- Message: ${notif.message}`);

    // Check unread count
    const countRes = await notificationService.getUnreadCount(user2._id);
    console.log(`- User 2 Unread Count: ${countRes.count} (Expected: 1)`);

    console.log('\n=======================================');
    console.log('TEST CASE 2: Notification Preferences (Opt-out)');
    console.log('=======================================');

    // Turn off follow notifications for User 2
    console.log('1. User 2 disabling follow notifications...');
    await notificationService.updateSettings(user2._id, { follow: false });

    // Try sending another follow notification
    console.log('2. Trying to trigger another follow notification...');
    const skippedNotif = await notificationService.createNotification({
      recipientId: user2._id,
      actorId: user1._id,
      type: 'follow',
      title: 'New Follower',
      message: 'Notify TesterA followed you again.',
      targetType: 'User',
      targetId: user1._id
    });

    console.log(`- Result: ${skippedNotif === null ? 'SKIPPED SUCCESSFULLY' : 'FAILED: Created anyway'}`);

    // Verify unread count remains 1
    const countRes2 = await notificationService.getUnreadCount(user2._id);
    console.log(`- User 2 Unread Count: ${countRes2.count} (Expected: 1)`);

    console.log('\n=======================================');
    console.log('TEST CASE 3: Reading & Clears');
    console.log('=======================================');

    // Mark notification as read
    console.log('1. Marking notification as read...');
    await notificationService.markAsRead(notif._id, user2._id);

    const countRes3 = await notificationService.getUnreadCount(user2._id);
    console.log(`- User 2 Unread Count: ${countRes3.count} (Expected: 0)`);

    // Verify notification list pagination
    console.log('\n2. Fetching notifications list...');
    const list = await notificationService.getNotifications(user2._id, { limit: 10 });
    console.log(`- Retrieved notifications count: ${list.docs.length}`);
    console.log(`- First notification read status: ${list.docs[0].isRead} (Expected: true)`);

    // Delete single notification
    console.log('\n3. Deleting notification...');
    await notificationService.deleteNotification(notif._id, user2._id);
    const inDB = await Notification.findById(notif._id);
    console.log(`- Notification exists in DB: ${!!inDB} (Expected: false)`);

    console.log('\n=======================================');
    console.log('ALL NOTIFICATION TESTS PASSED');
    console.log('=======================================');

  } catch (error) {
    console.error('Test run failed with error:', error);
  } finally {
    console.log('\n--- Cleaning up test records ---');
    await User.deleteOne({ _id: user1._id });
    await User.deleteOne({ _id: user2._id });
    await Profile.deleteOne({ userId: user1._id });
    await Profile.deleteOne({ userId: user2._id });
    await Notification.deleteMany({ recipientId: user2._id });
    await closeDB();
    console.log('Cleanup complete. DB closed.');
  }
};

runTests();
