const express  = require('express');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, phone, role, city, avatar, created_at')
    .eq('id', req.user.id)
    .single();
  res.json({ success: true, user });
});

// PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'city'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, name, email, phone, role, city, avatar')
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Profile updated.', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
});

module.exports = router;
