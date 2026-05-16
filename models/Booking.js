const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  vehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vehicle', 
    required: true 
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  pickupLocation: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  basePrice: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  securityDeposit: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  drivingLicense: { type: String, required: true },
  voterId: { type: String, required: true },
  bookingStatus: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'], 
    default: 'Pending' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Paid', 'Failed'], 
    default: 'Pending' 
  },
  paymentId: { type: String },
  orderId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
