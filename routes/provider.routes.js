const express = require('express');
const { getProviders, getProvider, updateProvider } = require('../controllers/provider.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/',    getProviders);          // Public — list providers
router.get('/:id', getProvider);           // Public — single provider
router.put('/:id', protect, updateProvider); // Protected — update own profile

module.exports = router;
