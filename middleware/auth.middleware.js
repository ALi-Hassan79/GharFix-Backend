const jwt      = require('jsonwebtoken');
const supabase = require('../config/supabase');

/**
 * protect — verifies JWT and attaches req.user
 * Use on any route that requires login
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, city, avatar, is_active')
      .eq('id', decoded.id)
      .single();

    if (error || !user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account disabled.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.'
    });
  }
};

/**
 * restrictTo — role-based access control
 * Usage: restrictTo('admin') or restrictTo('admin', 'provider')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
