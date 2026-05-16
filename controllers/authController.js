const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, phone, city, role, licenseNumber } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userRole = role || 'user';
    const user = await User.create({
      name,
      email,
      password,
      phone,
      city,
      role: userRole,
      licenseNumber,
      status: userRole === 'seller' ? 'Pending' : 'Active',
      isApproved: userRole !== 'seller',
      canLogin: userRole !== 'seller'
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if (user.role === 'seller') {
        if (user.status === 'Pending') {
          return res.status(403).json({ message: 'Your seller account is pending admin approval.' });
        }
        if (user.status === 'Rejected') {
          return res.status(403).json({ message: 'Your seller account request has been rejected. Please contact support.' });
        }
        if (user.status === 'Suspended') {
          return res.status(403).json({ message: 'Your seller account has been suspended.' });
        }
        if (!user.canLogin && user.status !== 'Approved' && user.status !== 'Active') {
          return res.status(403).json({ message: 'Your seller account is not authorized to log in.' });
        }
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        role: user.role,
        licenseNumber: user.licenseNumber
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      user.city = req.body.city !== undefined ? req.body.city : user.city;
      if (req.body.email) {
        user.email = req.body.email;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        city: updatedUser.city,
        role: updatedUser.role,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (!req.body.currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      const passToSet = req.body.newPassword || req.body.password;
      if (passToSet) {
        user.password = passToSet;
      }
      await user.save();
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    // Assumes frontend runs on port 5173
    const resetUrl = `${req.protocol}://localhost:5173/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message
      });

      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Google OAuth Login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { credential, role } = req.body;
    
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Initialize the OAuth2Client with the client ID
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    
    let user = await User.findOne({ email });
    const userRole = role || 'user';
    
    if (!user) {
      // Create new user if they don't exist
      user = await User.create({
        name,
        email,
        role: userRole,
        status: userRole === 'seller' ? 'Pending' : 'Active',
        isApproved: userRole !== 'seller',
        canLogin: userRole !== 'seller',
      });
    }

    // Perform the same role and status checks as normal login
    if (user.role === 'seller') {
      if (user.status === 'Pending') {
        return res.status(403).json({ message: 'Your seller account is pending admin approval.' });
      }
      if (user.status === 'Rejected') {
        return res.status(403).json({ message: 'Your seller account request has been rejected. Please contact support.' });
      }
      if (user.status === 'Suspended') {
        return res.status(403).json({ message: 'Your seller account has been suspended.' });
      }
      if (!user.canLogin && user.status !== 'Approved' && user.status !== 'Active') {
        return res.status(403).json({ message: 'Your seller account is not authorized to log in.' });
      }
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: picture, // Return picture so frontend can display it
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Google login failed', error: error.message });
  }
};

module.exports = { register, login, googleLogin, getProfile, updateProfile, updatePassword, forgotPassword, resetPassword };
