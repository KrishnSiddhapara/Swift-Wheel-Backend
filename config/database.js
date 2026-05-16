const mongoose = require('mongoose');

const connectDB = async () => {
  // 1 = connected, 2 = connecting — skip if already live
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://siddhaparakrishn_db_user:12341234@cluster0.cghkt0p.mongodb.net/?appName=Cluster0', {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      connectTimeoutMS: 30000,
    });

    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Force close so next request tries fresh
    await mongoose.connection.close();
    throw error;
  }
};

module.exports = connectDB;