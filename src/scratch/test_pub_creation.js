const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { connectDB } = require('../config/database/connection');
const publicationService = require('../modules/publication/service/publication.service');
const publicationController = require('../modules/publication/controller/publication.controller');
const Publication = require('../models/Publication');
const User = require('../models/User');

async function testPubCreation() {
  await connectDB();
  console.log('Testing Publication Phase 1 Backend Updates...');

  try {
    // 1. Test taxonomy endpoints
    console.log('\n--- 1. Testing controller getTypes & getFormats ---');
    const mockRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      success(message, data) {
        this.statusCode = 200;
        this.body = { success: true, message, data };
        return this;
      },
      error(message, error, code = 400) {
        this.statusCode = code;
        this.body = { success: false, message, error };
        return this;
      }
    };

    await publicationController.getTypes({}, mockRes);
    console.log('getTypes Response status:', mockRes.statusCode);
    console.log('getTypes Data length:', mockRes.body?.data?.length);
    console.log('First type item:', mockRes.body?.data?.[0]);

    await publicationController.getFormats({}, mockRes);
    console.log('getFormats Response status:', mockRes.statusCode);
    console.log('getFormats Data length:', mockRes.body?.data?.length);
    console.log('First format item:', mockRes.body?.data?.[0]);

    // 2. Test DOI pattern validation
    console.log('\n--- 2. Testing DOI validation ---');
    const validDOI = '10.1038/nature123';
    const invalidDOI = 'http://dx.doi.org/10.1038/nature123';
    
    // We can check if service throws or handles correctly
    // Let's find a user to act as creator
    const user = await User.findOne({ isDeleted: { $ne: true } });
    if (!user) {
      console.log('No user found to run creation test.');
      return;
    }
    
    console.log(`Using user ${user.email} as author/creator`);

    // Let's create publication with invalid DOI
    try {
      await publicationService.createPublication(user._id, {
        title: 'Test Pub Invalid DOI',
        publicationType: 'preprint',
        publicationFormat: 'preprint',
        doi: invalidDOI,
        authorsList: [{ name: 'Test Author', email: 'test@example.com', isCorresponding: true, order: 0 }]
      });
      console.error('FAIL: Creation succeeded with invalid DOI.');
    } catch (err) {
      console.log('SUCCESS: Creation failed with invalid DOI as expected:', err.message);
    }

    // Let's create publication with valid DOI & new schema fields
    console.log('\n--- 3. Testing successful creation with new schema fields ---');
    const newPub = await publicationService.createPublication(user._id, {
      title: 'Quantum Artificial Intelligence for Drug Discovery',
      publicationType: 'preprint',
      publicationFormat: 'preprint',
      doi: validDOI,
      license: 'CC BY 4.0',
      funding: 'National Science Foundation #98765',
      openAccess: true,
      fileDetails: {
        secure_url: 'https://cloudinary.com/test.pdf',
        public_id: 'test_pdf_id',
        resource_type: 'raw',
        bytes: 123456,
        format: 'pdf',
        pages: 12,
        asset_id: 'asset_id_999'
      },
      authorsList: [
        { name: 'Dr. Jane Doe', email: 'jane.doe@example.com', isCorresponding: true, order: 0 },
        { name: 'Dr. John Smith', email: 'john.smith@example.com', isCorresponding: false, order: 1 }
      ]
    });

    console.log('SUCCESS: Publication created with ID:', newPub._id);
    console.log('Saved Fields verification:');
    console.log('- Slug:', newPub.slug);
    console.log('- publicationFormat:', newPub.publicationFormat);
    console.log('- license:', newPub.license);
    console.log('- funding:', newPub.funding);
    console.log('- openAccess:', newPub.openAccess);
    console.log('- fileDetails.pages:', newPub.fileDetails?.pages);
    console.log('- fileDetails.asset_id:', newPub.fileDetails?.asset_id);

    // Clean up created test publication
    await Publication.deleteOne({ _id: newPub._id });
    console.log('\nCleaned up created test publication.');

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

testPubCreation();
