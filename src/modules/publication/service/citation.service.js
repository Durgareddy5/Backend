const Publication = require('../../../models/Publication');
const PublicationCitation = require('../../../models/PublicationCitation');
const { NotFoundError, ValidationError } = require('../../../common/errors/AppError');

// ─── Author Formatters ───────────────────────────────────────────────────────

/**
 * Parse authors string or array into [{lastName, firstName, fullName}]
 * Supports "First Last", "Last, First" comma-separated strings or array of objects
 */
const parseAuthors = (authorsInput) => {
  if (!authorsInput) return [];

  // If it's an array of objects (from PublicationAuthor sub-docs)
  if (Array.isArray(authorsInput)) {
    return authorsInput.map(a => {
      const name = typeof a === 'string' ? a : (a.name || '');
      const parts = name.trim().split(/\s+/);
      const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
      return { fullName: name, lastName, firstName };
    });
  }

  // If it's a string
  const rawString = String(authorsInput);
  return rawString.split(/,(?=[^,]*(?:,|$))/).map(name => {
    const trimmed = name.trim();
    // Handle "Last, First" format already split
    const parts = trimmed.split(/\s+/);
    const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    return { fullName: trimmed, lastName, firstName };
  }).filter(a => a.fullName);
};

/**
 * Format authors array for a given citation style
 */
const formatAuthorsForStyle = (authorsInput, style) => {
  const authors = parseAuthors(authorsInput);
  if (!authors.length) return 'Unknown Author(s)';

  switch (style) {
    case 'APA7':
    case 'APA6':
    case 'APA': {
      if (authors.length === 1) {
        const { lastName, firstName } = authors[0];
        return `${lastName}, ${firstName ? firstName.split(' ').map(n => n[0] + '.').join(' ') : ''}`.trimEnd();
      }
      if (authors.length <= 20) {
        const formatted = authors.map(({ lastName, firstName }) =>
          `${lastName}, ${firstName ? firstName.split(' ').map(n => n[0] + '.').join(' ') : ''}`.trimEnd()
        );
        return formatted.slice(0, -1).join(', ') + ', & ' + formatted[formatted.length - 1];
      }
      // 20+ authors: first 19 + ... + last author
      const first19 = authors.slice(0, 19).map(({ lastName, firstName }) =>
        `${lastName}, ${firstName ? firstName.split(' ').map(n => n[0] + '.').join(' ') : ''}`.trimEnd()
      );
      const lastAuthor = authors[authors.length - 1];
      return first19.join(', ') + ', . . . ' + `${lastAuthor.lastName}, ${lastAuthor.firstName ? lastAuthor.firstName[0] + '.' : ''}`;
    }

    case 'MLA': {
      if (authors.length === 1) {
        return `${authors[0].lastName}, ${authors[0].firstName}`;
      }
      if (authors.length === 2) {
        return `${authors[0].lastName}, ${authors[0].firstName}, and ${authors[1].firstName} ${authors[1].lastName}`;
      }
      return `${authors[0].lastName}, ${authors[0].firstName}, et al`;
    }

    case 'IEEE': {
      return authors.slice(0, 6).map(({ firstName, lastName }) =>
        `${firstName ? firstName.split(' ').map(n => n[0] + '.').join(' ') + ' ' : ''}${lastName}`
      ).join(', ') + (authors.length > 6 ? ' et al.' : '');
    }

    case 'Harvard': {
      if (authors.length === 1) {
        return `${authors[0].lastName}, ${authors[0].firstName ? authors[0].firstName[0] + '.' : ''}`;
      }
      return authors.map(({ lastName, firstName }) =>
        `${lastName}, ${firstName ? firstName[0] + '.' : ''}`
      ).join(', ');
    }

    case 'Chicago': {
      if (authors.length === 1) {
        return `${authors[0].lastName}, ${authors[0].firstName}`;
      }
      const first = authors[0];
      const rest = authors.slice(1).map(({ firstName, lastName }) => `${firstName} ${lastName}`);
      return `${first.lastName}, ${first.firstName}, ${rest.join(', ')}`;
    }

    case 'Vancouver': {
      return authors.slice(0, 6).map(({ lastName, firstName }) =>
        `${lastName} ${firstName ? firstName.split(' ').map(n => n[0]).join('') : ''}`
      ).join(', ') + (authors.length > 6 ? ', et al' : '');
    }

    case 'BibTeX':
    case 'RIS':
    case 'EndNote': {
      return authors.map(a => a.fullName).join(' and ');
    }

    default:
      return authors.map(a => a.fullName).join(', ');
  }
};

