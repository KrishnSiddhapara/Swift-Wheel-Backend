const express = require('express');
const router = express.Router();
const { 
  addVehicle, 
  getSellerVehicles, 
  updateVehicle, 
  deleteVehicle, 
  getSellerBookings, 
  getSellerEarnings,
  updateBookingStatus
} = require('../controllers/sellerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

// All seller routes require authentication and 'seller' role
router.use(protect, authorize('seller'));

router.route('/vehicles')
  .post(upload.array('images', 5), addVehicle)
  .get(getSellerVehicles);

router.route('/vehicles/:id')
  .put(upload.array('images', 5), updateVehicle)
  .delete(deleteVehicle);

router.get('/bookings', getSellerBookings);
router.put('/bookings/:id', updateBookingStatus);
router.get('/earnings', getSellerEarnings);

module.exports = router;
