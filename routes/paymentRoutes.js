const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create-order', protect, createOrder);
// Public: Cashfree return_url reload must succeed without depending on JWT timing/session
router.post('/verify', verifyPayment);

module.exports = router;
