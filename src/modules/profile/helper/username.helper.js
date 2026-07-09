const User = require('../../../models/User');

/**
 * Generate a random 6-character uppercase alphanumeric string
 */
const generateRandomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ01233456789'; // A-Z, 0-9
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a unique public profile ID with 'rc_' prefix
 */
const generateUniquePublicProfileId = async () => {
  let isUnique = false;
  let publicProfileId = '';
  
  while (!isUnique) {
    publicProfileId = `rc_${generateRandomId()}`;
    // Check uniqueness in database
    const exists = await User.findOne({ publicProfileId, isDeleted: { $ne: true } });
    if (!exists) {
      isUnique = true;
    }
  }
  
  return publicProfileId;
};

/**
 * Generate a unique slugified username and corresponding profile slug
 */
const generateUniqueUsernameAndSlug = async (firstName, lastName) => {
  // Convert to lowercase, replace spaces and non-alphanumeric with hyphens
  const cleanFirst = (firstName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
  const cleanLast = (lastName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
  
  // Combine names, clean up duplicate hyphens, leading/trailing hyphens
  let baseUsername = `${cleanFirst}-${cleanLast}`
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  if (!baseUsername) {
    baseUsername = 'researcher';
  }

  const publicProfileId = await generateUniquePublicProfileId();
  
  // Check if base username is already taken
  const exists = await User.findOne({ username: baseUsername, isDeleted: { $ne: true } });
  
  let username = baseUsername;
  let profileSlug = '';

  if (!exists) {
    // If not taken, username is sushil-kumar, and profileSlug is sushil-kumar-rc_XXXXXX
    username = baseUsername;
    profileSlug = `${username}-${publicProfileId}`;
  } else {
    // If taken, username is sushil-kumar-rc_XXXXXX, and profileSlug is username itself
    username = `${baseUsername}-${publicProfileId}`;
    profileSlug = username;
  }

  return {
    username,
    publicProfileId,
    profileSlug,
    profileUrl: `/profile/${profileSlug}`
  };
};

module.exports = {
  generateRandomId,
  generateUniquePublicProfileId,
  generateUniqueUsernameAndSlug
};
