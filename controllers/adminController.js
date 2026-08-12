const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Message = require('../models/Message');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard-stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const totalVehicles = await Vehicle.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    // Revenue calculation from completed bookings
    const completedBookings = await Booking.find({ paymentStatus: 'Paid' });
    const totalRevenue = completedBookings.reduce((acc, item) => acc + (item.totalAmount || 0), 0);

    // Most rented vehicle
    const mostRentedAggregation = await Booking.aggregate([
      { $group: { _id: '$vehicleId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    
    let mostRentedVehicle = null;
    if (mostRentedAggregation.length > 0) {
      mostRentedVehicle = await Vehicle.findById(mostRentedAggregation[0]._id).select('vehicleName brand category image');
    }

    // Top cities based on pickupLocation
    const topCitiesAggregation = await Booking.aggregate([
      { $group: { _id: '$pickupLocation', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const topCities = topCitiesAggregation.map(city => ({ name: city._id || 'Unknown', count: city.count }));

    // Monthly revenue & bookings trends
    const trendsAggregation = await Booking.aggregate([
      { $match: { paymentStatus: 'Paid', createdAt: { $exists: true } } },
      { 
        $group: { 
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrends = trendsAggregation.map(item => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      revenue: item.revenue,
      bookings: item.bookings
    }));

    res.json({
      totalUsers,
      totalSellers,
      totalVehicles,
      totalBookings,
      totalRevenue,
      mostRentedVehicle,
      topCities,
      monthlyTrends
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { role: 'user' };
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await User.countDocuments(query);

    res.json({
      data: users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.city = req.body.city || user.city;
      user.phone = req.body.phone || user.phone;

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block/Unblock user
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.status = user.status === 'Blocked' ? 'Active' : 'Blocked';
      await user.save();
      res.json({ message: `User ${user.status.toLowerCase()} successfully`, status: user.status });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all sellers
// @route   GET /api/admin/sellers
// @access  Private/Admin
const getSellers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { role: 'seller' };
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const sellers = await User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await User.countDocuments(query);

    res.json({
      data: sellers,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve seller
// @route   PUT /api/admin/sellers/:id/approve
// @access  Private/Admin
const approveSeller = async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);
    if (seller && seller.role === 'seller') {
      seller.status = 'Approved';
      await seller.save();
      res.json({ message: 'Seller approved successfully', sellerId: seller._id, status: seller.status });
    } else {
      res.status(404).json({ message: 'Seller not found or not a seller' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject seller
// @route   PUT /api/admin/sellers/:id/reject
// @access  Private/Admin
const rejectSeller = async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);
    if (seller && seller.role === 'seller') {
      seller.status = 'Rejected';
      await seller.save();
      res.json({ message: 'Seller rejected successfully', sellerId: seller._id, status: seller.status });
    } else {
      res.status(404).json({ message: 'Seller not found or not a seller' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete seller
// @route   DELETE /api/admin/sellers/:id
// @access  Private/Admin
const deleteSeller = async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);
    if (seller) {
      // Optionally cascade delete their vehicles, but leave it for now
      await seller.deleteOne();
      res.json({ message: 'Seller removed' });
    } else {
      res.status(404).json({ message: 'Seller not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all vehicles
// @route   GET /api/admin/vehicles
// @access  Private/Admin
const getVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }
    
    if (req.query.search) {
      query.$or = [
        { vehicleName: { $regex: req.query.search, $options: 'i' } },
        { brand: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const vehicles = await Vehicle.find(query)
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Vehicle.countDocuments(query);

    res.json({
      data: vehicles,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update vehicle status/availability
// @route   PUT /api/admin/vehicles/:id/status
// @access  Private/Admin
const updateVehicleStatus = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (vehicle) {
      if (req.body.status) vehicle.status = req.body.status; // e.g., Approved, Rejected
      if (req.body.availability !== undefined) vehicle.availability = req.body.availability;
      
      const updatedVehicle = await vehicle.save();
      res.json(updatedVehicle);
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a vehicle
// @route   DELETE /api/admin/vehicles/:id
// @access  Private/Admin
const deleteAdminVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (vehicle) {
      await vehicle.deleteOne();
      res.json({ message: 'Vehicle removed by Admin' });
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private/Admin
const getBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('vehicleId', 'vehicleName category')
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Booking.countDocuments();

    res.json({
      data: bookings,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update booking (e.g. status)
// @route   PUT /api/admin/bookings/:id
// @access  Private/Admin
const updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (booking) {
      booking.bookingStatus = req.body.bookingStatus || booking.bookingStatus;
      booking.paymentStatus = req.body.paymentStatus || booking.paymentStatus;
      const updatedBooking = await booking.save();
      res.json(updatedBooking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel booking
// @route   PUT /api/admin/bookings/:id/cancel
// @access  Private/Admin
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (booking) {
      booking.bookingStatus = 'Cancelled';
      const updatedBooking = await booking.save();
      res.json({ message: 'Booking cancelled successfully', booking: updatedBooking });
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all payments
// @route   GET /api/admin/payments
// @access  Private/Admin
const getPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const payments = await Payment.find().populate('userId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Payment.countDocuments();

    res.json({
      data: payments,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all messages
// @route   GET /api/admin/messages
// @access  Private/Admin
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({});
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
