const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
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
  requestTime: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['Waiting', 'Notified'], 
    default: 'Waiting' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Waitlist', waitlistSchema);
