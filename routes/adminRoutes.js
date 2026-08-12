const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  updateUser,
  blockUser,
  deleteUser,
  getSellers,
  approveSeller,
  rejectSeller,
  deleteSeller,
  getVehicles,
  updateVehicleStatus,
  deleteAdminVehicle,
  getBookings,
  updateBookingStatus,
  cancelBooking,
  getPayments,
  getMessages
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All admin routes require authentication and 'admin' role
router.use(protect, authorize('admin'));

router.get('/dashboard-stats', getDashboardStats);

router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser);

router.route('/users/:id/block')
  .put(blockUser);

router.route('/sellers')
  .get(getSellers);

router.route('/sellers/:id/approve')
  .put(approveSeller);

router.route('/sellers/:id/reject')
  .put(rejectSeller);

router.route('/sellers/:id')
  .delete(deleteSeller);

router.route('/vehicles')
  .get(getVehicles);

router.route('/vehicles/:id/status')
  .put(updateVehicleStatus);

router.route('/vehicles/:id')
  .delete(deleteAdminVehicle);

router.route('/bookings')
  .get(getBookings);

router.route('/bookings/:id/cancel')
  .put(cancelBooking);

router.route('/bookings/:id')
  .put(updateBookingStatus);

router.route('/payments')
  .get(getPayments);

router.route('/messages')
  .get(getMessages);

module.exports = router;
