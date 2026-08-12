const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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

// Connect to database before starting server
// connectDB() will be called at the bottom

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('A user connected via socket:', socket.id);
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Start the availability scheduler background job
startScheduler(io);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({ 
  origin: allowedOrigins, 
  credentials: true 
}));
app.use(helmet({
  crossOriginResourcePolicy: false, // needed for serving local images when accessed from frontend
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const os = require('os');

// Dynamic handler to serve uploads from either the local directory or the system temp directory
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const localPath = path.join(__dirname, 'uploads', filename);
  const tempPath = path.join(os.tmpdir(), filename);
  
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  } else if (fs.existsSync(tempPath)) {
    return res.sendFile(tempPath);
  } else {
    return res.status(404).send('File not found');
  }
});

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
const PORT = 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
