require('dotenv').config();
const { connectDB, closeDB } = require('../config/database/connection');
const followService = require('../modules/follow/service/follow.service');
const connectionsService = require('../modules/connections/service/connections.service');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Follow = require('../models/Follow');
const ConnectionRequest = require('../models/ConnectionRequest');
const Connection = require('../models/Connection');

const runTests = async () => {
  console.log('--- Connecting to database ---');
  await connectDB();

  // Create two temporary test users
  console.log('--- Creating test users ---');
  const user1 = await User.create({
    firstName: 'Test',
    lastName: 'One',
    email: 'test.one@researchconnect.com',
    password: 'password123',
    role: 'researcher',
    username: 'testone',
    profileSlug: 'testone'
  });

  const user2 = await User.create({
    firstName: 'Test',
    lastName: 'Two',
    email: 'test.two@researchconnect.com',
    password: 'password123',
    role: 'researcher',
    username: 'testtwo',
    profileSlug: 'testtwo'
  });

  console.log(`Created User 1: ${user1._id} (${user1.fullName})`);
  console.log(`Created User 2: ${user2._id} (${user2.fullName})`);

  // Ensure profiles exist
  await Profile.findOneAndUpdate({ userId: user1._id }, { userId: user1._id }, { upsert: true });
  await Profile.findOneAndUpdate({ userId: user2._id }, { userId: user2._id }, { upsert: true });

  try {
    console.log('\n=======================================');
    console.log('TEST CASE 1: Follow & Unfollow Flow');
    console.log('=======================================');

    // 1. Follow User 2
    console.log('1. User 1 following User 2...');
    await followService.follow(user1._id, user2._id);
    
    // Check relationship
    const isFollowing = await Follow.findOne({ followerId: user1._id, followingId: user2._id });
    console.log(`- Follow relation exists in DB: ${!!isFollowing}`);
    
    // Check counts
    const p1 = await Profile.findOne({ userId: user1._id });
    const p2 = await Profile.findOne({ userId: user2._id });
    console.log(`- User 1 followingCount: ${p1.followingCount} (Expected: 1)`);
    console.log(`- User 2 followersCount: ${p2.followersCount} (Expected: 1)`);

    // 2. Prevent Self-Follow
    console.log('\n2. Testing self-follow prevention...');
    try {
      await followService.follow(user1._id, user1._id);
      console.log('FAIL: Self-follow allowed.');
    } catch (err) {
      console.log(`PASS: Self-follow blocked. Error: ${err.message}`);
    }

    // 3. Prevent Duplicate Follow
    console.log('\n3. Testing duplicate follow prevention...');
    try {
      await followService.follow(user1._id, user2._id);
      console.log('FAIL: Duplicate follow allowed.');
    } catch (err) {
      console.log(`PASS: Duplicate follow blocked. Error: ${err.message}`);
    }

    // 4. Unfollow User 2
    console.log('\n4. User 1 unfollowing User 2...');
    await followService.unfollow(user1._id, user2._id);

    // Check relationship and counts
    const unfollowed = await Follow.findOne({ followerId: user1._id, followingId: user2._id });
    console.log(`- Follow relation exists in DB: ${!!unfollowed} (Expected: false)`);
    
    const p1_un = await Profile.findOne({ userId: user1._id });
    const p2_un = await Profile.findOne({ userId: user2._id });
    console.log(`- User 1 followingCount: ${p1_un.followingCount} (Expected: 0)`);
    console.log(`- User 2 followersCount: ${p2_un.followersCount} (Expected: 0)`);

    console.log('\n=======================================');
    console.log('TEST CASE 2: Connection Requests Flow');
    console.log('=======================================');

    // 1. Send Request
    console.log('1. User 1 sending connection request to User 2...');
    const req = await connectionsService.sendRequest(user1._id, user2._id, 'Hi, let\'s collaborate!');
    console.log(`- Request status: ${req.status} (Expected: pending)`);
    
    const p1_req = await Profile.findOne({ userId: user1._id });
    const p2_req = await Profile.findOne({ userId: user2._id });
    console.log(`- User 1 pendingSentCount: ${p1_req.pendingSentCount} (Expected: 1)`);
    console.log(`- User 2 pendingReceivedCount: ${p2_req.pendingReceivedCount} (Expected: 1)`);

    // 2. Accept Request
    console.log('\n2. User 2 accepting User 1 request...');
    await connectionsService.acceptRequest(req._id, user2._id);
    
    const conn = await Connection.findOne({
      $or: [
        { researcherA: user1._id, researcherB: user2._id },
        { researcherA: user2._id, researcherB: user1._id }
      ]
    });
    console.log(`- Connection exists in DB: ${!!conn}`);
    
    const p1_acc = await Profile.findOne({ userId: user1._id });
    const p2_acc = await Profile.findOne({ userId: user2._id });
    console.log(`- User 1 connectionsCount: ${p1_acc.connectionsCount} (Expected: 1)`);
    console.log(`- User 2 connectionsCount: ${p2_acc.connectionsCount} (Expected: 1)`);
    console.log(`- User 1 pendingSentCount: ${p1_acc.pendingSentCount} (Expected: 0)`);
    console.log(`- User 2 pendingReceivedCount: ${p2_acc.pendingReceivedCount} (Expected: 0)`);

    // 3. Remove Connection
    console.log('\n3. User 1 removing connection...');
    await connectionsService.removeConnection(conn._id, user1._id);
    
    const conn_rem = await Connection.findOne({ _id: conn._id });
    console.log(`- Connection exists in DB: ${!!conn_rem} (Expected: false)`);
    
    const p1_rem = await Profile.findOne({ userId: user1._id });
    const p2_rem = await Profile.findOne({ userId: user2._id });
    console.log(`- User 1 connectionsCount: ${p1_rem.connectionsCount} (Expected: 0)`);
    console.log(`- User 2 connectionsCount: ${p2_rem.connectionsCount} (Expected: 0)`);

    console.log('\n=======================================');
    console.log('TEST CASE 3: Opposite Request Acceptance');
    console.log('=======================================');

    // 1. Send Request from User 2 to User 1
    console.log('1. User 2 sending request to User 1...');
    const req2 = await connectionsService.sendRequest(user2._id, user1._id, 'Hello!');
    console.log(`- Request status: ${req2.status} (Expected: pending)`);

    // 2. User 1 sends request to User 2 (Opposite direction match)
    console.log('2. User 1 sending request back to User 2 (triggers auto-accept)...');
    const autoAcceptResult = await connectionsService.sendRequest(user1._id, user2._id);
    
    const autoReq = await ConnectionRequest.findById(req2._id);
    console.log(`- Original request status: ${autoReq.status} (Expected: accepted)`);
    
    const conn2 = await Connection.findOne({
      $or: [
        { researcherA: user1._id, researcherB: user2._id },
        { researcherA: user2._id, researcherB: user1._id }
      ]
    });
    console.log(`- Connection exists in DB: ${!!conn2}`);
    
    const p1_auto = await Profile.findOne({ userId: user1._id });
    const p2_auto = await Profile.findOne({ userId: user2._id });
    console.log(`- User 1 connectionsCount: ${p1_auto.connectionsCount} (Expected: 1)`);
    console.log(`- User 2 connectionsCount: ${p2_auto.connectionsCount} (Expected: 1)`);
    console.log(`- User 1 pendingReceivedCount: ${p1_auto.pendingReceivedCount} (Expected: 0)`);
    console.log(`- User 2 pendingSentCount: ${p2_auto.pendingSentCount} (Expected: 0)`);

    // Cleanup connection
    await Connection.deleteOne({ _id: conn2._id });
    await ConnectionRequest.deleteOne({ _id: req2._id });

    console.log('\n=======================================');
    console.log('ALL TEST CASES EXECUTED');
    console.log('=======================================');

  } catch (error) {
    console.error('Test run failed with error:', error);
  } finally {
    console.log('\n--- Cleaning up test records ---');
    await User.deleteOne({ _id: user1._id });
    await User.deleteOne({ _id: user2._id });
    await Profile.deleteOne({ userId: user1._id });
    await Profile.deleteOne({ userId: user2._id });
    await Follow.deleteOne({ followerId: user1._id, followingId: user2._id });
    await closeDB();
    console.log('Cleanup complete. DB closed.');
  }
};

runTests();