// ─── Citation Generators ─────────────────────────────────────────────────────

const generators = {
  APA7: (pub) => {
    const authors = formatAuthorsForStyle(pub.authorsList || pub.authors, 'APA7');
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'n.d.');
    const title = pub.title || 'Untitled';
    const journal = pub.journal || pub.publication || pub.conference || '';
    const volume = pub.volume ? `, ${pub.volume}` : '';
    const issue = pub.issue ? `(${pub.issue})` : '';
    const pages = pub.pages ? `, ${pub.pages}` : '';
    const doi = pub.doi ? ` https://doi.org/${pub.doi}` : (pub.paperURL ? ` ${pub.paperURL}` : '');
    return `${authors} (${year}). ${title}.${journal ? ` *${journal}*` : ''}${volume}${issue}${pages}.${doi}`;
  },

  APA6: (pub) => {
    const authors = formatAuthorsForStyle(pub.authorsList || pub.authors, 'APA6');
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'n.d.');
    const title = pub.title || 'Untitled';
    const journal = pub.journal || pub.publication || '';
    const volume = pub.volume ? `, ${pub.volume}` : '';
    const issue = pub.issue ? `(${pub.issue})` : '';
    const pages = pub.pages ? `, ${pub.pages}` : '';
    const doi = pub.doi ? ` doi:${pub.doi}` : '';
    return `${authors} (${year}). ${title}. ${journal}${volume}${issue}${pages}.${doi}`;
  },

  MLA: (pub) => {
    const authors = formatAuthorsForStyle(pub.authorsList || pub.authors, 'MLA');
    const title = `"${pub.title || 'Untitled'}"`;
    const journal = pub.journal || pub.publication || pub.conference || '';
    const volume = pub.volume ? `vol. ${pub.volume}` : '';
    const issue = pub.issue ? `no. ${pub.issue}` : '';
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'n.d.');
    const pages = pub.pages ? `pp. ${pub.pages}` : '';
    const doi = pub.doi ? `doi:${pub.doi}` : '';
    const venueInfo = [journal, volume, issue, year, pages, doi].filter(Boolean).join(', ');
    return `${authors}. ${title}. ${venueInfo}.`;
  },

  IEEE: (pub) => {
    const authors = formatAuthorsForStyle(pub.authorsList || pub.authors, 'IEEE');
    const title = `"${pub.title || 'Untitled'}"`;
    const journal = pub.journal || pub.publication || pub.conference || '';
    const volume = pub.volume ? `vol. ${pub.volume}` : '';
    const issue = pub.issue ? `no. ${pub.issue}` : '';
    const pages = pub.pages ? `pp. ${pub.pages}` : '';
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'n.d.');
    const doi = pub.doi ? `doi: ${pub.doi}` : '';
    const parts = [journal, volume, issue, pages, year, doi].filter(Boolean).join(', ');
    return `${authors}, ${title}, ${parts}.`;
  },

  Harvard: (pub) => {
    const authors = formatAuthorsForStyle(pub.authorsList || pub.authors, 'Harvard');
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'n.d.');
    const title = pub.title || 'Untitled';
    const journal = pub.journal || pub.publication || '';
    const volume = pub.volume ? `${pub.volume}` : '';
    const issue = pub.issue ? `(${pub.issue})` : '';
    const pages = pub.pages ? `pp. ${pub.pages}` : '';
    const doi = pub.doi ? `Available at: https://doi.org/${pub.doi}` : '';
    return `${authors}, ${year}. ${title}. ${journal}, ${volume}${issue}, ${pages}. ${doi}`.replace(/,\s*,/g, ',').trim();
  },

  Chicago: (pub) => {
    const authors = formatAuthorsForStyle(pub.authorsList || pub.authors, 'Chicago');
    const title = `"${pub.title || 'Untitled'}"`;
    const journal = pub.journal || pub.publication || pub.conference || '';
    const volume = pub.volume ? `${pub.volume}` : '';
    const issue = pub.issue ? `no. ${pub.issue}` : '';
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'n.d.');
    const pages = pub.pages ? `${pub.pages}` : '';
    const doi = pub.doi ? ` https://doi.org/${pub.doi}` : '';
    return `${authors}. ${title}. ${journal} ${volume}, ${issue} (${year}): ${pages}.${doi}`.replace(/\s+,/g, ',').trim();
  },

  Vancouver: (pub) => {
    const authors = formatAuthorsForStyle(pub.authorsList || pub.authors, 'Vancouver');
    const title = pub.title || 'Untitled';
    const journal = pub.journal || pub.publication || '';
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'n.d.');
    const volume = pub.volume ? `;${pub.volume}` : '';
    const issue = pub.issue ? `(${pub.issue})` : '';
    const pages = pub.pages ? `:${pub.pages}` : '';
    const doi = pub.doi ? ` doi: ${pub.doi}` : '';
    return `${authors}. ${title}. ${journal}.${year}${volume}${issue}${pages}.${doi}`;
  },

  BibTeX: (pub) => {
    const firstAuthor = parseAuthors(pub.authorsList || pub.authors)[0];
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : '0000');
    const key = `${(firstAuthor?.lastName || 'Author').replace(/\s/g, '')}${year}`;
    const authors = formatAuthorsForStyle(pub.authorsList || pub.authors, 'BibTeX');
    const type = pub.conference ? 'inproceedings' : 'article';
    const venueKey = pub.conference ? 'booktitle' : 'journal';
    const venue = pub.journal || pub.publication || pub.conference || 'Research Connect';
    return `@${type}{${key},
  author    = {${authors}},
  title     = {{${pub.title || 'Untitled'}}},
  ${venueKey}  = {${venue}},
  year      = {${year}},
  volume    = {${pub.volume || ''}},
  number    = {${pub.issue || ''}},
  pages     = {${pub.pages || ''}},
  publisher = {${pub.publisher || ''}},
  doi       = {${pub.doi || ''}},
  url       = {${pub.doi ? `https://doi.org/${pub.doi}` : (pub.paperURL || '')}}
}`;
  },

  RIS: (pub) => {
    const authors = parseAuthors(pub.authorsList || pub.authors);
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : '');
    const type = pub.conference ? 'CONF' : 'JOUR';
    const auLines = authors.map(a => `AU  - ${a.fullName}`).join('\n');
    return `TY  - ${type}
