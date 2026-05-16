const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, cancelBooking, calculatePrice } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.route('/calculate-price')
  .post(calculatePrice);

router.route('/')
  .post(protect, createBooking);

router.route('/my-bookings')
  .get(protect, getMyBookings);

router.route('/:id')
  .delete(protect, cancelBooking);

module.exports = router;
