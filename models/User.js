const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // optional for oauth users
  googleId: { type: String },
  phone: { type: String },
  city: { type: String },
  role: { 
    type: String, 
    enum: ['user', 'seller', 'admin'], 
    default: 'user' 
  },
  status: {
    type: String,
    enum: ['Active', 'Blocked', 'Pending', 'Approved', 'Rejected'],
    default: 'Active'
  },
  licenseNumber: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to match entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!enteredPassword || !this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
