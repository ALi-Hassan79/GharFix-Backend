const supabase = require('../config/supabase');

// POST /api/reviews
const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, customer_id, provider_id, status')
      .eq('id', bookingId)
      .maybeSingle();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the customer can review.' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'You can only review a completed booking.' });
    }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this booking.' });
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        booking_id:  bookingId,
        customer_id: req.user.id,
        provider_id: booking.provider_id,
        rating,
        comment: comment || null
      })
      .select('*')
      .single();

    if (error) throw error;

    // Note: provider rating is auto-recalculated by DB trigger (see schema.sql)

    res.status(201).json({ success: true, message: 'Thank you for your review!', review });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error submitting review.' });
  }
};

// GET /api/reviews/provider/:providerId
const getProviderReviews = async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        customer:users!reviews_customer_id_fkey(id, name, city)
      `)
      .eq('provider_id', req.params.providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching reviews.' });
  }
};

module.exports = { createReview, getProviderReviews };