${auLines}
TI  - ${pub.title || 'Untitled'}
JO  - ${pub.journal || pub.publication || pub.conference || 'Research Connect'}
PY  - ${year}
VL  - ${pub.volume || ''}
IS  - ${pub.issue || ''}
SP  - ${(pub.pages || '').split('-')[0] || ''}
EP  - ${(pub.pages || '').split('-')[1] || ''}
PB  - ${pub.publisher || ''}
DO  - ${pub.doi || ''}
UR  - ${pub.doi ? `https://doi.org/${pub.doi}` : (pub.paperURL || '')}
ER  -`;
  },

  EndNote: (pub) => {
    const authors = parseAuthors(pub.authorsList || pub.authors);
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : '');
    const auLines = authors.map(a => `%A ${a.fullName}`).join('\n');
    return `%0 Journal Article
${auLines}
%T ${pub.title || 'Untitled'}
%J ${pub.journal || pub.publication || pub.conference || 'Research Connect'}
%D ${year}
%V ${pub.volume || ''}
%N ${pub.issue || ''}
%P ${pub.pages || ''}
%I ${pub.publisher || ''}
%R ${pub.doi || ''}
%U ${pub.doi ? `https://doi.org/${pub.doi}` : (pub.paperURL || '')}`;
  },

  RefWorks: (pub) => {
    const authors = parseAuthors(pub.authorsList || pub.authors);
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : '');
    const auLines = authors.map(a => `A1  - ${a.lastName}, ${a.firstName}`).join('\n');
    return `RT Journal Article
