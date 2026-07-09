const landingRepository = require('../repository/landing.repository');
const { checkHealth } = require('../../../config/database/connection');

class LandingService {
  async getHealth() {
    return {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  async getDatabaseHealth() {
    const dbHealth = checkHealth();
    return {
      status: dbHealth.isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      details: dbHealth
    };
  }

  async getStats() {
    return await landingRepository.getPlatformStats();
  }

  async getCategories() {
    return [
      { id: 'cs', name: 'Computer Science', count: 4250, icon: 'Cpu' },
      { id: 'math', name: 'Mathematics', count: 1820, icon: 'Binary' },
      { id: 'physics', name: 'Physics', count: 2980, icon: 'Atom' },
      { id: 'bio', name: 'Biology & Life Sciences', count: 3410, icon: 'Dna' },
      { id: 'med', name: 'Medicine & Healthcare', count: 4120, icon: 'HeartPulse' },
      { id: 'chem', name: 'Chemistry', count: 1890, icon: 'FlaskConical' }
    ];
  }

  async getFeatures() {
    return [
      {
        id: 'discovery',
        title: 'Research Discovery',
        description: 'Discover relevant research articles and preprints semantically parsed with AI.',
        comingSoon: false
      },
      {
        id: 'collaboration',
        title: 'Research Collaboration',
        description: 'Connect with co-authors, share private workspace drafts, and cooperate on publications.',
        comingSoon: false
      },
      {
        id: 'publications',
        title: 'Publication Management',
        description: 'Upload, manage, and index your academic publications easily on a single profile.',
        comingSoon: false
      },
      {
        id: 'ai-recs',
        title: 'AI Recommendation',
        description: 'Get automated, personalized recommendations of research items matching your expertise.',
        comingSoon: false
      },
      {
        id: 'analytics',
        title: 'Research Analytics',
        description: 'Track citation counts, reads, profile views, and index metrics over time.',
        comingSoon: false
      },
      {
        id: 'scholar-integration',
        title: 'Google Scholar Integration',
        description: 'Sync your publications and citation statistics from Google Scholar automatically.',
        comingSoon: true
      }
    ];
  }

  async getVersion() {
    return {
      version: '1.0.0',
      phase: 0,
      phaseName: 'Foundation & Project Setup'
    };
  }
}

module.exports = new LandingService();
