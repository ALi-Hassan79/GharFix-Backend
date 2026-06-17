const supabase = require('../config/supabase');

// ─────────────────────────────────────────────────
//  GET /api/admin/stats
// ─────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: totalProviders },
      { count: totalBookings },
      { count: pendingBookings },
      { count: completedBookings },
      { count: unverifiedProviders }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('providers').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('providers').select('*', { count: 'exact', head: true }).eq('is_verified', false)
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProviders,
        totalBookings,
        pendingBookings,
        completedBookings,
        unverifiedProviders
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching stats.' });
  }
};

// ─────────────────────────────────────────────────
//  GET /api/admin/users
// ─────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;
    const to   = from + parseInt(limit) - 1;

    let query = supabase
      .from('users')
      .select('id, name, email, phone, role, city, is_active, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (role) query = query.eq('role', role);

    const { data: users, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, count: users.length, total: count, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching users.' });
  }
};

// ─────────────────────────────────────────────────
//  PATCH /api/admin/users/:id/toggle-active
// ─────────────────────────────────────────────────
const toggleUserActive = async (req, res) => {
  try {
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('id, is_active, role')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot deactivate an admin account.' });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', req.params.id)
      .select('id, name, is_active')
      .single();

    if (updateErr) throw updateErr;

    res.json({
      success: true,
      message: `User ${updated.is_active ? 'activated' : 'deactivated'} successfully.`,
      user: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating user.' });
  }
};

// ─────────────────────────────────────────────────
//  GET /api/admin/providers
// ─────────────────────────────────────────────────
const getAllProviders = async (req, res) => {
  try {
    const { verified, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;
    const to   = from + parseInt(limit) - 1;

    let query = supabase
      .from('providers')
      .select(`
        *,
        user:users(id, name, email, phone, city, is_active)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (verified !== undefined) query = query.eq('is_verified', verified === 'true');

    const { data: providers, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, count: providers.length, total: count, providers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching providers.' });
  }
};

// ─────────────────────────────────────────────────
//  PATCH /api/admin/providers/:id/verify
// ─────────────────────────────────────────────────
const toggleProviderVerified = async (req, res) => {
  try {
    const { data: provider, error: fetchErr } = await supabase
      .from('providers')
      .select('id, is_verified')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });

    const { data: updated, error: updateErr } = await supabase
      .from('providers')
      .update({ is_verified: !provider.is_verified })
      .eq('id', req.params.id)
      .select('id, is_verified')
      .single();

    if (updateErr) throw updateErr;

    res.json({
      success: true,
      message: `Provider ${updated.is_verified ? 'verified' : 'unverified'} successfully.`,
      provider: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating provider.' });
  }
};

// ─────────────────────────────────────────────────
//  GET /api/admin/bookings
// ─────────────────────────────────────────────────
const getAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;
    const to   = from + parseInt(limit) - 1;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:users!bookings_customer_id_fkey(id, name, phone, city),
        provider:providers!bookings_provider_id_fkey(
          id, category,
          user:users(id, name, phone)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data: bookings, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, count: bookings.length, total: count, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching bookings.' });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  toggleUserActive,
  getAllProviders,
  toggleProviderVerified,
  getAllBookings
};