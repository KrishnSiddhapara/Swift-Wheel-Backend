const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
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
const { startScheduler } = require('./services/availabilityScheduler');

// Load env vars
dotenv.config();

// Connect to database
// connectDB() is now called before starting the server

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://swift-wheel.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

// Start the availability scheduler background job
startScheduler();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

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
  crossOriginResourcePolicy: false, // needed for serving local images when accessed from frontend
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static directory for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Start Server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});