const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token for a user
 * @param {string} userId - Supabase UUID
 * @param {string} role   - 'customer' | 'provider' | 'admin'
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { generateToken };
