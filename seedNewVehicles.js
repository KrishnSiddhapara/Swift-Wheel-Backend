const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const Vehicle = require('./models/Vehicle');
const User = require('./models/User');

dotenv.config();

const newVehicles = [
  {
    vehicleName: 'Honda Shine',
    brand: 'Honda',
    category: 'Bike',
    pricePerDay: 450,
    pricePerHour: Math.round(450 / 24),
    location: 'Delhi',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seatingCapacity: 2,
    mileage: 65,
    color: 'Black',
    images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&auto=format&fit=crop'],
    description: 'A comfortable and reliable commuter bike.'
  },
  {
    vehicleName: 'Honda Livo',
    brand: 'Honda',
    category: 'Bike',
    pricePerDay: 480,
    pricePerHour: Math.round(480 / 24),
    location: 'Pune',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seatingCapacity: 2,
    mileage: 60,
    color: 'Blue',
    images: ['https://images.unsplash.com/photo-1568772585407-9361f9bf801h?w=500&auto=format&fit=crop'],
    description: 'Stylish commuter bike.'
  },
  {
    vehicleName: 'Hero Splendor Plus',
    brand: 'Hero',
    category: 'Bike',
    pricePerDay: 350,
    pricePerHour: Math.round(350 / 24),
    location: 'Ahmedabad',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seatingCapacity: 2,
    mileage: 70,
    color: 'Black/Silver',
    images: ['https://images.unsplash.com/photo-1588887857212-0fe9dcb7cd94?w=500&auto=format&fit=crop'],
    description: 'The most popular and reliable bike.'
  },
  {
    vehicleName: 'Hero Glamour',
    brand: 'Hero',
    category: 'Bike',
    pricePerDay: 500,
    pricePerHour: Math.round(500 / 24),
    location: 'Mumbai',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seatingCapacity: 2,
    mileage: 55,
    color: 'Red/Black',
    images: ['https://images.unsplash.com/photo-1568284561858-bdba21389814?w=500&auto=format&fit=crop&q=60'],
    description: 'Premium commuter bike.'
  },
  {
    vehicleName: 'Suzuki Access 125',
    brand: 'Suzuki',
    category: 'Moped',
    pricePerDay: 450,
    pricePerHour: Math.round(450 / 24),
    location: 'Delhi',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seatingCapacity: 2,
    mileage: 50,
    color: 'White',
    images: ['https://images.unsplash.com/photo-1614064390543-02b489d2d0fc?w=500&auto=format&fit=crop'],
    description: 'Powerful and comfortable family scooter.'
  },
  {
    vehicleName: 'Honda Dio',
    brand: 'Honda',
    category: 'Moped',
    pricePerDay: 400,
    pricePerHour: Math.round(400 / 24),
    location: 'Bangalore',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seatingCapacity: 2,
    mileage: 45,
    color: 'Yellow',
    images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&auto=format&fit=crop&q=60'],
    description: 'Sporty scooter for the youth.'
  },
  {
    vehicleName: 'TVS Star City Plus',
    brand: 'TVS',
    category: 'Bike',
    pricePerDay: 400,
    pricePerHour: Math.round(400 / 24),
    location: 'Hyderabad',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seatingCapacity: 2,
    mileage: 65,
    color: 'Red',
    images: ['https://images.unsplash.com/photo-1568772585407-9361f9bf80h?w=500&auto=format&fit=crop&q=60'],
    description: 'High mileage, low maintenance bike.'
  },
  {
    vehicleName: 'Bajaj CT 100',
    brand: 'Bajaj',
    category: 'Bike',
    pricePerDay: 350,
    pricePerHour: Math.round(350 / 24),
    location: 'Pune',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seatingCapacity: 2,
    mileage: 75,
    color: 'Blue',
    images: ['https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=500&auto=format&fit=crop&q=60'],
    description: 'The most fuel efficient bike.'
  },
  {
    vehicleName: 'Yamaha FZ FI',
    brand: 'Yamaha',
    category: 'Bike',
    pricePerDay: 700,
    pricePerHour: Math.round(700 / 24),
    location: 'Ahmedabad',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seatingCapacity: 2,
    mileage: 45,
    color: 'Black',
    images: ['https://images.unsplash.com/photo-1588887857212-0fe9dcb7cd94?w=500&auto=format&fit=crop'],
    description: 'Muscular street fighter.'
  },
  {
    vehicleName: 'Suzuki Gixxer',
    brand: 'Suzuki',
    category: 'Bike',
    pricePerDay: 750,
    pricePerHour: Math.round(750 / 24),
    location: 'Mumbai',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seatingCapacity: 2,
    mileage: 40,
    color: 'Silver',
    images: ['https://images.unsplash.com/photo-1568284561858-bdba21389814?w=500&auto=format&fit=crop&q=60'],
    description: 'Sporty and agile performance bike.'
  }
];

const seed = async () => {
  try {
    await connectDB();
    
    // Find a seller user to assign vehicles to
    let seller = await User.findOne({ role: 'seller' });
    
    // If no seller, try admin or any user
    if (!seller) {
      seller = await User.findOne({ role: 'admin' });
    }
    if (!seller) {
      seller = await User.findOne();
    }

    if (!seller) {
      console.log('No user found to assign vehicles, creating dummy seller');
      seller = await User.create({
        name: 'Dummy Seller',
        email: 'seller@dummy.com',
        password: 'password123',
        role: 'seller',
        phone: '1234567890'
      });
    }

    const sellerId = seller._id;

    for (let data of newVehicles) {
      data.sellerId = sellerId;
      data.status = 'Approved'; 
    }

    await Vehicle.insertMany(newVehicles);
    console.log('Successfully inserted 10 new vehicles to MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding vehicles: ', error);
    process.exit(1);
  }
};

seed();
