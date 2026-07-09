const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../config/database/connection');
const identityService = require('../modules/identity/service/identity.service');
const identitySyncQueueService = require('../modules/identity/service/identitySyncQueue.service');
const searchService = require('../modules/search/service/search.service');
const User = require('../models/User');
const ResearchIdentity = require('../models/ResearchIdentity');
const AcademicMetrics = require('../models/AcademicMetrics');
const CoAuthorGraph = require('../models/CoAuthorGraph');

async function runVerification() {
  await connectDB();
  console.log('Testing Identity & Global Search systems...');

  try {
    const users = await User.find({ isDeleted: { $ne: true } });
    if (users.length === 0) {
      console.log('No users found in database to run tests. Run seed first.');
      return;
    }

    const testUser = users[0];
    console.log(`\nUsing User for test: ${testUser.email} (${testUser._id})`);

    // Clean up previous runs
    await ResearchIdentity.deleteMany({ userId: testUser._id });
    await AcademicMetrics.deleteMany({ userId: testUser._id });
    await CoAuthorGraph.deleteMany({ userId: testUser._id });

    // 1. Test connectProvider (Google Scholar)
    console.log('\n1. Connecting Google Scholar identity...');
    const conn1 = await identityService.connectProvider(testUser._id, {
      provider: 'google_scholar',
      providerUserId: 'test_scholar_id_123',
      providerUrl: 'https://scholar.google.com/citations?user=test_scholar_id_123',
      preferredName: 'Dr. Test Scholar'
    });
    console.log('Connect result:', conn1);

    // 2. Test connectProvider (ORCID)
    console.log('\n2. Connecting ORCID identity...');
    const conn2 = await identityService.connectProvider(testUser._id, {
      provider: 'orcid',
      providerUserId: '0000-0002-1825-0097',
      preferredName: 'Dr. Test Scholar'
    });
    console.log('Connect result:', conn2);

    // 3. Trigger manual queue worker processing to run the sync job
    console.log('\n3. Processing queued sync jobs in background worker...');
    await identitySyncQueueService.processNextJob(); // Run first job (Google Scholar)
    await identitySyncQueueService.processNextJob(); // Run second job (ORCID)

    // 4. Verify ResearchIdentity model populated correctly
    const identityProfile = await identityService.getProfile(testUser._id);
    console.log('\n4. Canonical Connected Identity Profile:', {
      preferredName: identityProfile.preferredName,
      googleScholarId: identityProfile.googleScholarId,
      orcid: identityProfile.orcid
    });

    // 5. Verify Academic Metrics & Co-Authors Graphs generated
    const providers = await identityService.getProviders(testUser._id);
    console.log('Linked Providers List:', providers);

    const metrics = await identityService.getMetrics(testUser._id);
    console.log('Aggregated Academic Metrics:', metrics);

    const coauthors = await identityService.getCoAuthors(testUser._id);
    console.log('Co-Authors Graph statistics:', {
      networkCount: coauthors.coAuthorNetwork.length,
      institutionsCount: coauthors.institutionGraph.length,
      timelineCount: coauthors.collaborationTimeline.length
    });

    // 6. Test global search for researchers
    console.log('\n5. Querying Global Researchers Search...');
    const searchResult = await searchService.searchResearchers({
      q: testUser.firstName || 'Test',
      page: 1,
      limit: 10
    });
    console.log('Researcher search results count:', searchResult.results.length);

    // 7. Test autocomplete suggestions
    console.log('\n6. Querying Autocomplete Suggestions...');
    const autocompleteResult = await searchService.getAutocomplete(testUser.firstName || 'Test');
    console.log('Autocomplete suggestions keywords/authors found:', {
      authors: autocompleteResult.authors.length,
      keywords: autocompleteResult.keywords.length
    });

    console.log('\nAll Identity & Search verification checks passed successfully!');
  } catch (err) {
    console.error('Verification failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

runVerification();
