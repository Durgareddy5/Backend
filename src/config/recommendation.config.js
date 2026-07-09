module.exports = {
  weights: {
    researchAreas: parseFloat(process.env.WEIGHT_RESEARCH_AREAS) || 0.30,
    keywords: parseFloat(process.env.WEIGHT_KEYWORDS) || 0.25,
    publications: parseFloat(process.env.WEIGHT_PUBLICATIONS) || 0.15,
    institution: parseFloat(process.env.WEIGHT_INSTITUTION) || 0.10,
    connections: parseFloat(process.env.WEIGHT_CONNECTIONS) || 0.10,
    coAuthors: parseFloat(process.env.WEIGHT_COAUTHORS) || 0.05,
    activity: parseFloat(process.env.WEIGHT_ACTIVITY) || 0.05
  }
};
