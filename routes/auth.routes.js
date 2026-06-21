const express  = require('express');
const { body } = require('express-validator');
const { register, login, getMe, changePassword, verifyOTP, resendOTP } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// ─── Validation rules ────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('role')
    .optional()
    .isIn(['customer', 'provider']).withMessage('Role must be customer or provider'),

  body('city')
    .optional()
    .isIn(['Gujranwala', 'Lahore', 'Faisalabad']).withMessage('Invalid city')
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required')
];

// ─── Routes ──────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerValidation, register);

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyOTP);

// POST /api/auth/resend-otp
router.post('/resend-otp', resendOTP);

// POST /api/auth/login
router.post('/login', loginValidation, login);

// GET /api/auth/me  — must be logged in
router.get('/me', protect, getMe);

// POST /api/auth/change-password — must be logged in
router.post('/change-password', protect, changePassword);
module.exports = router;
