/**
 * Generate an SEO-friendly slug with a unique random suffix to avoid collisions and hide ObjectIds.
 * E.g., "Deep Learning for Healthcare" -> "deep-learning-for-healthcare-rp_A8X2KD"
 */
const slugify = require('slugify');
const { nanoid } = require('nanoid');

/**
 * Generate an SEO-friendly slug with a unique random suffix to avoid collisions and hide ObjectIds.
 * E.g., "Deep Learning for Healthcare" -> "deep-learning-for-healthcare-rp_A8X2KD"
 */
const generateSlug = (title) => {
  const titleText = title ? title.toString() : 'research-paper';

  const titleSlug = slugify(titleText, {
    lower: true,
    strict: true,
    trim: true
  });

  // Limit title slug to around 80 characters, and clean trailing hyphens
  const cleanTitleSlug = titleSlug.substring(0, 80).replace(/-+$/, '') || 'research-paper';

  // Generate 4 random uppercase alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = 'RC';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${cleanTitleSlug}-${suffix}`;
};

module.exports = {
  generateSlug
};
