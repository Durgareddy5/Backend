class PublicationDTO {
  formatPublication(pub) {
    if (!pub) return null;
    const pubObj = typeof pub.toObject === 'function' ? pub.toObject() : pub;
    return {
      id: pubObj._id,
      userId: pubObj.userId,
      ownerId: pubObj.ownerId,
      slug: pubObj.slug,
      title: pubObj.title,
      subtitle: pubObj.subtitle || '',
      authors: pubObj.authors || '',
      authorsList: pubObj.authorsList || [],
      publication: pubObj.publication || '',
      journal: pubObj.journal || '',
      conference: pubObj.conference || '',
      publisher: pubObj.publisher || '',
      year: pubObj.year,
      publicationDate: pubObj.publicationDate,
      doi: pubObj.doi || '',
      isbn: pubObj.isbn || '',
      issn: pubObj.issn || '',
      volume: pubObj.volume || '',
      issue: pubObj.issue || '',
      pages: pubObj.pages || '',
      abstract: pubObj.abstract || '',
      keywords: pubObj.keywords || [],
      keywordsList: pubObj.keywordsList || [],
      researchAreas: pubObj.researchAreas || [],
      researchAreasList: pubObj.researchAreasList || [],
      publicationType: pubObj.publicationType,
      publicationFormat: pubObj.publicationFormat || '',
      researchType: pubObj.researchType || '',
      correspondingAuthor: pubObj.correspondingAuthor || '',
      institution: pubObj.institution || '',
      department: pubObj.department || '',
      language: pubObj.language || '',
      visibility: pubObj.visibility,
      status: pubObj.status,
      cloudinaryFileUrl: pubObj.cloudinaryFileUrl || pubObj.pdfURL || '',
      files: pubObj.files || [],
      thumbnail: pubObj.thumbnail || '',
      views: pubObj.views || 0,
      downloads: pubObj.downloads || 0,
      readingTime: pubObj.readingTime || 5,
      researchScore: pubObj.researchScore || 0,
      metrics: pubObj.metrics || null,
      publicationCode: pubObj.publicationCode || '',
      createdAt: pubObj.createdAt,
      updatedAt: pubObj.updatedAt
    };
  }

  formatPublicationList(pubs = []) {
    return pubs.map(pub => this.formatPublication(pub));
  }
}

module.exports = new PublicationDTO();
