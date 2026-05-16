const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

// @desc    Fetch all vehicles or search vehicles
// @route   GET /api/vehicles
// @route   GET /api/vehicles/search
// @access  Public
const getVehicles = async (req, res) => {
  try {
    const { location, vehicleType, category, priceRange, availability, startDate, endDate } = req.query;

    let query = {};

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Support both vehicleType and category in query for backward compatibility
    const catSearch = category || vehicleType;
    if (catSearch && catSearch !== 'All Vehicles') {
      let cat = catSearch;
      if (cat.endsWith('s')) cat = cat.slice(0, -1); // "Bikes" -> "Bike"
      query.category = { $regex: new RegExp(`^${cat}$`, 'i') };
    }

    if (availability !== undefined) {
      query.availability = availability === 'true';
    }

    if (priceRange) {
      const [min, max] = priceRange.split('-');
      if (min && max) {
        query.pricePerDay = { $gte: Number(min), $lte: Number(max) };
      } else if (min) {
        query.pricePerDay = { $lte: Number(min) };
      }
    }

    // Handle real-time availability using startDate and endDate
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Build booking filter to find overlapping bookings
      const bookingFilter = {
        startDate: { $lt: end },
        endDate: { $gt: start },
      };

      if (req.user) {
        // Exclude vehicles blocked by Confirmed bookings OR
        // Pending bookings from OTHER users (not the current user)
        bookingFilter.$or = [
          { bookingStatus: 'Confirmed' },
          { bookingStatus: 'Pending', userId: { $ne: req.user._id } }
        ];
      } else {
        bookingFilter.bookingStatus = { $in: ['Pending', 'Confirmed'] };
      }

      const overlappingBookings = await Booking.find(bookingFilter);
      const unavailableVehicleIds = overlappingBookings.map(b => b.vehicleId.toString());

      if (unavailableVehicleIds.length > 0) {
        query._id = { $nin: unavailableVehicleIds };
      }
    }

    // Pagination
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;

    const count = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
      .populate('sellerId', 'name email phone')
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ vehicles, page, pages: Math.ceil(count / pageSize), total: count });
  } catch (error) {
    console.error('getVehicles error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch single vehicle
// @route   GET /api/vehicles/:id
// @access  Public
const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('sellerId', 'name email phone');

    if (vehicle) {
      res.json(vehicle);
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    console.error('getVehicleById error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getVehicles, getVehicleById };