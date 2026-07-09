const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { connectDB } = require('../config/database/connection');
const publicationService = require('../modules/publication/service/publication.service');
const Publication = require('../models/Publication');
const User = require('../models/User');
const PublicationBookmark = require('../models/PublicationBookmark');
const PublicationEdit = require('../models/PublicationEdit');

// Pre-load all related schemas to prevent MissingSchemaError in standalone runs
require('../models/Follow');
require('../models/Bookmark');
require('../models/Project');
require('../models/Experience');
require('../models/Education');
require('../models/Skill');
require('../models/ActivityLog');
require('../models/Profile');

async function testPubActions() {
  await connectDB();
  console.log('Testing Publication Phase 2 Backend Updates...\n');

  try {
    const user = await User.findOne({ isDeleted: { $ne: true } });
    if (!user) {
      console.log('No user found to run test.');
      return;
    }
    console.log(`Using user: ${user.fullName} (${user.email})\n`);

    // Clean up any left-over test publications for clean slate
    await Publication.deleteMany({ title: /Test Action Pub/ });

    // 1. Create a few test publications
    console.log('--- 1. Creating test publications ---');
    const pub1 = await publicationService.createPublication(user._id, {
      title: 'Test Action Pub One - Neural Networks',
      publicationType: 'article',
      publicationFormat: 'article',
      doi: '10.1000/test.111111',
      abstract: 'Abstract for pub one on deep learning.',
      authorsList: [{ name: 'Author One', email: 'one@example.com', order: 0 }],
      visibility: 'Public'
    });
    console.log('Created Pub 1:', pub1.title, '| ID:', pub1._id);

    const pub2 = await publicationService.createPublication(user._id, {
      title: 'Test Action Pub Two - Quantum Computing',
      publicationType: 'conference-paper',
      publicationFormat: 'conference-paper',
      doi: '10.1000/test.222222',
      abstract: 'Abstract for pub two on quantum physics.',
      authorsList: [{ name: 'Author Two', email: 'two@example.com', order: 0 }],
      visibility: 'Private'
    }, true); // Created as Draft
    console.log('Created Pub 2 (Draft):', pub2.title, '| ID:', pub2._id);

    // 2. Test Search and Sorting
    console.log('\n--- 2. Testing search queries ---');
    const searchRes = await publicationService.getPublications({ userId: user._id }, { search: 'Neural Networks' });
    console.log('Search for "Neural Networks" found:', searchRes.docs.length, 'pubs (Expected: 1)');
    console.log('Found title:', searchRes.docs[0]?.title);

    // 3. Test Statistics Aggregation
    console.log('\n--- 3. Testing stats aggregation ---');
    const stats = await publicationService.getPublicationStats(user._id);
    console.log('Aggregated Stats:', stats);
    // Expected: totalPublications should be at least 2, drafts >= 1

    // 4. Test Bookmarking
    console.log('\n--- 4. Testing bookmark toggle ---');
    const bookmarkRes1 = await publicationService.toggleBookmark(user._id, pub1._id, 'AI Group');
    console.log('Bookmarked Pub 1:', bookmarkRes1);
    const hasBookmark = await PublicationBookmark.findOne({ userId: user._id, publicationId: pub1._id });
    console.log('Bookmark in DB:', hasBookmark ? 'FOUND in ' + hasBookmark.folder : 'NOT FOUND');

    const bookmarkRes2 = await publicationService.toggleBookmark(user._id, pub1._id);
    console.log('Toggled bookmark again (Remove):', bookmarkRes2);
    const deletedBookmark = await PublicationBookmark.findOne({ userId: user._id, publicationId: pub1._id });
    console.log('Bookmark in DB after toggle:', deletedBookmark ? 'STILL FOUND' : 'DELETED SUCCESS');

    // 5. Test Duplication
    console.log('\n--- 5. Testing publication duplication ---');
    const duplicated = await publicationService.duplicatePublication(pub1._id, user._id);
    console.log('Duplicated Pub title:', duplicated.title);
    console.log('Duplicated Pub status:', duplicated.status, '| Visibility:', duplicated.visibility);

    // 6. Test Edit Auditing
    console.log('\n--- 6. Testing update and edit auditing ---');
    const updated = await publicationService.updatePublication(pub1._id, user._id, {
      title: 'Test Action Pub One - Neural Networks UPDATED',
      abstract: 'Updated abstract content.'
    });
    console.log('Updated title:', updated.title);

    // Verify edit log entry
    const editLog = await PublicationEdit.findOne({ publicationId: pub1._id });
    if (editLog) {
      console.log('Edit audit log found!');
      console.log('- Edited Fields:', editLog.editedFields);
      console.log('- Previous Values:', editLog.previousValues);
      console.log('- New Values:', editLog.newValues);
    } else {
      console.error('FAIL: Edit audit log not created.');
    }

    // 7. Test Soft Delete & Restore
    console.log('\n--- 7. Testing soft delete and restore ---');
    await publicationService.deletePublication(pub1._id, user._id);
    const softDeletedPub = await Publication.findById(pub1._id);
    console.log('Soft deleted status in DB isDeleted:', softDeletedPub.isDeleted, '| DeletedAt:', softDeletedPub.deletedAt);

    await publicationService.restorePublication(pub1._id, user._id);
    const restoredPub = await Publication.findById(pub1._id);
    console.log('Restored status in DB isDeleted:', restoredPub.isDeleted);

    // 8. Test Bulk Actions
    console.log('\n--- 8. Testing bulk actions ---');
    const idsToBulk = [pub1._id, pub2._id];
    console.log('Updating visibility to Private for IDs:', idsToBulk);
    await publicationService.bulkAction(user._id, {
      action: 'update-visibility',
      ids: idsToBulk,
      visibility: 'Private'
    });

    const bulkVerify = await Publication.find({ _id: { $in: idsToBulk } });
    console.log('Visibility of Pub 1 after bulk:', bulkVerify.find(p => p._id.toString() === pub1._id.toString()).visibility);
    console.log('Visibility of Pub 2 after bulk:', bulkVerify.find(p => p._id.toString() === pub2._id.toString()).visibility);

    // Clean up
    console.log('\n--- 9. Cleaning up test artifacts ---');
    await Publication.deleteMany({ title: /Test Action Pub/ });
    await PublicationBookmark.deleteMany({ userId: user._id });
    await PublicationEdit.deleteMany({ userId: user._id });
    console.log('Cleanup completed successfully.');

  } catch (err) {
    console.error('FAIL: Test encountered error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

testPubActions();