${auLines}
T1  ${pub.title || 'Untitled'}
JF  ${pub.journal || pub.publication || pub.conference || 'Research Connect'}
YR  ${year}
VO  ${pub.volume || ''}
IS  ${pub.issue || ''}
SP  ${pub.pages || ''}
PB  ${pub.publisher || ''}
DO  ${pub.doi || ''}
LK  ${pub.doi ? `https://doi.org/${pub.doi}` : (pub.paperURL || '')}`;
  },

  PlainText: (pub) => {
    const authors = parseAuthors(pub.authorsList || pub.authors).map(a => a.fullName).join(', ');
    const year = pub.year || (pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'n.d.');
    const journal = pub.journal || pub.publication || pub.conference || '';
    const doi = pub.doi ? `DOI: ${pub.doi}` : (pub.paperURL ? `URL: ${pub.paperURL}` : '');
    return [authors, `(${year})`, pub.title, journal, pub.volume, pub.pages, doi].filter(Boolean).join('. ');
  },
};

// Format key aliases
const FORMAT_MAP = {
  apa: 'APA7',
  apa7: 'APA7',
  apa6: 'APA6',
  mla: 'MLA',
  ieee: 'IEEE',
  harvard: 'Harvard',
  chicago: 'Chicago',
  vancouver: 'Vancouver',
  bibtex: 'BibTeX',
  ris: 'RIS',
  endnote: 'EndNote',
  refworks: 'RefWorks',
  plain: 'PlainText',
  text: 'PlainText',
};

class CitationService {
  /**
   * Fetch publication and generate all citation formats
   */
  async getAllCitations(publicationId) {
    const pub = await Publication.findById(publicationId)
      .select('title authors journal publication conference publisher year publicationDate doi volume issue pages abstract paperURL cloudinaryFileUrl authorsList publicationType keywords researchAreas institution openAccess')
      .populate('authorsList')
      .lean();

    if (!pub) throw new NotFoundError('Publication not found.');

    const all = {};
    for (const [key, generator] of Object.entries(generators)) {
      try {
        all[key] = generator(pub);
      } catch {
        all[key] = '';
      }
    }

    // Update lastGenerated timestamp
    await PublicationCitation.findOneAndUpdate(
      { publicationId },
      { $set: { lastGeneratedAt: new Date() } },
      { upsert: true }
    );

    return { publication: { id: pub._id, title: pub.title }, citations: all };
  }

  /**
   * Get a single citation format for a publication
   */
  async getCitationByFormat(publicationId, format) {
    const normalizedFormat = FORMAT_MAP[format?.toLowerCase()];
    if (!normalizedFormat) throw new ValidationError(`Unsupported citation format: ${format}`);

    const pub = await Publication.findById(publicationId)
      .select('title authors journal publication conference publisher year publicationDate doi volume issue pages paperURL authorsList publicationType')
      .lean();

    if (!pub) throw new NotFoundError('Publication not found.');

    const generator = generators[normalizedFormat];
    if (!generator) throw new ValidationError(`Citation generator not available for: ${format}`);

    return {
      format: normalizedFormat,
      citation: generator(pub),
      publicationId,
    };
  }

  /**
   * Track a citation event (copy/export/download)
   */
  async trackEvent(publicationId, format, eventType) {
    const normalizedFormat = (FORMAT_MAP[format?.toLowerCase()] || format || 'unknown').toLowerCase();
    const update = { $set: { lastGeneratedAt: new Date() } };

    if (eventType === 'copy') update.$inc = { copyCount: 1, [`formatBreakdown.${normalizedFormat}`]: 1 };
    else if (eventType === 'export') update.$inc = { exportCount: 1, [`formatBreakdown.${normalizedFormat}`]: 1 };
    else if (eventType === 'download') update.$inc = { downloadCount: 1, [`formatBreakdown.${normalizedFormat}`]: 1 };

    if (update.$inc) {
      await PublicationCitation.findOneAndUpdate(
        { publicationId },
        update,
        { upsert: true }
      );
    }
  }

  /**
   * Get citation stats for a publication
   */
  async getStats(publicationId) {
    const stats = await PublicationCitation.findOne({ publicationId }).lean();
    return stats || { publicationId, copyCount: 0, exportCount: 0, downloadCount: 0, formatBreakdown: {} };
  }
}

module.exports = new CitationService();
