const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../config/database/connection');
const { syncDatabaseIndexes } = require('../config/database/indexes');
const scholarService = require('../modules/scholar/service/scholar.service');
const serpApiService = require('../modules/scholar/service/serpapi.service');
const importQueueService = require('../modules/scholar/service/import-queue.service');
const User = require('../models/User');
const Profile = require('../models/Profile');
const GoogleScholarProfile = require('../models/GoogleScholarProfile');
const Publication = require('../models/Publication');
const CoAuthor = require('../models/CoAuthor');
const CitationGraph = require('../models/CitationGraph');
const Import = require('../models/Import');
const ImportLog = require('../models/ImportLog');

async function test() {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Database connected.');

  // Ensure correct indexes (drops old text index & recreates with language_override: 'none')
  console.log('Syncing database indexes...');
  await syncDatabaseIndexes();
  console.log('Indexes synced.');

  try {
    console.log('\n--- 1. Testing Scholar URL Validation & Extraction ---');
    const validUrl = 'https://scholar.google.com/citations?user=dqw4w9WgXcQ';
    const invalidUrl = 'https://google.com';
    console.log(`URL: ${validUrl} -> Valid? ${scholarService.validateScholarURL(validUrl)}`);
    console.log(`URL: ${invalidUrl} -> Valid? ${scholarService.validateScholarURL(invalidUrl)}`);
    console.log(`Extracted ID from ${validUrl}: ${scholarService.extractAuthorId(validUrl)}`);

    console.log('\n--- 2. Testing SerpAPI Service Mock Fallback ---');
    const authorId = 'dqw4w9WgXcQ';
    const details = await serpApiService.fetchAuthorDetails(authorId);
    console.log(`Author details retrieved! Name: ${details.author?.name}, Affiliation: ${details.author?.affiliation}`);
    console.log(`Citations count: ${details.cited_by?.table?.[0]?.citations?.all}`);
    console.log(`Initial articles count: ${details.articles?.length}`);
    console.log(`Co-authors count: ${details.co_authors?.length}`);

    console.log('\n--- 3. Testing Import Job Enqueuing & Processing ---');
    // Clean up any existing test profiles or colliding authorIds
    await GoogleScholarProfile.deleteMany({ authorId: 'dqw4w9WgXcQ' });

    // Retrieve a test user from database or create one
    let user = await User.findOne({ email: 'scholar.tester@researchconnect.org' });
    if (!user) {
      user = await User.create({
        firstName: 'Scholar',
        lastName: 'Tester',
        email: 'scholar.tester@researchconnect.org',
        password: 'password123',
        status: 'active',
        emailVerified: true
      });
      console.log('Test user created.');
    }

    let profile = await Profile.findOne({ userId: user._id });
    if (!profile) {
      profile = await Profile.create({
        userId: user._id,
        socialLinks: {
          googleScholar: validUrl,
          orcid: '0000-0002-1825-0097',
          linkedin: 'https://linkedin.com/in/scholar-tester'
        }
      });
      console.log('Test profile created.');
    } else {
      profile.socialLinks.googleScholar = validUrl;
      await profile.save();
    }

    console.log('Enqueuing import job...');
    const job = await scholarService.syncScholar(user._id);
    console.log(`Job enqueued. ID: ${job._id}, Status: ${job.status}`);

    console.log('Waiting for job to complete...');
    let jobStatus = await Import.findById(job._id);
    while (jobStatus.status === 'pending' || jobStatus.status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 500));
      jobStatus = await Import.findById(job._id);
    }
    console.log(`Job finished with status: ${jobStatus.status}, Progress: ${jobStatus.progress}%`);

    console.log('\n--- 4. Checking Database Insertions ---');
    const dbProfile = await GoogleScholarProfile.findOne({ userId: user._id });
    console.log(`Google Scholar profile saved? ${!!dbProfile}`);
    if (dbProfile) {
      console.log(`Name: ${dbProfile.name}, Interests: ${dbProfile.researchInterests.join(', ')}`);
    }

    const pubsCount = await Publication.countDocuments({ userId: user._id });
    console.log(`Publications saved count: ${pubsCount}`);

    const coAuthorsCount = await CoAuthor.countDocuments({ userId: user._id });
    console.log(`Co-authors saved count: ${coAuthorsCount}`);

    const graphCount = await CitationGraph.countDocuments({ userId: user._id });
    console.log(`Citation graph years count: ${graphCount}`);

    const logs = await ImportLog.find({ importId: job._id }).sort({ timestamp: 1 });
    console.log(`Job logs written: ${logs.length}`);
    for (const log of logs) {
      console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
    }

    // Wait 2 seconds for async tasks to finish completely
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cleanup test data
    console.log('\nCleaning up test user details...');
    await GoogleScholarProfile.deleteMany({ userId: user._id });
    await Publication.deleteMany({ userId: user._id });
    await CoAuthor.deleteMany({ userId: user._id });
    await CitationGraph.deleteMany({ userId: user._id });
    await Import.deleteMany({ userId: user._id });
    await ImportLog.deleteMany({ userId: user._id });
    await Profile.deleteMany({ userId: user._id });
    await User.deleteMany({ _id: user._id });
    console.log('Cleanup completed.');

    console.log('\nALL TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

test();
