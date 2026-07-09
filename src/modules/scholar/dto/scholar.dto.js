class ScholarDTO {
  formatProfile(profile) {
    if (!profile) return null;
    return {
      id: profile._id,
      authorId: profile.authorId,
      profileURL: profile.profileURL,
      name: profile.name,
      affiliation: profile.affiliation,
      verifiedEmail: profile.verifiedEmail,
      profileImage: profile.profileImage,
      researchInterests: profile.researchInterests || [],
      totalCitations: profile.totalCitations || 0,
      hIndex: profile.hIndex || 0,
      i10Index: profile.i10Index || 0,
      verified: profile.verified || false,
      lastImportedAt: profile.lastImportedAt,
      syncStatus: profile.syncStatus
    };
  }

  formatPublication(pub) {
    if (!pub) return null;
    return {
      id: pub._id,
      title: pub.title,
      authors: pub.authors,
      publication: pub.publication,
      year: pub.year,
      citations: pub.citations,
      citationId: pub.citationId,
      paperURL: pub.paperURL,
      pdfURL: pub.pdfURL,
      publisher: pub.publisher,
      publicationType: pub.publicationType,
      doi: pub.doi,
      volume: pub.volume,
      issue: pub.issue,
      pages: pub.pages,
      abstract: pub.abstract,
      keywords: pub.keywords || []
    };
  }

  formatPublications(result) {
    if (!result) return { docs: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    return {
      docs: result.docs.map(p => this.formatPublication(p)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    };
  }

  formatCoAuthor(co) {
    if (!co) return null;
    return {
      id: co._id,
      authorId: co.authorId,
      name: co.name,
      affiliation: co.affiliation,
      email: co.email,
      photo: co.photo,
      profileURL: co.profileURL
    };
  }

  formatCoAuthors(coauthors) {
    if (!coauthors) return [];
    return coauthors.map(c => this.formatCoAuthor(c));
  }

  formatCitations(citations) {
    if (!citations) return [];
    return citations.map(c => ({
      year: c.year,
      citations: c.citations
    }));
  }
}

module.exports = new ScholarDTO();
