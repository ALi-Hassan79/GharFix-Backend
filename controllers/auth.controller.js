const bcrypt   = require('bcryptjs');
const supabase = require('../config/supabase');
const { generateToken } = require('../config/jwt');
const { validationResult } = require('express-validator');
const { sendOTP } = require('../config/mailer');

// ─── Generate 6-digit OTP ─────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─────────────────────────────────────────────────
//  POST /api/auth/register
// ─────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { name, email, password, phone, city, role, category, experience, bio } = req.body;

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id, is_verified')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existing && existing.is_verified) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Generate OTP
    const otp        = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // Hash password
    const salt           = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user;

    if (existing && !existing.is_verified) {
      // Update existing unverified account
      const { data: updated, error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          password: hashedPassword,
          phone: phone || null,
          city: city || 'Gujranwala',
          role: role === 'provider' ? 'provider' : 'customer',
          otp,
          otp_expires_at: otpExpires,
          is_verified: false
        })
        .eq('email', email.toLowerCase().trim())
        .select('id, name, email, role, city')
        .single();
      if (error) throw error;
      user = updated;
    } else {
      // Create new user
      const { data: created, error: userErr } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          phone: phone || null,
          city: city || 'Gujranwala',
          role: role === 'provider' ? 'provider' : 'customer',
          otp,
          otp_expires_at: otpExpires,
          is_verified: false
        })
        .select('id, name, email, role, city')
        .single();
      if (userErr) throw userErr;
      user = created;
    }

    // If provider, create provider profile
    if (role === 'provider') {
      if (!category) {
        await supabase.from('users').delete().eq('id', user.id);
        return res.status(400).json({ success: false, message: 'Service category is required for providers.' });
      }
      const { data: existingProv } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingProv) {
        const { error: provErr } = await supabase
          .from('providers')
          .insert({
            user_id: user.id,
            category,
            city: city || 'Gujranwala',
            experience: experience || 0,
            bio: bio || ''
          });
        if (provErr) {
          await supabase.from('users').delete().eq('id', user.id);
          throw provErr;
        }
      }
    }

    // Send OTP email
    await sendOTP(email.toLowerCase().trim(), name.trim(), otp);

    res.status(201).json({
      success: true,
      message: `Verification code sent to ${email}. Please check your inbox.`,
      userId: user.id,
      requiresVerification: true
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ─────────────────────────────────────────────────
//  POST /api/auth/verify-otp
// ─────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: 'User ID and OTP are required.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, city, otp, otp_expires_at, is_verified')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.is_verified) {
      return res.status(400).json({ success: false, message: 'Account already verified.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please register again.' });
    }

    // Mark as verified and clear OTP
    const { error: updateErr } = await supabase
      .from('users')
      .update({ is_verified: true, otp: null, otp_expires_at: null })
      .eq('id', userId);

    if (updateErr) throw updateErr;

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: `Welcome to GharFix, ${user.name}! Your account is verified.`,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, city: user.city }
    });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
};

// ─────────────────────────────────────────────────
//  POST /api/auth/resend-otp
// ─────────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, is_verified')
      .eq('id', userId)
      .maybeSingle();

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.is_verified) return res.status(400).json({ success: false, message: 'Account already verified.' });

    const otp        = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from('users').update({ otp, otp_expires_at: otpExpires }).eq('id', userId);
    await sendOTP(user.email, user.name, otp);

    res.json({ success: true, message: 'New verification code sent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error resending OTP.' });
  }
};

// ─────────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password, role, city, is_active, is_verified')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact support.' });
    }

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first.',
        requiresVerification: true,
        userId: user.id
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user.id, user.role);

    let providerProfileId = null;
    if (user.role === 'provider') {
      const { data: profile } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      providerProfileId = profile?.id || null;
    }

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, city: user.city, providerProfileId }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ─────────────────────────────────────────────────
//  GET /api/auth/me
// ─────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, phone, role, city, avatar, created_at')
      .eq('id', req.user.id)
      .single();

    let providerProfile = null;
    if (user.role === 'provider') {
      const { data: profile } = await supabase
        .from('providers').select('*').eq('user_id', user.id).maybeSingle();
      providerProfile = profile;
    }

    res.status(200).json({ success: true, user: { ...user, providerProfile } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching user data.' });
  }
};

// ─────────────────────────────────────────────────
//  POST /api/auth/change-password
// ─────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const { data: user } = await supabase
      .from('users').select('id, password').eq('id', req.user.id).single();

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt           = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error } = await supabase
      .from('users').update({ password: hashedPassword }).eq('id', user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error changing password.' });
  }
};

module.exports = { register, login, getMe, changePassword, verifyOTP, resendOTP };