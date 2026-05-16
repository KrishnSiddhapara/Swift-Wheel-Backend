const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const interactionRoutes = require('./routes/interactionRoutes');

// Load env vars
dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://swift-wheel.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

// ❌ REMOVED: startScheduler() — Vercel is serverless, no persistent background jobs
// ❌ REMOVED: fs/path imports and uploads dir creation — Vercel has no writable filesystem

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ❌ REMOVED: express.static for uploads — no local filesystem on Vercel
// Use Cloudinary / S3 / any cloud storage for file uploads instead

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/interactions', interactionRoutes);

// Payment Routes
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('SwiftWheel API is running...');
});

// Custom Error Handler Middleware
app.use(errorHandler);

// Vercel handles the server lifecycle — no app.listen() needed
// For local dev, listen only when not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
} else {
  // On Vercel: connect DB and export app
  connectDB();
}

module.exports = app;