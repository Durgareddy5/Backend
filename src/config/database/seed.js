require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../../common/logger/winston');
const { connectDB } = require('./connection');

// Import Models
const User = require('../../models/User');
const Profile = require('../../models/Profile');
const Settings = require('../../models/Settings');

const seedData = async () => {
  try {
    await connectDB();
    
    logger.info('Dropping existing database to clear legacy indexes...');
    await mongoose.connection.db.dropDatabase();
    logger.info('Database dropped. Beginning seed...');
    
    logger.info('Seeding default Admin and Researcher users...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Admin user
    const adminUser = await User.create({
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@researchconnect.org',
      password: hashedPassword,
      phone: '+15550199',
      role: 'admin',
      emailVerified: true,
      status: 'active',
      country: 'United States'
    });
    
    // Researcher user
    const researcherUser = await User.create({
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@university.edu',
      password: hashedPassword,
      phone: '+15550100',
      role: 'researcher',
      emailVerified: true,
      status: 'active',
      country: 'United Kingdom'
    });

    logger.info('Seeding Profiles...');
    const adminProfile = await Profile.create({
      userId: adminUser._id,
      bio: 'Platform System Administrator account for managing Research Connect configurations.',
      institution: 'Research Connect Labs',
      department: 'Infrastructure & DevOps',
      designation: 'Infrastructure Architect',
      organization: 'Research Connect NGO',
      profileCompletion: 80
    });

    const researcherProfile = await Profile.create({
      userId: researcherUser._id,
      bio: 'Associate Professor of Computer Science, studying Deep Learning, NLP, and AI Agents.',
      institution: 'Stanford University',
      department: 'Computer Science',
      designation: 'Associate Professor',
      organization: 'Stanford CS AI Labs',
      socialLinks: {
        orcid: '0000-0001-2345-6789',
        googleScholar: 'https://scholar.google.com/citations?user=alice_smith',
        linkedin: 'https://linkedin.com/in/alicesmith-cs',
        website: 'https://alicesmith.org'
      },
      profileCompletion: 90
    });

    logger.info('Seeding default settings...');
    await Settings.create({
      userId: adminUser._id,
      theme: 'dark',
      language: 'en',
      timezone: 'America/New_York'
    });

    await Settings.create({
      userId: researcherUser._id,
      theme: 'light',
      language: 'en',
      timezone: 'Europe/London'
    });

    logger.info('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
