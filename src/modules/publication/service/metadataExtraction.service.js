/**
 * Metadata Extraction Service
 * ============================
 * Multi-library extraction pipeline for academic research papers.
 *
 * Extraction Pipeline:
 *   Upload â†’ Detect MIME â†’ pdf-parse (FIXED) â†’ pdf2json â†’ pdfreader â†’ OCR â†’ Extract â†’ Confidence Score â†’ Auto-Fill
 *
 * CRITICAL FIX: pdf-parse v2.x exports a DEFAULT ASYNC FUNCTION, not a class.
 *   WRONG: const { PDFParse } = require('pdf-parse'); new PDFParse(buf);
 *   RIGHT: const pdfParse = require('pdf-parse'); await pdfParse(buffer);
 *
 * Supported file types: PDF, DOCX, DOC, RTF, TXT
 * Extracted fields: title, subtitle, abstract, authors, affiliations, emails,
 *   ORCID, DOI, keywords, journal, conference, publisher, year, pages, volume,
 *   issue, references, funding, license, copyright, corresponding author,
 *   running header, language, ISBN, ISSN, research areas.
 */

const PDFParser = require('pdf2json');
const { PdfReader } = require('pdfreader');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const natural = require('natural');
const stopword = require('stopword');
const logger = require('../../../common/logger/winston');

const log = logger || console;

// â”€â”€ Research Area Taxonomy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TAXONOMY = {
  'Artificial Intelligence': ['artificial intelligence', 'ai', 'intelligent agent', 'heuristics', 'cognitive science', 'reasoning', 'expert system'],
  'Machine Learning': ['machine learning', 'supervised', 'unsupervised', 'reinforcement learning', 'classification', 'regression', 'clustering', 'random forest', 'svm', 'decision tree', 'xgboost', 'gradient boosting'],
  'Deep Learning': ['deep learning', 'neural network', 'cnn', 'rnn', 'lstm', 'transformer', 'backpropagation', 'gan', 'autoencoder', 'resnet', 'bert', 'gpt', 'llm', 'diffusion model', 'vision transformer'],
  'Natural Language Processing': ['nlp', 'natural language', 'text mining', 'sentiment analysis', 'tokenization', 'pos tagging', 'named entity recognition', 'ner', 'translation', 'word2vec', 'language model', 'text classification'],
  'Computer Vision': ['computer vision', 'image processing', 'object detection', 'segmentation', 'ocr', 'facial recognition', 'opencv', 'image classification', 'yolo', 'feature extraction'],
  'Cyber Security': ['cyber security', 'cryptography', 'encryption', 'firewall', 'malware', 'phishing', 'vulnerability', 'penetration testing', 'intrusion detection', 'ransomware', 'zero day'],
  'Robotics': ['robotics', 'robot', 'automation', 'kinematics', 'actuator', 'sensor fusion', 'ros', 'path planning', 'manipulator', 'drone', 'autonomous vehicle'],
  'Blockchain': ['blockchain', 'smart contract', 'cryptocurrency', 'bitcoin', 'ethereum', 'distributed ledger', 'consensus algorithm', 'solidity', 'defi', 'nft'],
  'Cloud Computing': ['cloud computing', 'aws', 'azure', 'serverless', 'virtualization', 'saas', 'paas', 'iaas', 'kubernetes', 'docker', 'cloud native', 'microservice'],
  'Healthcare': ['healthcare', 'medical', 'clinical', 'patient', 'electronic health record', 'ehr', 'diagnostics', 'telemedicine', 'therapeutics', 'radiology', 'genomics', 'drug discovery'],
  'IoT': ['iot', 'internet of things', 'smart home', 'sensor network', 'embedded system', 'rfid', 'edge computing', 'actuators', 'wearable'],
  'Bioinformatics': ['bioinformatics', 'genomics', 'sequencing', 'protein folding', 'dna', 'rna', 'alignment', 'phylogenetic', 'proteomics', 'metabolomics'],
  'Algorithms': ['algorithm', 'sorting', 'complexity', 'graph theory', 'data structure', 'optimization', 'dynamic programming', 'computability', 'approximation algorithm'],
  'Data Science': ['data science', 'data analysis', 'visualization', 'pandas', 'numpy', 'statistics', 'exploratory data analysis', 'feature engineering', 'data pipeline'],
  'Quantum Computing': ['quantum computing', 'qubit', 'quantum algorithm', 'quantum entanglement', 'superposition', 'quantum gate', 'qiskit'],
  'Networking': ['networking', 'tcp/ip', '5g', 'wireless', 'protocol', 'bandwidth', 'latency', 'routing', 'packet', 'network architecture'],
  'Databases': ['database', 'sql', 'nosql', 'mongodb', 'postgresql', 'query optimization', 'transaction', 'acid', 'data warehouse', 'olap']
};

