const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  calculatePrice
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/calculate-price', calculatePrice);

router.get('/my-bookings', protect, getMyBookings);

router.post('/', protect, createBooking);

router.route('/:id')
  .get(protect, getBookingById)
  .delete(protect, cancelBooking);

module.exports = router;
