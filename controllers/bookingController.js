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

    // Check if the user already has a pending booking for this exact vehicle
    // We'll return it to allow them to continue payment
    const existingPending = await Booking.findOne({
      userId: req.user._id,
      vehicleId,
      bookingStatus: 'Pending'
    }).sort({ createdAt: -1 }); // Get the most recent one

    if (existingPending) {
        // If dates are the same (within reason), return it
        const reqStart = new Date(startDate).getTime();
        const reqEnd = new Date(endDate).getTime();
        const existingStart = new Date(existingPending.startDate).getTime();
        const existingEnd = new Date(existingPending.endDate).getTime();

        // Allow 1 minute tolerance or just return it if it's the same vehicle
        if (Math.abs(reqStart - existingStart) < 60000 && Math.abs(reqEnd - existingEnd) < 60000) {
            return res.status(200).json(existingPending);
        }
        
        // If dates are different, we'll mark the old one as Cancelled so it doesn't overlap
        existingPending.bookingStatus = 'Cancelled';
        await existingPending.save();
    }

    // Check availability overlapping (Ignore my own cancelled bookings)
    const overlappingBookings = await Booking.find({
      vehicleId,
      bookingStatus: { $in: ['Pending', 'Confirmed'] },
      userId: { $ne: req.user._id }, // Ignore my own pending bookings here to allow "retries"
      $or: [
        { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
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
      platformFee = 300;
      gstAmount = Math.round(basePrice * 0.12);
      securityDeposit = 5000;
    } else {
      platformFee = 100;
      gstAmount = Math.round(basePrice * 0.05);
      securityDeposit = 1000;
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

    // NOTE: We don't mark vehicle as unavailable status-wise here because:
    // 1. Availability is checked via overlapping bookings in the query.
    // 2. We don't want to lock out the user from their own retries.
    // 3. Status 'unavailable' should be for long-term/manual blocks.

    // Emit socket event to all clients to update vehicle UI (optional since it's pending)
    const io = req.app.get('io');
    if (io) {
        io.emit('vehicle_availability_updated', {
            vehicleId: vehicle._id,
            availabilityStatus: 'available', // Keep it available status-wise
            isBooked: true // Custom flag for UI if needed
        });
    }

    res.status(201).json(createdBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('vehicleId', 'vehicleName brand category image images location pricePerDay')
      .populate('sellerId', 'name email phone')
      .sort({ createdAt: -1 });

    const normalizedBookings = bookings.map(booking => {
      let vImage = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600';
      const vehicle = booking.vehicleId;
      
      if (vehicle) {
        if (vehicle.images && vehicle.images.length > 0) {
          vImage = vehicle.images[0];
        } else if (vehicle.image) {
          vImage = vehicle.image;
        }
      }
      
      if (vImage.startsWith('/uploads')) {
        vImage = `${process.env.BACKEND_URL || 'http://localhost:5000'}${vImage}`;
      } else if (vImage.startsWith('uploads')) {
        vImage = `${process.env.BACKEND_URL || 'http://localhost:5000'}/${vImage}`;
      }

      // Convert Mongoose document to plain object to add custom field
      const bookingObj = booking.toObject();
      bookingObj.vehicleImage = vImage;
      return bookingObj;
    });

    res.json(normalizedBookings);
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

    // Check if user owns the booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    booking.bookingStatus = 'Cancelled';
    const updatedBooking = await booking.save();

    // Revert Vehicle Status if this is the only active booking?
    // A simplified approach is just to revert it to available and calculate waitlist internally
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
        
        // Bonus: Notify waitlisted users here
        // (Implementation details depend on cron, but can be done immediately)
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

module.exports = { createBooking, getMyBookings, cancelBooking, calculatePrice };
