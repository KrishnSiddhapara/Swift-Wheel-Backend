const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  bookingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: true 
  },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  transactionId: { type: String },
  status: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed'], 
    default: 'Pending' 
  },
  paymentDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
