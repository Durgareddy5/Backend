const mongoose = require('mongoose');
const { connectDB } = require('../config/database/connection');
const User = require('../models/User');
const Publication = require('../models/Publication');
const ResearchQuestion = require('../models/ResearchQuestion');
const Project = require('../models/Project');
const Event = require('../models/Event');
const Profile = require('../models/Profile');
const CoAuthor = require('../models/CoAuthor');
const Follow = require('../models/Follow');
const Dataset = require('../models/Dataset');
const Comment = require('../models/Comment');
const Bookmark = require('../models/Bookmark');
const Like = require('../models/Like');

async function seed() {
  await connectDB();
  console.log('Database connected successfully for expanded seeding.');

  try {
    // 1. Get or Create Users
    let users = await User.find({ isDeleted: { $ne: true } });
    if (users.length === 0) {
      console.log('No users found in database. Creating mock users...');
      const mockUsers = [
        {
          firstName: 'Sarah',
          lastName: 'Jenkins',
          email: 'sarah.jenkins@university.edu',
          password: 'password123',
          role: 'researcher',
          researcherType: 'academic',
          status: 'active',
          emailVerified: true,
          profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          country: 'United States'
        },
        {
          firstName: 'David',
          lastName: 'Chen',
          email: 'david.chen@institute.org',
          password: 'password123',
          role: 'researcher',
          researcherType: 'corporate',
          status: 'active',
          emailVerified: true,
          profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          country: 'Canada'
        },
        {
          firstName: 'Elena',
          lastName: 'Rostova',
          email: 'elena.rostova@academy.de',
          password: 'password123',
          role: 'researcher',
          researcherType: 'academic',
          status: 'active',
          emailVerified: true,
          profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
          country: 'Germany'
        }
      ];
      users = await User.insertMany(mockUsers);
      console.log(`Created ${users.length} mock users.`);
    }

    const userIds = users.map(u => u._id);

    // 2. Ensure Profiles exist
    for (const user of users) {
      const existingProfile = await Profile.findOne({ userId: user._id });
      if (!existingProfile) {
        console.log(`Creating profile for ${user.fullName || (user.firstName + ' ' + user.lastName)}...`);
        await Profile.create({
          userId: user._id,
          bio: `Lead researcher specializing in cutting edge methodologies.`,
          institution: user.email.includes('university') ? 'Stanford University' : 'MIT',
          department: 'Computer Science & AI Lab',
          designation: 'Associate Professor',
          country: user.country,
          profileImage: user.profileImage,
          skills: [
            { name: 'Machine Learning', category: 'ML' },
            { name: 'Artificial Intelligence', category: 'AI' },
            { name: 'Data Science', category: 'Research' }
          ],
          metrics: {
            totalCitations: Math.floor(Math.random() * 500) + 100,
            hIndex: Math.floor(Math.random() * 20) + 5,
            i10Index: Math.floor(Math.random() * 40) + 10,
            patentsCount: Math.floor(Math.random() * 3),
            booksCount: Math.floor(Math.random() * 2),
            viewsCount: Math.floor(Math.random() * 5000),
            downloadsCount: Math.floor(Math.random() * 1200),
            researchScore: Math.floor(Math.random() * 95) + 5
          },
          profileCompletion: 80
        });
      }
    }

    // 3. Clear existing feed components
    await Promise.all([
      Publication.deleteMany({}),
      ResearchQuestion.deleteMany({}),
      Project.deleteMany({}),
      Event.deleteMany({}),
      CoAuthor.deleteMany({}),
      Follow.deleteMany({}),
      Dataset.deleteMany({}),
      Comment.deleteMany({}),
      Bookmark.deleteMany({}),
      Like.deleteMany({})
    ]);
    console.log('Cleared all previous collections.');

    // 4. Seed Follow relationships
    console.log('Seeding follows...');
    await Follow.insertMany([
      { followerId: userIds[0], followingId: userIds[1] },
      { followerId: userIds[0], followingId: userIds[2] },
      { followerId: userIds[1], followingId: userIds[0] }
    ]);

    // 5. Seed Co-Authors
    const coauthorsSeed = [];
    for (let i = 0; i < users.length; i++) {
      const otherUser = users[(i + 1) % users.length];
      coauthorsSeed.push({
        userId: users[i]._id,
        name: otherUser.fullName || `${otherUser.firstName} ${otherUser.lastName}`.trim(),
        affiliation: otherUser.email.includes('university') ? 'Stanford University' : 'MIT',
        authorId: `author_${otherUser._id}`,
        profileURL: 'https://scholar.google.com'
      });
    }
    await CoAuthor.insertMany(coauthorsSeed);

    // 6. Seed Publications (with full AI Analysis metadata)
    console.log('Seeding publications...');
    const publications = [
      {
        userId: userIds[0],
        title: 'Attention Is All You Need for Deep Multi-Modal Search Optimization',
        authors: 'Sarah Jenkins, David Chen',
        publication: 'Journal of Artificial Intelligence Research (JAIR)',
        journal: 'JAIR',
        publisher: 'AI Access Foundation',
        year: 2025,
        citations: 184,
        views: 2450,
        downloads: 820,
        readingTime: 6,
        researchScore: 92,
        paperURL: 'https://arxiv.org/abs/1706.03762',
        pdfURL: 'https://arxiv.org/pdf/1706.03762.pdf',
        doi: '10.1613/jair.1.12345',
        abstract: 'In this paper, we present a novel neural architecture designed for semantic search across diverse multi-modal libraries. We show that self-attention mechanisms outperform traditional convolutions by 14% on benchmark datasets.',
        keywords: ['Artificial Intelligence', 'Machine Learning', 'Natural Language Processing'],
        aiAnalysis: {
          summary: 'This research proposes a new search engine methodology that combines text summaries, citations, and images using attention networks.',
          researchGap: 'Prior search methods only lookup literal keyword tokens and miss semantic connections.',
          futureWork: 'Apply this model to real-time academic feeds to improve citation maps.',
          methodology: 'Constructed an attention encoder-decoder architecture with 8 parallel attention heads.',
          keyFindings: 'Increased search recall rates by 14% while reducing computation latency by 28%.',
          noveltyScore: 8,
          difficultyLevel: 'Advanced'
        }
      },
      {
        userId: userIds[1],
        title: 'Quantum Advantage in Generative Adversarial Networks for Molecule Design',
        authors: 'David Chen, Elena Rostova',
        publication: 'Nature Computational Science',
        journal: 'Nature Comp. Sci.',
        publisher: 'Nature Publishing Group',
        year: 2026,
        citations: 42,
        views: 1200,
        downloads: 410,
        readingTime: 8,
        researchScore: 88,
        paperURL: 'https://nature.com/articles/comp-sci-2026',
        pdfURL: 'https://nature.com/pdf/comp-sci-2026.pdf',
        doi: '10.1038/s43588-026-0001',
        abstract: 'Generative chemistry stands to benefit immensely from quantum computing. Here, we present a hybrid quantum-classical GAN that designs viable drug compounds in 20% of the steps required by classical models.',
        keywords: ['Quantum Computing', 'Machine Learning', 'Drug Discovery'],
        aiAnalysis: {
          summary: 'A hybrid classical-quantum generative network to design drug molecules.',
          researchGap: 'Classical drug design has high computational search spaces.',
          futureWork: 'Validate molecule compounds in real laboratory in-vitro studies.',
          methodology: 'Superconducting quantum bits joined with classical gradient optimization.',
          keyFindings: 'Requires 80% fewer training loops to find candidates.',
          noveltyScore: 9,
          difficultyLevel: 'Hard'
        }
      },
      {
        userId: userIds[2],
        title: 'Socio-Technical Implications of Large Language Models in Academic Peer Review',
        authors: 'Elena Rostova, Sarah Jenkins',
        publication: 'IEEE Transactions on Software Engineering',
        journal: 'IEEE TSE',
        publisher: 'IEEE',
        year: 2025,
        citations: 96,
        views: 1890,
        downloads: 580,
        readingTime: 5,
        researchScore: 78,
        paperURL: 'https://ieeexplore.ieee.org/document/123456',
        doi: '10.1109/TSE.2025.123',
        abstract: 'Academic publishing faces challenges regarding review quality and volume. We investigate how AI-assisted peer review tools affect human expert assessments, discovering significant biases in automated evaluations.',
        keywords: ['Natural Language Processing', 'Human-Computer Interaction', 'Software Engineering'],
        aiAnalysis: {
          summary: 'Investigates human bias when assisted by generative models in paper reviewing.',
          researchGap: 'Prior studies focused solely on LLM writing quality rather than cognitive reviewer bias.',
          futureWork: 'Analyze blind study reviews using different model prompts.',
          methodology: 'Double-blind cohort study of 120 academic reviewers.',
          keyFindings: 'Reviewers accept AI recommendations 68% of the time, even when flawed.',
          noveltyScore: 7,
          difficultyLevel: 'Intermediate'
        }
      }
    ];
    const seededPubs = await Publication.insertMany(publications);

    // 7. Seed Nested Comments
    console.log('Seeding nested comments...');
    const parentComment = await Comment.create({
      userId: userIds[1],
      publicationId: seededPubs[0]._id,
      text: 'This methodology represents a big step forward. How does it handle mathematical symbols?'
    });

    const reply1 = await Comment.create({
      userId: userIds[0],
      publicationId: seededPubs[0]._id,
      parentId: parentComment._id,
      text: 'Good question. We parse LaTeX syntax into a token format before feeding it into the attention encoder.'
    });

    const subReply = await Comment.create({
      userId: userIds[1],
      publicationId: seededPubs[0]._id,
      parentId: reply1._id,
      text: 'Thanks! That LaTeX pre-tokenization trick makes sense.'
    });

    // 8. Seed Datasets
    console.log('Seeding datasets...');
    await Dataset.insertMany([
      {
        userId: userIds[0],
        title: 'Saccadic Eye Movement Parkinson Assessment Dataset (120 Patients)',
        description: 'Raw high-frequency video capture of saccadic eye tracking parameters from Parkinson patients and controls.',
        url: 'https://data.researchconnect.org/parkinsons-eye',
        size: '14.5 GB',
        format: 'HDF5',
        downloads: 240,
        views: 1100
      },
      {
        userId: userIds[2],
        title: 'Academic LLM Review Cohort Questionnaire Responses',
        description: 'Anonymized survey results and feedback logs from our cohort testing AI peer reviews.',
        url: 'https://data.researchconnect.org/llm-reviews',
        size: '12 MB',
        format: 'CSV',
        downloads: 84,
        views: 310
      }
    ]);

    // 9. Seed Research Questions
    console.log('Seeding research questions...');
    await ResearchQuestion.insertMany([
      {
        userId: userIds[1],
        title: 'What are the current limitations of quantum error correction in NISQ era machines?',
        description: 'I am researching chemical synthesis simulations on 50-100 qubit machines and running into severe noise decoherence issues.',
        researchAreas: ['Quantum Computing', 'Biomedical Engineering'],
        answers: [
          {
            userId: userIds[0],
            text: 'We recently tested ZNE compilation and it worked well.'
          }
        ]
      }
    ]);

    // 10. Seed Projects
    console.log('Seeding projects...');
    await Project.insertMany([
      {
        userId: userIds[0],
        title: 'AcuITY: AI-Driven Eye-Tracking for Neurodegenerative Assessment',
        description: 'Building a cross-platform mobile application utilizing standard cameras and deep learning.',
        status: 'Ongoing',
        collaborators: [userIds[1]],
        researchAreas: ['Artificial Intelligence', 'Neuroscience']
      }
    ]);

    // 11. Seed Events
    console.log('Seeding events...');
    await Event.insertMany([
      {
        title: 'NeurIPS 2026 (Annual Conference on Neural Information Processing Systems)',
        description: 'The premier conference on machine learning and computational neuroscience.',
        type: 'Conference',
        date: new Date('2026-12-07T09:00:00.000Z'),
        link: 'https://neurips.cc',
        organization: 'NeurIPS Foundation'
      }
    ]);

    console.log('All collections successfully populated!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

seed();