// Known academic publishers for detection
const KNOWN_PUBLISHERS = [
  'springer', 'ieee', 'acm', 'elsevier', 'nature', 'science', 'mdpi', 'wiley',
  'taylor & francis', 'taylor and francis', 'oxford university press', 'cambridge university press',
  'sage', 'plos', 'frontiers', 'hindawi', 'emerald', 'informs', 'aaai', 'neurips',
  'icml', 'cvpr', 'iccv', 'eccv', 'emnlp', 'acl', 'naacl', 'arxiv', 'biorxiv', 'ssrn'
];

class MetadataExtractionService {

  /**
   * Main entry point to extract metadata from file buffer.
   * Returns structured extraction result with per-field confidence scores.
   *
   * @param {Buffer} fileBuffer
   * @param {string} originalName
   * @param {string} mimeType
   * @returns {Promise<object>}
   */
  async extractMetadata(fileBuffer, originalName, mimeType) {
    const extractionStart = Date.now();
    const ext = originalName ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : '';
    let text = '';
    let pdfMetadata = {};
    let methodUsed = 'none';
    let methodAttempts = [];

    try {
      const isPDF = ext === '.pdf' || mimeType === 'application/pdf';
      const isDOCX = ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isDOC = ext === '.doc' || mimeType === 'application/msword';
      const isRTF = ext === '.rtf' || mimeType === 'application/rtf';
      const isTXT = ext === '.txt' || mimeType === 'text/plain';

      if (isPDF && fileBuffer) {
        // â”€â”€ Priority 1: pdf-parse (FIXED: default export, async function) â”€â”€
        try {
          log.info('[METADATA EXTRACTION] Attempting pdf-parse...');
          const parsed = await this._parsePdfParse(fileBuffer);
          text = parsed.text || '';
          pdfMetadata = parsed.metadata || {};
          methodUsed = 'pdf-parse';
          methodAttempts.push({ method: 'pdf-parse', status: 'success', textLength: text.trim().length });
          log.info(`[METADATA EXTRACTION] pdf-parse: extracted ${text.trim().length} chars`);
        } catch (e) {
          methodAttempts.push({ method: 'pdf-parse', status: 'failed', error: e.message });
          log.warn('[METADATA EXTRACTION] pdf-parse failed: ' + e.message);
        }

        // â”€â”€ Priority 2: pdf2json (if pdf-parse yielded < 150 chars) â”€â”€
        if (text.trim().length < 150) {
          try {
            log.info('[METADATA EXTRACTION] Attempting pdf2json...');
            const parsed = await this._parsePdf2Json(fileBuffer);
            text = parsed.text || text;
            pdfMetadata = { ...pdfMetadata, ...parsed.metadata };
            methodUsed = 'pdf2json';
            methodAttempts.push({ method: 'pdf2json', status: 'success', textLength: text.trim().length });
            log.info(`[METADATA EXTRACTION] pdf2json: extracted ${text.trim().length} chars`);
          } catch (e) {
            methodAttempts.push({ method: 'pdf2json', status: 'failed', error: e.message });
            log.warn('[METADATA EXTRACTION] pdf2json failed: ' + e.message);
          }
        }

        // â”€â”€ Priority 3: pdfreader (if still < 150 chars) â”€â”€
        if (text.trim().length < 150) {
          try {
            log.info('[METADATA EXTRACTION] Attempting pdfreader...');
            const parsed = await this._parsePdfReader(fileBuffer);
            text = parsed.text || text;
            methodUsed = 'pdfreader';
            methodAttempts.push({ method: 'pdfreader', status: 'success', textLength: text.trim().length });
            log.info(`[METADATA EXTRACTION] pdfreader: extracted ${text.trim().length} chars`);
          } catch (e) {
            methodAttempts.push({ method: 'pdfreader', status: 'failed', error: e.message });
            log.warn('[METADATA EXTRACTION] pdfreader failed: ' + e.message);
          }
        }

        // â”€â”€ Priority 4: Tesseract OCR (scanned PDF fallback) â”€â”€
        if (text.trim().length < 150) {
          log.warn('[METADATA EXTRACTION] Scanned PDF detected â€” running Tesseract OCR...');
          try {
            const ocrText = await this._runOcrOnPdf(fileBuffer);
            if (ocrText && ocrText.trim().length > 50) {
              text = ocrText;
              methodUsed = 'tesseract-ocr';
              methodAttempts.push({ method: 'tesseract-ocr', status: 'success', textLength: text.trim().length });
              log.info(`[METADATA EXTRACTION] OCR: extracted ${text.trim().length} chars`);
            }
          } catch (ocrErr) {
            methodAttempts.push({ method: 'tesseract-ocr', status: 'failed', error: ocrErr.message });
            log.error('[METADATA EXTRACTION] OCR failed: ' + ocrErr.message);
          }
        }

      } else if (isDOCX && fileBuffer) {
        text = await this._parseDocx(fileBuffer);
        methodUsed = 'mammoth';
        methodAttempts.push({ method: 'mammoth', status: 'success', textLength: text.length });

      } else if ((isDOC || isRTF) && fileBuffer) {
        // mammoth can handle DOC/RTF in many cases
        try {
          text = await this._parseDocx(fileBuffer);
          methodUsed = 'mammoth';
          methodAttempts.push({ method: 'mammoth-doc', status: 'success', textLength: text.length });
        } catch (e) {
          // Fallback to raw text extraction
          text = fileBuffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
          methodUsed = 'raw-text';
          methodAttempts.push({ method: 'raw-text-fallback', status: 'partial' });
        }

      } else if (isTXT && fileBuffer) {
        text = fileBuffer.toString('utf8');
        methodUsed = 'text';
        methodAttempts.push({ method: 'plain-text', status: 'success', textLength: text.length });
      }

    } catch (parseError) {
      log.error('[METADATA EXTRACTION] Outer parse exception: ' + parseError.message);
      methodAttempts.push({ method: 'outer', status: 'exception', error: parseError.message });
    }

    // â”€â”€ Text Normalization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const cleanedText = this._cleanText(text);

    // â”€â”€ Field Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const extracted = this._extractFields(cleanedText, pdfMetadata, originalName);

    // â”€â”€ Keyword Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const keywordsInfo = this._extractKeywords(cleanedText);
    extracted.keywords = { value: keywordsInfo.keywords, confidence: keywordsInfo.confidence };

    // â”€â”€ Research Area Matching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const areasInfo = this._matchResearchAreas(keywordsInfo.keywords, cleanedText);
    extracted.researchAreas = { value: areasInfo.areas, confidence: areasInfo.confidence };

    // â”€â”€ Confidence Score Map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const confidenceScores = {
      title: extracted.title?.confidence || 0,
      abstract: extracted.abstract?.confidence || 0,
      authors: extracted.authorsList?.confidence || 0,
      doi: extracted.doi?.confidence || 0,
      journal: extracted.journal?.confidence || 0,
      keywords: extracted.keywords?.confidence || 0,
      year: extracted.year?.confidence || 0,
      pages: extracted.pages?.confidence || 0,
      publisher: extracted.publisher?.confidence || 0,
      language: extracted.language?.confidence || 0,
      conference: extracted.conference?.confidence || 0,
      funding: extracted.funding?.confidence || 0,
      references: extracted.references?.confidence || 0
    };

