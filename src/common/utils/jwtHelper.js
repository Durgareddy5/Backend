const jwt = require('jsonwebtoken');

const signAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'supersecretjwtkeyforresearchconnect', {
    expiresIn: process.env.JWT_EXPIRE || '15m'
  });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'supersecretjwtrefreshkeyforresearchconnect', {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforresearchconnect');
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'supersecretjwtrefreshkeyforresearchconnect');
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
