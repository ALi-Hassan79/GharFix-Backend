const supabase = require('../config/supabase');

// ─────────────────────────────────────────────────
//  POST /api/bookings
//  Customer creates a new booking
// ─────────────────────────────────────────────────
const createBooking = async (req, res) => {
  try {
    const { providerId, service, description, address, city, scheduledDate, scheduledTime } = req.body;

    // Verify provider exists and is available
    const { data: provider } = await supabase
      .from('providers')
      .select('id, is_available')
      .eq('id', providerId)
      .maybeSingle();

    if (!provider || !provider.is_available) {
      return res.status(400).json({ success: false, message: 'Provider not found or not available.' });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        customer_id:    req.user.id,
        provider_id:    providerId,
        service,
        description,
        address,
        city:           city || req.user.city,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status:         'pending'
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Booking request sent! The provider will confirm shortly.',
      booking
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error creating booking.' });
  }
};

// ─────────────────────────────────────────────────
//  GET /api/bookings/my
//  Get bookings for the logged-in user
// ─────────────────────────────────────────────────
const getMyBookings = async (req, res) => {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:users!bookings_customer_id_fkey(id, name, phone, city),
        provider:providers!bookings_provider_id_fkey(
          id, category, average_rating,
          user:users(id, name, phone)
        )
      `)
      .order('created_at', { ascending: false });

    if (req.user.role === 'customer') {
      query = query.eq('customer_id', req.user.id);
    } else if (req.user.role === 'provider') {
      const { data: profile } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (!profile) return res.json({ success: true, bookings: [] });
      query = query.eq('provider_id', profile.id);
    }

    const { data: bookings, error } = await query;
    if (error) throw error;

    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching bookings.' });
  }
};

// ─────────────────────────────────────────────────
//  PATCH /api/bookings/:id/status
// ─────────────────────────────────────────────────
const updateBookingStatus = async (req, res) => {
  try {
    const { status, cancelReason } = req.body;

    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, customer_id, provider_id, status')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Permission checks
    const isCustomer = booking.customer_id === req.user.id;
    const isAdmin    = req.user.role === 'admin';
    let isProvider   = false;

    if (req.user.role === 'provider') {
      const { data: profile } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', req.user.id)
        .maybeSingle();
      isProvider = profile && booking.provider_id === profile.id;
    }

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Status transition rules
    const allowedTransitions = {
      pending:       ['confirmed', 'cancelled'],
      confirmed:     ['in-progress', 'cancelled'],
      'in-progress': ['completed', 'cancelled']
    };

    const allowed = allowedTransitions[booking.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${booking.status}" to "${status}".`
      });
    }

    const updates = { status };
    if (cancelReason) updates.cancel_reason = cancelReason;
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Increment provider's total_jobs on completion
    if (status === 'completed') {
      await supabase.rpc('increment_provider_jobs', { provider_id: booking.provider_id });
    }

    res.json({ success: true, message: `Booking ${status}.`, booking: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating booking.' });
  }
};

module.exports = { createBooking, getMyBookings, updateBookingStatus };
