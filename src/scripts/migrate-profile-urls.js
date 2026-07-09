require('dotenv').config();
const { connectDB, closeDB } = require('../config/database/connection');
const User = require('../models/User');
const { generateUniqueUsernameAndSlug } = require('../modules/profile/helper/username.helper');

const migrate = async () => {
  try {
    // 1. Connect to Database
    await connectDB();
    console.log('Connected to MongoDB. Scanning users for migration...');

    // 2. Fetch users missing public profile details
    const users = await User.find({
      $or: [
        { publicProfileId: { $exists: false } },
        { publicProfileId: '' },
        { profileSlug: { $exists: false } },
        { profileSlug: '' }
      ],
      isDeleted: { $ne: true }
    });

    console.log(`Found ${users.length} user records requiring migration.`);

    // 3. Process each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`Migrating user [${i + 1}/${users.length}]: ${user.firstName} ${user.lastName} (${user.email})`);

      const generated = await generateUniqueUsernameAndSlug(user.firstName, user.lastName);

      user.username = generated.username;
      user.publicProfileId = generated.publicProfileId;
      user.profileSlug = generated.profileSlug;
      user.profileUrl = generated.profileUrl;
      user.publicProfileUrl = `https://researchconnect.com${generated.profileUrl}`;

      // Bypass full validation to prevent pre-existing missing field checks from blocking migration
      await user.save({ validateBeforeSave: false });

      console.log(`  -> Username: ${user.username}`);
      console.log(`  -> Slug:     ${user.profileSlug}`);
      console.log(`  -> Profile:  ${user.profileUrl}`);
    }

    console.log('✅ Migration script finished successfully.');
  } catch (err) {
    console.error('❌ Migration failed with error:', err);
  } finally {
    // 4. Close DB connection
    await closeDB();
    console.log('Database connection closed.');
  }
};

migrate();
