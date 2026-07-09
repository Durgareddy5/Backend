require('dotenv').config();
const { connectDB, closeDB } = require('../config/database/connection');
const User = require('../models/User');
const { generateUniqueUsernameAndSlug } = require('../modules/profile/helper/username.helper');

const test = async () => {
  try {
    await connectDB();
    console.log('Testing Username and Slug Generation...');

    // 1. Clean up potential old test users
    await User.deleteMany({ $or: [{ email: /@test-slugs\.com$/ }, { username: 'sushil-kumar' }] });

    // 2. Test User 1 (no collision)
    console.log('\n--- Test 1: First Sushil Kumar Registration ---');
    const result1 = await generateUniqueUsernameAndSlug('Sushil', 'Kumar');
    console.log('Result 1:', result1);
    
    if (result1.username !== 'sushil-kumar') {
      throw new Error(`Expected username to be 'sushil-kumar', got '${result1.username}'`);
    }
    if (!result1.publicProfileId.startsWith('rc_') || result1.publicProfileId.length !== 9) {
      throw new Error(`Invalid publicProfileId format: '${result1.publicProfileId}'`);
    }
    if (result1.profileSlug !== `sushil-kumar-${result1.publicProfileId}`) {
      throw new Error(`Expected profileSlug to be 'sushil-kumar-${result1.publicProfileId}', got '${result1.profileSlug}'`);
    }

    // Save mock User 1 to database to trigger collision for next test
    await User.create({
      firstName: 'Sushil',
      lastName: 'Kumar',
      email: 'sushil1@test-slugs.com',
      password: 'password123',
      role: 'researcher',
      status: 'active',
      username: result1.username,
      publicProfileId: result1.publicProfileId,
      profileSlug: result1.profileSlug,
      profileUrl: result1.profileUrl
    });
    console.log('Saved User 1 to database.');

    // 3. Test User 2 (collision on 'sushil-kumar')
    console.log('\n--- Test 2: Second Sushil Kumar Registration (Collision) ---');
    const result2 = await generateUniqueUsernameAndSlug('Sushil', 'Kumar');
    console.log('Result 2:', result2);

    if (!result2.username.startsWith('sushil-kumar-rc_') || result2.username.length !== 22) {
      throw new Error(`Expected username to contain suffix (e.g. sushil-kumar-rc_XXXXXX), got '${result2.username}'`);
    }
    if (result2.profileSlug !== result2.username) {
      throw new Error(`Expected profileSlug to match username, got '${result2.profileSlug}'`);
    }
    if (result2.profileUrl !== `/profile/${result2.profileSlug}`) {
      throw new Error(`Expected profileUrl to be '/profile/${result2.profileSlug}', got '${result2.profileUrl}'`);
    }

    console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    console.error(err);
  } finally {
    await User.deleteMany({ email: /@test-slugs\.com$/ });
    await closeDB();
  }
};

test();
