const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private/User
const createBooking = async (req, res) => {
  try {
    const { vehicleId, pickupLocation, startDate, endDate, drivingLicense, voterId } = req.body;

    if (!vehicleId || !startDate || !endDate || !pickupLocation || !drivingLicense || !voterId) {
      return res.status(400).json({ message: 'Please provide all required fields, including verification documents.' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if the user already has a pending booking for this exact slot
    const existingPending = await Booking.findOne({
      userId: req.user._id,
      vehicleId,
      bookingStatus: 'Pending',
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    if (existingPending) {
      return res.status(200).json(existingPending);
    }

    // Check availability overlapping
    const overlappingBookings = await Booking.find({
      vehicleId,
      bookingStatus: { $in: ['Pending', 'Confirmed', 'Active'] },
      $or: [
        { startDate: { $lt: new Date(endDate) }, endDate: { $gt: new Date(startDate) } }
      ]
    });

    if (overlappingBookings.length > 0 || vehicle.availabilityStatus === 'unavailable') {
      return res.status(400).json({ message: 'Vehicle is currently unavailable for the selected dates' });
    }

    // Auto calculate total price
    const start = new Date(startDate);
    const end = new Date(endDate);
    const hours = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60));

    // Validate Duration Constraints
    if (vehicle.category === 'Car') {
      if (hours < 4) return res.status(400).json({ message: 'Car bookings require a minimum of 4 hours.' });
      if (hours > 144) return res.status(400).json({ message: 'Car bookings cannot exceed 6 days.' });
    } else if (vehicle.category === 'Bike' || vehicle.category === 'Moped') {
      if (hours < 2) return res.status(400).json({ message: `${vehicle.category} bookings require a minimum of 2 hours.` });
      if (hours > 72) return res.status(400).json({ message: `${vehicle.category} bookings cannot exceed 3 days.` });
    }

    let basePrice = 0;
    if (hours < 24) {
      basePrice = vehicle.pricePerHour * (hours || 1); // at least 1 hour
    } else {
      const days = Math.ceil(hours / 24);
      basePrice = vehicle.pricePerDay * days;
    }

    let platformFee = 0;
    let gstAmount = 0;
    let securityDeposit = 0;

    if (vehicle.category === 'Car') {
      platformFee = 100;
      gstAmount = Math.round(basePrice * 0.12);
      securityDeposit = 3000;
    } else {
      platformFee = 50;
      gstAmount = Math.round(basePrice * 0.05);
      securityDeposit = 500;
    }

    const totalAmount = basePrice + platformFee + gstAmount + securityDeposit;

    const booking = new Booking({
      userId: req.user._id,
      vehicleId,
      sellerId: vehicle.sellerId,
      pickupLocation,
      startDate,
      endDate,
      basePrice,
      platformFee,
      gstAmount,
      securityDeposit,
      totalAmount,
      drivingLicense,
      voterId
    });

    const createdBooking = await booking.save();

    // Mark vehicle as unavailable instantly since it's booked
    vehicle.availabilityStatus = 'unavailable';
    vehicle.expectedAvailableAt = endDate;
    await vehicle.save();

    // Emit socket event to all clients to update vehicle UI
    const io = req.app.get('io');
    if (io) {
        io.emit('vehicle_availability_updated', {
            vehicleId: vehicle._id,
            availabilityStatus: 'unavailable',
            expectedAvailableAt: endDate
        });
    }

    res.status(201).json(createdBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user bookings (paginated, vehicle populated)
// @route   GET /api/bookings/my-bookings
// @access  Private
// @query    page, limit, tab=all|upcoming|active|completed|cancelled
const getMyBookings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;
    const tab = (req.query.tab || 'all').toLowerCase();

    const now = new Date();
    let tabFilter = {};
    switch (tab) {
      case 'cancelled':
        tabFilter = { bookingStatus: 'Cancelled' };
        break;
      case 'upcoming':
        tabFilter = {
          bookingStatus: { $nin: ['Cancelled', 'Completed'] },
          startDate: { $gt: now },
        };
        break;
      case 'active':
        tabFilter = {
          $or: [
            { bookingStatus: 'Active' },
            {
              bookingStatus: 'Confirmed',
              paymentStatus: 'Paid',
              startDate: { $lte: now },
              endDate: { $gte: now },
            },
          ],
        };
        break;
      case 'completed':
        tabFilter = {
          $or: [
            { bookingStatus: 'Completed' },
            {
              paymentStatus: 'Paid',
              endDate: { $lt: now },
              bookingStatus: { $in: ['Confirmed', 'Active'] },
            },
          ],
        };
        break;
      default:
        tabFilter = {};
    }

    const filter = { userId: req.user._id, ...tabFilter };

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate(
        'vehicleId',
        'vehicleName brand category images location fuelType transmission seatingCapacity mileage color pricePerHour pricePerDay'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      bookings,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single booking for logged-in user
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      'vehicleId',
      'vehicleName brand category images location fuelType transmission seatingCapacity mileage color pricePerHour pricePerDay description'
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel booking
// @route   DELETE /api/bookings/:id
// @access  Private/User
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    if (booking.bookingStatus === 'Cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    if (booking.bookingStatus === 'Completed') {
      return res.status(400).json({ message: 'Completed bookings cannot be cancelled' });
    }

    const now = new Date();
    if (booking.bookingStatus === 'Active' || (booking.paymentStatus === 'Paid' && now >= new Date(booking.startDate))) {
      return res.status(400).json({ message: 'Rental has started; cancellation is not available online. Please contact support.' });
    }

    if (!['Pending', 'Confirmed'].includes(booking.bookingStatus)) {
      return res.status(400).json({ message: 'This booking cannot be cancelled' });
    }

    booking.bookingStatus = 'Cancelled';
    if (booking.paymentStatus === 'Paid') {
      booking.paymentStatus = 'Refunded';
    } else if (booking.paymentStatus === 'Pending') {
      booking.paymentStatus = 'Pending';
    }
    const updatedBooking = await booking.save();

    const vehicle = await Vehicle.findById(booking.vehicleId);
    if (vehicle) {
        vehicle.availabilityStatus = 'available';
        vehicle.expectedAvailableAt = null;
        await vehicle.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('vehicle_availability_updated', {
                vehicleId: vehicle._id,
                availabilityStatus: 'available',
                expectedAvailableAt: null
            });
        }
    }

    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Calculate booking price breakdown
// @route   POST /api/bookings/calculate-price
// @access  Public/User
const calculatePrice = async (req, res) => {
  try {
    const { vehicleId, startDate, endDate } = req.body;

    if (!vehicleId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields for calculation' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({ message: 'Return date must be after pickup date' });
    }

    const hours = Math.ceil((end - start) / (1000 * 60 * 60));

    let basePrice = 0;
    if (hours < 24) {
      basePrice = vehicle.pricePerHour * (hours || 1);
    } else {
      const days = Math.ceil(hours / 24);
      basePrice = vehicle.pricePerDay * days;
    }

    let platformFee = 0;
    let gstAmount = 0;
    let securityDeposit = 0;

    if (vehicle.category === 'Car') {
      platformFee = 300;
      gstAmount = Math.round(basePrice * 0.12);
      securityDeposit = 5000;
    } else {
      platformFee = 100;
      gstAmount = Math.round(basePrice * 0.05);
      securityDeposit = 1000;
    }

    const totalAmount = basePrice + platformFee + gstAmount + securityDeposit;

    res.json({
      basePrice,
      platformFee,
      gstAmount,
      securityDeposit,
      totalAmount,
      hours
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createBooking, getMyBookings, getBookingById, cancelBooking, calculatePrice };
