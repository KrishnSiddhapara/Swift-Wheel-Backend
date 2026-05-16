const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleName: { type: String, required: true },
  brand: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Bike', 'Moped', 'Car'], 
    required: true 
  },
  pricePerHour: { type: Number, required: true },
  pricePerDay: { type: Number, required: true },
  location: { type: String, required: true },
  fuelType: { type: String, default: 'Petrol' },
  transmission: { type: String, default: 'Manual' },
  seatingCapacity: { type: Number, required: true },
  mileage: { type: Number, required: true },
  color: { type: String, required: true },
  images: [{ type: String }],
  description: { type: String },
  availability: { type: Boolean, default: true },
  availabilityStatus: {
    type: String,
    enum: ['available', 'unavailable', 'available_soon'],
    default: 'available'
  },
  expectedAvailableAt: { type: Date },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Approved'
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
