const supabase = require('../config/supabase');

// ─────────────────────────────────────────────────
//  GET /api/providers
//  Public — list all providers with filters
// ─────────────────────────────────────────────────
const getProviders = async (req, res) => {
  try {
    const { city, category, minRating, page = 1, limit = 12 } = req.query;

    let query = supabase
      .from('providers')
      .select(`
        *,
        user:users(id, name, avatar)
      `, { count: 'exact' });

    if (city)      query = query.eq('city', city);
    if (category)  query = query.eq('category', category);
    if (minRating) query = query.gte('average_rating', parseFloat(minRating));

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to   = from + limitNum - 1;

    const { data: providers, error, count } = await query
      .order('average_rating', { ascending: false })
      .order('total_jobs', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      success: true,
      count: providers.length,
      total: count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      providers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching providers.' });
  }
};

// ─────────────────────────────────────────────────
//  GET /api/providers/:id
//  Public — single provider profile
// ─────────────────────────────────────────────────
const getProvider = async (req, res) => {
  try {
    const { data: provider, error } = await supabase
      .from('providers')
      .select(`
        *,
        user:users(id, name, email, phone, avatar, city, created_at)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    res.json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching provider.' });
  }
};

// ─────────────────────────────────────────────────
//  PUT /api/providers/:id
//  Protected — provider updates own profile
// ─────────────────────────────────────────────────
const updateProvider = async (req, res) => {
  try {
    const { data: provider, error: fetchErr } = await supabase
      .from('providers')
      .select('id, user_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    if (provider.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const allowed = ['bio', 'experience', 'skills', 'area', 'is_available', 'hourly_rate'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const { data: updated, error: updateErr } = await supabase
      .from('providers')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, message: 'Profile updated.', provider: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating provider.' });
  }
};

module.exports = { getProviders, getProvider, updateProvider };
