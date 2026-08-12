const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

// @desc    Add a vehicle
// @route   POST /api/seller/vehicles
// @access  Private/Seller
const addVehicle = async (req, res) => {
  try {
    const { vehicleName, brand, category, pricePerHour, pricePerDay, location, description, seatingCapacity, mileage, color, fuelType, transmission } = req.body;

    const vehicle = new Vehicle({
      vehicleName,
      brand,
      category,
      pricePerHour,
      pricePerDay,
      location,
      description,
      seatingCapacity,
      mileage,
      color,
      fuelType,
      transmission,
      images: req.files ? req.files.map(file => `/uploads/${file.filename}`) : [],
      sellerId: req.user._id,
    });

    const createdVehicle = await vehicle.save();
    res.status(201).json(createdVehicle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get seller's vehicles
// @route   GET /api/seller/vehicles
// @access  Private/Seller
const getSellerVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { sellerId: req.user._id };
    
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

// @desc    Update a vehicle
// @route   PUT /api/seller/vehicles/:id
// @access  Private/Seller
const updateVehicle = async (req, res) => {
  try {
    const { vehicleName, brand, category, pricePerHour, pricePerDay, location, description, availability, seatingCapacity, mileage, color, fuelType, transmission } = req.body;
    
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
      if (vehicle.sellerId.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Not authorized to update this vehicle' });
      }

      vehicle.vehicleName = vehicleName || vehicle.vehicleName;
      vehicle.brand = brand || vehicle.brand;
      vehicle.category = category || vehicle.category;
      vehicle.pricePerHour = pricePerHour || vehicle.pricePerHour;
      vehicle.pricePerDay = pricePerDay || vehicle.pricePerDay;
      vehicle.location = location || vehicle.location;
      vehicle.description = description || vehicle.description;
      vehicle.availability = availability !== undefined ? availability : vehicle.availability;
      vehicle.seatingCapacity = seatingCapacity || vehicle.seatingCapacity;
      vehicle.mileage = mileage || vehicle.mileage;
      vehicle.color = color || vehicle.color;
      if (fuelType) vehicle.fuelType = fuelType;
      if (transmission) vehicle.transmission = transmission;
      
      if (req.files && req.files.length > 0) {
        vehicle.images = req.files.map(file => `/uploads/${file.filename}`);
      }

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
// @route   DELETE /api/seller/vehicles/:id
// @access  Private/Seller
const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
      if (vehicle.sellerId.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Not authorized to delete this vehicle' });
      }

      await vehicle.deleteOne();
      res.json({ message: 'Vehicle removed' });
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get seller's bookings
// @route   GET /api/seller/bookings
// @access  Private/Seller
const getSellerBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { sellerId: req.user._id };

    const bookings = await Booking.find(query)
      .populate('userId', 'name email phone')
      .populate('vehicleId', 'vehicleName brand category images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Booking.countDocuments(query);

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

// @desc    Get seller's earnings
// @route   GET /api/seller/earnings
// @access  Private/Seller
const getSellerEarnings = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      sellerId: req.user._id, 
      paymentStatus: 'Paid' 
    });

    const totalEarnings = bookings.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

    res.json({
      totalEarnings,
      completedBookings: bookings.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update booking status by seller
// @route   PUT /api/seller/bookings/:id
// @access  Private/Seller
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.sellerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to update this booking' });
    }

    booking.bookingStatus = status;
    const updatedBooking = await booking.save();
    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addVehicle,
  getSellerVehicles,
  updateVehicle,
  deleteVehicle,
  getSellerBookings,
  getSellerEarnings,
  updateBookingStatus
};
