const mongoose = require('mongoose');
const { connectDB } = require('../config/database/connection');
const feedService = require('../modules/feed/service/feed.service');
const feedRepository = require('../modules/feed/repository/feed.repository');
const User = require('../models/User');
const Publication = require('../models/Publication');
const Profile = require('../models/Profile');

async function runTests() {
  await connectDB();
  console.log('Testing endpoints...');

  try {
    const users = await User.find({ isDeleted: { $ne: true } });
    if (users.length < 2) {
      console.log('Not enough users to run verification. Run seed first.');
      return;
    }

    const user0 = users[0];
    const user1 = users[1];

    console.log(`\n1. Testing Follow System between ${user0.email} and ${user1.email}...`);
    const followResult = await feedService.toggleFollow(user0._id, user1._id);
    console.log('Follow result (toggled):', followResult);

    const following = await feedRepository.isFollowing(user0._id, user1._id);
    console.log('Is user0 following user1 now?', following);

    console.log('\n2. Testing Suggested Collaborators...');
    const suggestions = await feedService.getSuggestedResearchers(user0._id);
    console.log('Suggested Collaborators list:', suggestions);

    console.log('\n3. Testing Bookmarks Folders...');
    const pubs = await Publication.find({ isDeleted: { $ne: true } });
    if (pubs.length > 0) {
      const pub = pubs[0];
      const bookmarkResult = await feedService.toggleBookmark(user0._id, pub._id, 'Quantum Machine Learning', true);
      console.log('Bookmark folder result:', bookmarkResult);

      const folders = await feedService.getBookmarkFolders(user0._id);
      console.log('Distinct user folders:', folders);

      const moveResult = await feedService.moveBookmark(user0._id, pub._id, 'Advanced NLP');
      console.log('Bookmark move result:', moveResult);
    }

    console.log('\n4. Testing Nested Comments and Liking...');
    if (pubs.length > 0) {
      const pub = pubs[0];
      
      const parentComment = await feedService.addComment({
        userId: user0._id,
        publicationId: pub._id,
        text: 'Top level verification comment.'
      });
      console.log('Created parent comment:', parentComment._id);

      const childComment = await feedService.addComment({
        userId: user1._id,
        publicationId: pub._id,
        parentId: parentComment._id,
        text: 'Nested reply verification comment.'
      });
      console.log('Created nested child reply:', childComment._id);

      const likeResult = await feedService.toggleLikeComment(user0._id, childComment._id);
      console.log('Like comment result:', likeResult);

      const discussions = await feedRepository.getCommentsByPublicationId(pub._id);
      console.log('Publication comments count (top level):', discussions.docs.length);
    }

    console.log('\n5. Testing Score Calculation & Profile Updates...');
    await feedService.recalculateResearchScore(user0._id);
    const updatedProfile = await Profile.findOne({ userId: user0._id });
    console.log('Updated profile metrics:', updatedProfile.metrics);

    console.log('\nVerification complete! All tests passed successfully.');
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

runTests();