    const extractionDurationMs = Date.now() - extractionStart;

    log.info('[METADATA EXTRACTION] Complete', {
      method: methodUsed,
      textLength: cleanedText.length,
      durationMs: extractionDurationMs,
      confidenceScores
    });

    return {
      ...extracted,
      methodUsed,
      methodAttempts,
      confidenceScores,
      textLength: cleanedText.length,
      extractionDurationMs
    };
  }

  // ── Parser: pdf-parse (FIXED API) ──────────────────────────────────────────
  /**
   * Uses pdf-parse v2.x.
   */
  async _parsePdfParse(buffer) {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse(new Uint8Array(buffer));
    const textData = await parser.getText();
    const infoData = await parser.getInfo();
    return {
      text: textData.text || '',
      metadata: {
        Title: infoData.info?.Title || '',
        Author: infoData.info?.Author || '',
        Subject: infoData.info?.Subject || '',
        Keywords: infoData.info?.Keywords || '',
        Creator: infoData.info?.Creator || '',
        Producer: infoData.info?.Producer || '',
        CreationDate: infoData.info?.CreationDate || '',
        numpages: infoData.total || 0
      }
    };
  }

  // â”€â”€ Parser: pdf2json â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _parsePdf2Json(buffer) {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on('pdfParser_dataError', errData => reject(new Error(String(errData.parserError))));
      pdfParser.on('pdfParser_dataReady', pdfData => {
        let text = '';
        try {
          (pdfData.Pages || []).forEach(page => {
            (page.Texts || []).forEach(t => {
              let decoded = '';
              try { decoded = decodeURIComponent(t.R[0].T); }
              catch (e) {
                try { decoded = unescape(t.R[0].T); }
                catch (e2) { decoded = t.R[0].T || ''; }
              }
              text += decoded + ' ';
            });
            text += '\n';
          });
        } catch (e) {}
        resolve({ text, metadata: pdfData.Meta || {} });
      });
      pdfParser.parseBuffer(buffer);
    });
  }

  // â”€â”€ Parser: pdfreader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _parsePdfReader(buffer) {
    return new Promise((resolve, reject) => {
      let text = '';
      let lastY = null;
      new PdfReader().parseBuffer(buffer, (err, item) => {
        if (err) return reject(err);
        if (!item) return resolve({ text });
        if (item.text) {
          // Insert line break when Y position changes significantly (new line)
          if (lastY !== null && Math.abs(item.y - lastY) > 0.5) {
            text += '\n';
          }
          text += item.text + ' ';
          lastY = item.y;
        }
      });
    });
  }

  // â”€â”€ Parser: mammoth (DOCX/DOC) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async _parseDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  // â”€â”€ OCR: Tesseract (scanned PDFs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async _runOcrOnPdf(buffer) {
    const images = [];
    let pos = 0;

    // Extract JPEG images from PDF stream (DCTDecode = JPEG compression)
    while (images.length < 3) {
      const idx = buffer.indexOf('DCTDecode', pos);
      if (idx === -1) break;
      const streamStart = buffer.indexOf('stream', idx);
      if (streamStart === -1) break;
      let start = streamStart + 6;
      if (buffer[start] === 13) start++;
      if (buffer[start] === 10) start++;
      const streamEnd = buffer.indexOf('endstream', start);
      if (streamEnd === -1) break;
      const imgBuffer = buffer.subarray(start, streamEnd);
      if (imgBuffer.length > 10000) images.push(imgBuffer);
      pos = streamEnd;
    }

    if (images.length === 0) {
      log.warn('[OCR] No DCTDecode JPEG images found in PDF â€” likely vector PDF, not scanned');
      return '';
    }

    log.info(`[OCR] Running Tesseract on ${images.length} extracted image(s)...`);

    // Run OCR on first page image with 15s timeout
    const ocrPromise = Tesseract.recognize(images[0], 'eng', { logger: () => {} })
      .then(result => result.data.text || '');

    return await Promise.race([
      ocrPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('OCR Timeout (15s)')), 15000))
    ]);
  }

  // â”€â”€ Text Cleaning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _cleanText(text) {
    if (!text) return '';
    let cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // Remove page numbers and headers
    cleaned = cleaned.replace(/^\s*(page|pg\.?)\s*\d+\s*(of\s*\d+)?\s*$/gim, '');
    cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');

    // Remove non-printable characters but keep Unicode letters
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize whitespace
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/-\n([a-z])/g, '$1'); // Join hyphenated line breaks

    return cleaned.trim();
  }

  // â”€â”€ Field Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _extractFields(text, info = {}, originalName = '') {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const firstLines = lines.slice(0, 30);
    const textLower = text.toLowerCase();

    // â”€â”€ 1. DOI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let doi = '';
    let doiConfidence = 0;
    const doiRegex = /\b(10\.\d{4,9}\/[-._;()\/:A-Z0-9]+)\b/i;
    const doiMatch = text.match(doiRegex);
    if (doiMatch) {
      doi = doiMatch[1].replace(/[.,;]$/, ''); // strip trailing punctuation
      doiConfidence = 100;
    }

    // â”€â”€ 2. Title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let title = '';
    let titleConfidence = 0;

    // Priority A: PDF metadata info.Title
    if (info.Title && info.Title.trim() && info.Title.trim().length > 10
        && !/untitled|pdf|document/i.test(info.Title)) {
      title = info.Title.trim();
      titleConfidence = 95;
    }

    // Priority B: Heuristic from first lines
    if (!title || titleConfidence < 80) {
      const candidates = firstLines.filter(line => {
        if (line.length < 15 || line.length > 250) return false;
        if (/http|www\.|@|isbn|issn|doi:/i.test(line)) return false;
        if (/volume|issue|pages|proceedings|editor|conference|journal/i.test(line)) return false;
        if (/copyright|Â©|\d{4}\s+(ieee|acm|springer|elsevier)/i.test(line)) return false;
        if (/^\d+$/.test(line)) return false;
        return true;
      });
      if (candidates.length > 0) {
        title = candidates[0];
        titleConfidence = 80;
      }
    }

    // Priority C: Fallback to first non-empty line
    if (!title && firstLines.length > 0) {
      title = firstLines[0].substring(0, 200);
      titleConfidence = 55;
    }

    // Priority D: Use filename
    if (!title && originalName) {
      title = originalName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
      titleConfidence = 30;
    }

    if (!title) {
      title = 'Untitled Research Paper';
      titleConfidence = 5;
    }

    // â”€â”€ 3. Subtitle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let subtitle = '';
    let subtitleConfidence = 0;
    // Check if title contains a colon â€” split into title + subtitle
    const colonIdx = title.indexOf(':');
    if (colonIdx > 10 && colonIdx < title.length - 5) {
      subtitle = title.substring(colonIdx + 1).trim();
      title = title.substring(0, colonIdx).trim();
      subtitleConfidence = 70;
    }

    // â”€â”€ 4. Abstract â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let abstract = '';
    let abstractConfidence = 0;
    const abstractMatch = text.match(/\b(?:abstract|summary)\b[\s\n:â€”]*([\s\S]{50,2500}?)(?=\n\n|\b(?:introduction|1\.\s+introduction|keywords?|key\s+words|index\s+terms|1\s+introduction)\b)/i);
    if (abstractMatch) {
      abstract = abstractMatch[1].replace(/\s+/g, ' ').trim();
      abstractConfidence = 92;
    } else {
      // Fallback: extract a decent text block from the middle-top of the document
      const textBlock = firstLines.slice(5, 20).join(' ');
      if (textBlock.length > 100) {
        abstract = textBlock.substring(0, 600).trim();
        abstractConfidence = 45;
      }
    }

    // â”€â”€ 5. Authors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let authors = [];
    let authorsConfidence = 0;
    let affiliations = [];
    let correspondingAuthor = '';

    // Priority A: PDF metadata Author field
    if (info.Author && info.Author.trim().length > 3 && !/pdf/i.test(info.Author)) {
      const rawAuthors = info.Author.trim();
      authors = rawAuthors.split(/[,;]|\band\b/).map(n => n.trim()).filter(Boolean);
      authorsConfidence = 90;
    }

    // Priority B: Heuristic (line after title)
    if (authors.length === 0) {
      const titleLineIdx = firstLines.findIndex(l =>
        l.length > 10 && (l.includes(title.substring(0, 20)) || title.includes(l.substring(0, 20)))
      );
      const authorLine = firstLines[titleLineIdx + 1] || firstLines[1] || '';
      if (authorLine && authorLine.length > 5 && authorLine.length < 300
          && !/abstract|keywords|doi|issn|isbn|journal|proceedings/i.test(authorLine)
          && !/^\d+$/.test(authorLine)) {
        authors = authorLine.split(/[,;]|\band\b|&/).map(n => n.trim()).filter(n => n.length > 2);
        authorsConfidence = authors.length > 0 ? 70 : 0;
      }
    }

    // Extract affiliations (lines with university/institute/department patterns)
    const affiliationRegex = /(?:university|college|institute|department|faculty|school|laboratory|lab|center|centre)\s+of\s+[\w\s,]+/gi;
    const affiliationMatches = text.match(affiliationRegex) || [];
    affiliations = [...new Set(affiliationMatches.map(a => a.trim()).slice(0, 5))];

    // Corresponding author
    const corrAuthorMatch = text.match(/corresponding\s+author[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i);
    if (corrAuthorMatch) {
      correspondingAuthor = corrAuthorMatch[1];
    }

    // â”€â”€ 6. Emails & ORCID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const emails = [];
    const emailRegex = /\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/gi;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      const email = match[0].toLowerCase();
      if (!emails.includes(email)) emails.push(email);
    }

    const orcids = [];
    const orcidRegex = /\b(\d{4}-\d{4}-\d{4}-\d{3}[\dX])\b/gi;
    while ((match = orcidRegex.exec(text)) !== null) {
      if (!orcids.includes(match[1])) orcids.push(match[1]);
    }

    // â”€â”€ 7. ISBN & ISSN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let isbn = '';
    const isbnMatch = text.match(/(?:ISBN(?:-13)?[\s:]?)((?:[0-9]{3}[-\s]?)?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9][-\s]?[0-9X])/i);
    if (isbnMatch) isbn = isbnMatch[1].replace(/[\s-]/g, '');

    let issn = '';
    const issnMatch = text.match(/(?:ISSN[\s:]?)(\d{4}-\d{3}[\dX])/i);
    if (issnMatch) issn = issnMatch[1];

    // â”€â”€ 8. Publication Year â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let year = new Date().getFullYear();
    let yearConfidence = 10;

    if (info.CreationDate) {
      const yearStr = info.CreationDate.match(/\d{4}/);
      if (yearStr) { year = parseInt(yearStr[0]); yearConfidence = 90; }
    }

    if (yearConfidence < 90) {
      // Look for copyright year or publication year in first 20 lines
      for (const line of firstLines) {
        const m = line.match(/Â©\s*((?:19|20)\d{2})|(?:19|20)\d{2}/);
        if (m) {
          year = parseInt(m[0].replace(/[^\d]/g, '').substring(0, 4));
          yearConfidence = 80;
          break;
        }
      }
    }

    // â”€â”€ 9. Journal / Conference / Publisher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let journal = '';
    let journalConfidence = 0;
    let conference = '';
    let conferenceConfidence = 0;
    let publisher = '';
    let publisherConfidence = 0;

    // Journal patterns
    const journalPatterns = [
      /(?:published\s+in|appears?\s+in|journal\s+of|transactions?\s+on|letters?\s+on|annals?\s+of|reviews?\s+of|advances?\s+in)\s+([\w\s]+(?:journal|transactions?|letters?|reviews?|annals?|proceedings?)?)/i,
      /(?:journal|transactions?|letters?|reviews?|annals?)\s+of\s+([\w\s]+)/i
    ];
    for (const p of journalPatterns) {
      const m = text.match(p);
      if (m) {
        journal = m[0].trim().replace(/\s+/g, ' ');
        journalConfidence = 85;
        break;
      }
    }

    // Conference patterns
    const confPatterns = [
      /(?:proceedings|proc\.)\s+(?:of\s+)?(?:the\s+)?(\d{4}\s+)?([A-Z][A-Za-z\s]{5,60}(?:conference|symposium|workshop|congress|summit|meeting))/i,
      /(?:in|at)\s+the\s+(\d{4}\s+)?([A-Z][A-Za-z\s]{5,60}(?:conference|symposium|workshop))/i
    ];
    for (const p of confPatterns) {
      const m = text.match(p);
      if (m) {
        conference = m[0].trim().replace(/\s+/g, ' ');
        conferenceConfidence = 80;
        break;
      }
    }

    // Publisher detection
    for (const pub of KNOWN_PUBLISHERS) {
      const pubRegex = new RegExp(`\\b${pub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pubRegex.test(text)) {
        publisher = pub.charAt(0).toUpperCase() + pub.slice(1);
        publisherConfidence = 88;
        break;
      }
    }

    // â”€â”€ 10. Volume, Issue, Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let volume = '';
    let issue = '';
    let pages = '';

    const volMatch = text.match(/\bvol(?:ume)?\.?\s*(\d+)/i);
    if (volMatch) volume = volMatch[1];

    const issueMatch = text.match(/\b(?:issue|no\.?)\s*(\d+)/i);
    if (issueMatch) issue = issueMatch[1];

    const pagesMatch = text.match(/\bpp\.?\s*(\d+)\s*[-â€“]\s*(\d+)/i)
      || text.match(/\bpages?\s*(\d+)\s*[-â€“]\s*(\d+)/i);
    if (pagesMatch) pages = `${pagesMatch[1]}-${pagesMatch[2]}`;

    // â”€â”€ 11. Funding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let funding = '';
    let fundingConfidence = 0;
    const fundingPatterns = [
      /(?:supported\s+by|funded\s+by|financial\s+support\s+(?:from|by)|grant\s+(?:number|no\.?|#)\s*)([A-Z0-9\s\-\/,\.]{5,150})/i,
      /(?:this\s+work\s+was\s+supported|this\s+research\s+was\s+supported)\s+(?:by|through)\s+([A-Z][A-Za-z0-9\s\-,]{5,150})/i
    ];
    for (const p of fundingPatterns) {
      const m = text.match(p);
      if (m) {
        funding = m[0].trim().replace(/\s+/g, ' ').substring(0, 300);
        fundingConfidence = 75;
        break;
      }
    }

    // â”€â”€ 12. License â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let license = '';
    const licenseMatch = text.match(/\b(CC\s+BY(?:-(?:NC|SA|ND|NC-SA|NC-ND|SA))?(?:\s+\d+\.\d+)?|Creative\s+Commons\s+[\w\s\-]+(?:license|licence)|Apache\s+2\.0|MIT\s+License|GPL|BSD)\b/i);
    if (licenseMatch) license = licenseMatch[0].trim();

    // â”€â”€ 13. Copyright â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let copyright = '';
    const copyrightMatch = text.match(/Â©\s*(?:copyright)?\s*(\d{4})\s*([A-Za-z\s,\.]+?)(?:\.|,|\n|$)/i)
      || text.match(/copyright\s+Â©?\s*(\d{4})\s*([A-Za-z\s,\.]+?)(?:\.|,|\n|$)/i);
    if (copyrightMatch) copyright = copyrightMatch[0].trim().substring(0, 200);

    // â”€â”€ 14. Running Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let runningHeader = '';
    // Running headers are typically the shortest repeated lines at the top of pages
    // We detect them from lines 0-3
    if (firstLines.length > 2) {
      const shortTopLines = firstLines.slice(0, 3).filter(l => l.length < 80 && l.length > 5);
      if (shortTopLines.length > 0) runningHeader = shortTopLines[0];
    }

    // â”€â”€ 15. References â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let references = [];
    let referencesConfidence = 0;
    const refIdx = text.toLowerCase().lastIndexOf('\nreferences');
    if (refIdx !== -1) {
      const refBlock = text.substring(refIdx + 11);
      references = refBlock
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 20 && /\[\d+\]|\d+\.|\[.*?\]/.test(l))
        .slice(0, 60);
      referencesConfidence = references.length > 0 ? 85 : 0;
    }

    // â”€â”€ 16. Language â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const language = 'English'; // Default; could integrate franc/cld2 for detection
    const languageConfidence = 80;

    // â”€â”€ Return structured result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return {
      title:               { value: title, confidence: titleConfidence },
      subtitle:            { value: subtitle, confidence: subtitleConfidence },
      abstract:            { value: abstract, confidence: abstractConfidence },
      authorsList:         { value: authors, confidence: authorsConfidence },
      affiliations:        { value: affiliations, confidence: affiliations.length > 0 ? 75 : 0 },
      correspondingAuthor: { value: correspondingAuthor, confidence: correspondingAuthor ? 80 : 0 },
      emails:              { value: emails, confidence: emails.length > 0 ? 100 : 0 },
      orcids:              { value: orcids, confidence: orcids.length > 0 ? 100 : 0 },
      doi:                 { value: doi, confidence: doiConfidence },
      isbn:                { value: isbn, confidence: isbn ? 100 : 0 },
      issn:                { value: issn, confidence: issn ? 100 : 0 },
      year:                { value: year, confidence: yearConfidence },
      journal:             { value: journal, confidence: journalConfidence },
      conference:          { value: conference, confidence: conferenceConfidence },
      publisher:           { value: publisher, confidence: publisherConfidence },
      volume:              { value: volume, confidence: volume ? 80 : 0 },
      issue:               { value: issue, confidence: issue ? 80 : 0 },
      pages:               { value: pages, confidence: pages ? 80 : 0 },
      language:            { value: language, confidence: languageConfidence },
      funding:             { value: funding, confidence: fundingConfidence },
      license:             { value: license, confidence: license ? 85 : 0 },
      copyright:           { value: copyright, confidence: copyright ? 80 : 0 },
      runningHeader:       { value: runningHeader, confidence: runningHeader ? 50 : 0 },
      references:          { value: references, confidence: referencesConfidence }
    };
  }

  // â”€â”€ Keyword Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _extractKeywords(text) {
    if (!text) return { keywords: [], confidence: 0 };

    // Try to find explicit Keywords section first
    const kwMatch = text.match(/\b(?:keywords?|index\s+terms?|key\s+words?)[\s:â€”]+([^\n]{10,300})/i);
    if (kwMatch) {
      const kwLine = kwMatch[1];
      const kws = kwLine.split(/[,;Â·â€¢\|]/).map(k => k.trim().toLowerCase()).filter(k => k.length > 2 && k.length < 50);
      if (kws.length > 0) {
        return { keywords: kws.slice(0, 12), confidence: Math.min(100, 90) };
      }
    }

    // Fallback: TF-IDF style extraction
    const words = text.toLowerCase().match(/\b[a-z]{4,25}\b/g) || [];
    const filtered = stopword.removeStopwords(words);
    if (filtered.length === 0) return { keywords: [], confidence: 0 };

    const freqMap = {};
    filtered.forEach(word => { freqMap[word] = (freqMap[word] || 0) + 1; });
    const sorted = Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]);
    const topKeywords = sorted.slice(0, 10);

    return {
      keywords: topKeywords,
      confidence: Math.min(100, 45 + topKeywords.length * 5)
    };
  }

  // â”€â”€ Research Area Matching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _matchResearchAreas(keywords, text) {
    const scores = {};
    const textLower = text.toLowerCase();

    Object.keys(TAXONOMY).forEach(area => {
      let score = 0;
      const terms = TAXONOMY[area];
      keywords.forEach(kw => { if (terms.includes(kw)) score += 3; });
      terms.forEach(term => {
        const regex = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
        const count = (textLower.match(regex) || []).length;
        score += count * 0.5;
      });
      if (score > 1) scores[area] = score;
    });

    const matched = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const topAreas = matched.slice(0, 3);

    return {
      areas: topAreas,
      confidence: topAreas.length > 0 ? Math.min(100, Math.round(scores[topAreas[0]] * 5)) : 0
    };
  }
}

module.exports = new MetadataExtractionService();
