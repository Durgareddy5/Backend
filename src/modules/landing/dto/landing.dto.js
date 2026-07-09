class LandingDTO {
  formatHealth(healthData) {
    return {
      status: healthData.status,
      uptime: `${Math.floor(healthData.uptime)}s`,
      timestamp: healthData.timestamp
    };
  }

  formatDatabase(dbData) {
    return {
      databaseStatus: dbData.status,
      connectionState: dbData.details.status,
      poolSize: dbData.details.poolSize,
      activeConnections: dbData.details.activeConnections
    };
  }

  formatStats(statsData) {
    return {
      researchersCount: statsData.researchers,
      universitiesCount: statsData.universities,
      publicationsCount: statsData.publications,
      countriesCount: statsData.countries
    };
  }

  formatCategories(categories) {
    return categories.map(cat => ({
      categoryId: cat.id,
      categoryName: cat.name,
      papersCount: cat.count,
      categoryIcon: cat.icon
    }));
  }

  formatFeatures(features) {
    return features.map(feat => ({
      featureId: feat.id,
      title: feat.title,
      description: feat.description,
      isComingSoon: feat.comingSoon
    }));
  }
}

module.exports = new LandingDTO();
