const express      = require('express');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
  getStats,
  getAllUsers,
  toggleUserActive,
  getAllProviders,
  toggleProviderVerified,
  getAllBookings
} = require('../controllers/admin.controller');

const router = express.Router();

// All admin routes require login + admin role
router.use(protect, restrictTo('admin'));

router.get('/stats',                      getStats);
router.get('/users',                      getAllUsers);
router.patch('/users/:id/toggle-active',  toggleUserActive);
router.get('/providers',                  getAllProviders);
router.patch('/providers/:id/verify',     toggleProviderVerified);
router.get('/bookings',                   getAllBookings);

module.exports = router;