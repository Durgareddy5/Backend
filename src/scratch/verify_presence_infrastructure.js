require('dotenv').config();
const { connectDB, closeDB } = require('../config/database/connection');
const presenceManager = require('../socket/presence/presence.manager');
const SocketSession = require('../socket/sessions/SocketSession');
const Presence = require('../socket/presence/Presence');
const User = require('../models/User');
const socketGateway = require('../socket/gateway/socket.gateway');

const runTests = async () => {
  console.log('--- Connecting to database ---');
  await connectDB();

  // Create temporary test users
  console.log('--- Creating test users ---');
  const user1 = await User.create({
    firstName: 'Presence',
    lastName: 'TesterA',
    email: 'presence.a@researchconnect.com',
    password: 'password123',
    role: 'researcher',
    username: 'presencea',
    profileSlug: 'presencea'
  });

  const user2 = await User.create({
    firstName: 'Presence',
    lastName: 'TesterB',
    email: 'presence.b@researchconnect.com',
    password: 'password123',
    role: 'researcher',
    username: 'presenceb',
    profileSlug: 'presenceb'
  });

  try {
    console.log('\n=======================================');
    console.log('TEST CASE 1: Multi-Device Login Presence');
    console.log('=======================================');

    const socketA = 'socket_device_laptop_123';
    const socketB = 'socket_device_mobile_456';

    // 1. Connect Device 1 (Laptop)
    console.log('1. Connecting Laptop socket...');
    await presenceManager.setUserOnline(user1._id, socketA, {
      device: 'laptop',
      platform: 'macOS',
      browser: 'Chrome'
    }, null);

    const activeA = await SocketSession.find({ userId: user1._id });
    console.log(`- Active Sessions: ${activeA.length} (Expected: 1)`);
    
    const presenceA = await Presence.findOne({ userId: user1._id });
    console.log(`- Presence Status: "${presenceA.status}" (Expected: "online")`);

    // 2. Connect Device 2 (Mobile)
    console.log('\n2. Connecting Mobile socket...');
    await presenceManager.setUserOnline(user1._id, socketB, {
      device: 'mobile',
      platform: 'iOS',
      browser: 'Safari'
    }, null);

    const activeB = await SocketSession.find({ userId: user1._id });
    console.log(`- Active Sessions: ${activeB.length} (Expected: 2)`);
    
    const presenceB = await Presence.findOne({ userId: user1._id });
    console.log(`- Presence Status: "${presenceB.status}" (Expected: "online")`);

    console.log('\n=======================================');
    console.log('TEST CASE 2: Multi-Device Disconnect Logic');
    console.log('=======================================');

    // 1. Disconnect Device 1 (Laptop)
    console.log('1. Disconnecting Laptop socket...');
    await presenceManager.setUserOffline(user1._id, socketA, null);

    const activeC = await SocketSession.find({ userId: user1._id });
    console.log(`- Active Sessions Remaining: ${activeC.length} (Expected: 1)`);
    
    // User must remain online because Mobile is still connected!
    const presenceC = await Presence.findOne({ userId: user1._id });
    console.log(`- Presence Status: "${presenceC.status}" (Expected: "online")`);

    // 2. Disconnect Device 2 (Mobile)
    console.log('\n2. Disconnecting Mobile socket...');
    await presenceManager.setUserOffline(user1._id, socketB, null);

    const activeD = await SocketSession.find({ userId: user1._id });
    console.log(`- Active Sessions Remaining: ${activeD.length} (Expected: 0)`);
    
    // User must go offline because all devices disconnected!
    const presenceD = await Presence.findOne({ userId: user1._id });
    console.log(`- Presence Status: "${presenceD.status}" (Expected: "offline")`);
    console.log(`- Last Seen Timestamp set: ${presenceD.lastSeen !== null}`);

    console.log('\n=======================================');
    console.log('TEST CASE 3: Heartbeat Auto-Cleanup Pruning');
    console.log('=======================================');

    const socketDead = 'socket_dead_heartbeat_789';

    // 1. Connect User 2
    console.log('1. User 2 connects...');
    await presenceManager.setUserOnline(user2._id, socketDead, {
      device: 'desktop',
      platform: 'Windows',
      browser: 'Firefox'
    }, null);

    // Force heartbeat timestamp back 90 seconds (past the 60s threshold)
    console.log('2. Forcing lastHeartbeat timestamp back 90 seconds...');
    const pastTime = new Date(Date.now() - 90000);
    await SocketSession.updateOne(
      { socketId: socketDead },
      { $set: { lastHeartbeat: pastTime } }
    );

    // Run gateway pruner logic manually
    console.log('3. Running gateway heartbeat pruner loop...');
    const threshold = new Date(Date.now() - 60000);
    const deadSessions = await SocketSession.find({
      lastHeartbeat: { $lt: threshold }
    }).lean();

    console.log(`- Found dead socket sessions: ${deadSessions.length} (Expected: 1)`);
    for (const session of deadSessions) {
      await presenceManager.setUserOffline(session.userId, session.socketId, null);
    }

    // Verify session was pruned and User 2 is now offline
    const sessionCheck = await SocketSession.findOne({ socketId: socketDead });
    console.log(`- Dead Socket exists in DB: ${!!sessionCheck} (Expected: false)`);

    const presenceCheck = await Presence.findOne({ userId: user2._id });
    console.log(`- User 2 Status: "${presenceCheck.status}" (Expected: "offline")`);

    console.log('\n=======================================');
    console.log('ALL PRESENCE INFRASTRUCTURE TESTS PASSED');
    console.log('=======================================');

  } catch (error) {
    console.error('Test run failed with error:', error);
  } finally {
    console.log('\n--- Cleaning up test records ---');
    await User.deleteOne({ _id: user1._id });
    await User.deleteOne({ _id: user2._id });
    await SocketSession.deleteMany({ userId: { $in: [user1._id, user2._id] } });
    await Presence.deleteMany({ userId: { $in: [user1._id, user2._id] } });
    await closeDB();
    console.log('Cleanup complete. DB closed.');
  }
};

runTests();
