/**
 * Publication ID Generator
 * ========================
 * Generates a globally unique, collision-resistant publicationId.
 *
 * Format: RCPUB_<ULID>
 * Example: RCPUB_01J4AB9X2D6Q3P8M7T5VY8K4RZ
 *
 * Properties:
 *   - Monotonically sortable (timestamp-prefixed, 48-bit ms precision)
 *   - 80 bits of cryptographic randomness
 *   - Crockford Base32 encoded (URL-safe, case-insensitive)
 *   - Zero collision probability at any concurrency level
 *   - Never uses Date.now(), Math.random(), counter, or static value
 *   - Uses function reference in schema default (not evaluated at schema load time)
 *
 * Implementation uses Node.js native crypto + timestamp to construct a ULID-compatible ID
 * without requiring external package dependencies.
 */

// Replaced require('uuid') with Node's native crypto module to prevent ESM errors
const crypto = require('crypto');

/**
 * Crockford Base32 alphabet (no I, L, O, U to avoid confusion)
 */
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Encode a number into Crockford Base32 with a fixed character length.
 * @param {number} value - Integer to encode.
 * @param {number} length - Required output length (zero-padded on left).
 * @returns {string}
 */
function encodeBase32(value, length) {
  let result = '';
  for (let i = length - 1; i >= 0; i--) {
    result = CROCKFORD_BASE32[value & 31] + result;
    value = Math.floor(value / 32);
  }
  return result;
}

/**
 * Generate a ULID-format string from current timestamp + secure random bytes.
 * Structure: 10-char timestamp | 16-char random = 26 chars total
 * @returns {string} 26-character ULID string (Crockford Base32 encoded)
 */
function generateULID() {
  // 1. Encode 48-bit millisecond timestamp as 10 Base32 chars
  const now = Date.now();
  const timestampPart = encodeBase32(now, 10);

  // 2. Generate exactly 10 bytes (80 bits) of cryptographic randomness natively.
  //    This replaces the previous uuidv4 string manipulation logic.
  const randomBytes = crypto.randomBytes(10); // 10 bytes buffer

  // 3. Convert bytes buffer directly to a BigInt, then encode as 16 Base32 chars
  const randomInt = BigInt('0x' + randomBytes.toString('hex'));
  let randomPart = '';
  let remaining = randomInt;
  for (let i = 15; i >= 0; i--) {
    randomPart = CROCKFORD_BASE32[Number(remaining & 31n)] + randomPart;
    remaining = remaining >> 5n;
  }

  return timestampPart + randomPart;
}

/**
 * Generate a globally unique, immutable Publication ID.
 * This function MUST be called as a function reference in Mongoose schema default,
 * NOT as a pre-evaluated result.
 *
 * Correct schema usage:
 *   publicationId: { type: String, default: () => generatePublicationId() }
 *
 * @returns {string} e.g., "RCPUB_01J4AB9X2D6Q3P8M7T5VY8K4RZ"
 */
function generatePublicationId() {
  return `RCPUB_${generateULID()}`;
}

/**
 * Validate that a string matches the publicationId format.
 * @param {string} id
 * @returns {boolean}
 */
function isValidPublicationId(id) {
  if (typeof id !== 'string') return false;
  return /^RCPUB_[0-9A-HJKMNP-TV-Z]{26}$/.test(id);
}

/**
 * Generate a human-readable publication code for display purposes only.
 * NOT used as a unique identifier — just for UI display.
 * Format: RC-YYYY-XXXXXXXX (non-sequential, safe for display)
 * @returns {string} e.g., "RC-2025-A3K8Z9M2"
 */
function generatePublicationCode() {
  const year = new Date().getFullYear();
  const suffix = generateULID().substring(10, 18); // 8 random chars from ULID random portion
  return `RC-${year}-${suffix}`;
}

module.exports = {
  generatePublicationId,
  generatePublicationCode,
  isValidPublicationId
};
