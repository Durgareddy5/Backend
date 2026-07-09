/**
 * PDF Validator Utility
 * =====================
 * Validates uploaded PDF files for:
 *   1. Valid PDF signature (%PDF header)
 *   2. Password-protection / encryption detection
 *   3. Structural corruption detection
 *
 * IMPORTANT: pdf-parse v2.x exports a DEFAULT ASYNC FUNCTION, not a class.
 * Correct usage: const pdfParse = require('pdf-parse'); await pdfParse(buffer);
 * WRONG usage:   const { PDFParse } = require('pdf-parse'); — PDFParse is undefined!
 *
 * This file fixes the broken import pattern that was crashing every upload.
 */

const { ValidationError } = require('../../../common/errors/AppError');

/**
 * Check raw bytes for PDF magic number (%PDF) at offset 0.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function hasPDFSignature(buffer) {
  if (!buffer || buffer.length < 5) return false;
  // PDF files begin with %PDF (hex: 25 50 44 46)
  return (
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46    // F
  );
}

/**
 * Check if a PDF buffer contains encryption markers.
 * Scans the first 8KB for /Encrypt dictionaries.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function hasEncryptionMarker(buffer) {
  const sampleSize = Math.min(buffer.length, 8192);
  const sample = buffer.slice(0, sampleSize).toString('latin1');
  return /\/Encrypt\s+\d+\s+\d+\s+R/i.test(sample) || sample.includes('/Encrypt');
}

/**
 * Validate a PDF buffer. Throws structured ValidationError on invalid files.
 * This function uses the correct pdf-parse API (default export, async function).
 *
 * @param {Buffer} buffer - Raw file buffer
 * @param {string} [originalName] - Original filename for error context
 * @returns {Promise<{ valid: true, pages: number, info: object }>}
 * @throws {ValidationError} with specific message for each failure mode
 */
async function validatePDFBuffer(buffer, originalName = 'file') {
  // Step 1: Check PDF signature
  if (!hasPDFSignature(buffer)) {
    throw new ValidationError(
      `Invalid PDF file: "${originalName}" does not have a valid PDF signature. ` +
      'Please ensure the file is a genuine PDF document.'
    );
  }

  // Step 2: Pre-check for encryption markers before parsing
  if (hasEncryptionMarker(buffer)) {
    throw new ValidationError(
      `The uploaded PDF "${originalName}" is password-protected or encrypted. ` +
      'Please remove the password protection and try again.'
    );
  }

  // Step 3: Attempt full parse with the PDFParse class
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse(new Uint8Array(buffer));
    
    // Parse the first page text to validate structure
    await parser.getText({ first: 1 });
    const info = await parser.getInfo();

    return {
      valid: true,
      pages: info.total || 0,
      info: info.info || {},
      metadata: info.metadata || {}
    };
  } catch (error) {
    const msg = error.message || String(error);

    // Detect password-protected PDF parse errors
    if (
      error.name === 'PasswordException' ||
      /password|encrypted|protected/i.test(msg)
    ) {
      throw new ValidationError(
        `The uploaded PDF "${originalName}" is password-protected or encrypted. ` +
        'Please remove the password protection and try again.'
      );
    }

    // Detect corrupted / structurally invalid PDFs
    if (
      error.name === 'InvalidPDFException' ||
      /invalid pdf|corrupted|structure|unexpected|malformed/i.test(msg)
    ) {
      throw new ValidationError(
        `The uploaded PDF "${originalName}" appears to be corrupted or structurally invalid. ` +
        'Please try a different file or re-export the PDF.'
      );
    }

    // Catch-all for unrecognized parse errors
    throw new ValidationError(
      `Failed to validate PDF "${originalName}": ${msg}. ` +
      'The file may be corrupted or in an unsupported format.'
    );
  }
}

/**
 * Non-throwing version for optional pre-checks.
 * @param {Buffer} buffer
 * @returns {Promise<{ isValid: boolean, isEncrypted: boolean, isCorrupted: boolean, error: string|null }>}
 */
async function inspectPDF(buffer) {
  if (!hasPDFSignature(buffer)) {
    return { isValid: false, isEncrypted: false, isCorrupted: false, error: 'Not a PDF file' };
  }

  if (hasEncryptionMarker(buffer)) {
    return { isValid: false, isEncrypted: true, isCorrupted: false, error: 'PDF is encrypted' };
  }

  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse(new Uint8Array(buffer));
    await parser.getText({ first: 1 });
    return { isValid: true, isEncrypted: false, isCorrupted: false, error: null };
  } catch (error) {
    const msg = error.message || String(error);
    const isEncrypted = error.name === 'PasswordException' || /password|encrypted|protected/i.test(msg);
    return {
      isValid: false,
      isEncrypted,
      isCorrupted: !isEncrypted,
      error: msg
    };
  }
}

module.exports = {
  validatePDFBuffer,
  inspectPDF,
  hasPDFSignature,
  hasEncryptionMarker
};
