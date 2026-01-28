const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { auth, isAdmin } = require('../middleware/auth');

// Public route for payment callback
router.post('/verify', PaymentController.verifyPayment);

// Admin routes
router.post('/release-escrow', auth, isAdmin, PaymentController.releaseEscrow);
router.post('/auto-release', auth, isAdmin, PaymentController.autoReleaseCron);

module.exports = router;