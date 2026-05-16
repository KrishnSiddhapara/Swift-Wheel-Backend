const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Vehicle = require('./models/Vehicle');
const User = require('./models/User');
const connectDB = require('./config/database');

dotenv.config();

const mockVehicles = [
  {
    name: 'Royal Enfield Classic 350',
    brand: 'Royal Enfield',
    category: 'Bike',
    pricePerDay: 900,
    fuelType: 'Petrol',
    transmission: 'Manual',
    location: 'Ahmedabad',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&auto=format&fit=crop',
  },
  {
    name: 'Yamaha R15',
    brand: 'Yamaha',
    category: 'Bike',
    pricePerDay: 850,
    fuelType: 'Petrol',
    transmission: 'Manual',
    location: 'Mumbai',
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf801h?w=500&auto=format&fit=crop',
  },
  {
    name: 'KTM Duke 200',
    brand: 'KTM',
    category: 'Bike',
    pricePerDay: 800,
    fuelType: 'Petrol',
    transmission: 'Manual',
    location: 'Delhi',
    image: 'https://images.unsplash.com/photo-1588887857212-0fe9dcb7cd94?w=500&auto=format&fit=crop',
  },
  {
    name: 'Bajaj Pulsar NS200',
    brand: 'Bajaj',
    category: 'Bike',
    pricePerDay: 750,
    fuelType: 'Petrol',
    transmission: 'Manual',
    location: 'Pune',
    image: 'https://images.unsplash.com/photo-1568284561858-bdba21389814?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 
  },
  {
    name: 'Honda Hornet 2.0',
    brand: 'Honda',
    category: 'Bike',
    pricePerDay: 700,
    fuelType: 'Petrol',
    transmission: 'Manual',
    location: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    name: 'Honda Activa 6G',
    brand: 'Honda',
    category: 'Moped',
    pricePerDay: 400,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    location: 'Ahmedabad',
    image: 'https://images.unsplash.com/photo-1614064390543-02b489d2d0fc?w=500&auto=format&fit=crop',
  },
  {
    name: 'TVS Jupiter',
    brand: 'TVS',
    category: 'Moped',
    pricePerDay: 450,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    location: 'Hyderabad',
    image: 'https://images.unsplash.com/photo-1614064390543-02b489d2d0fc?w=500&auto=format&fit=crop',
  },
  {
    name: 'Suzuki Access 125',
    brand: 'Suzuki',
    category: 'Moped',
    pricePerDay: 450,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    location: 'Mumbai',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    name: 'Hero Pleasure+',
    brand: 'Hero',
    category: 'Moped',
    pricePerDay: 350,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    location: 'Delhi',
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf80h?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    name: 'Maruti Suzuki Swift',
    brand: 'Maruti Suzuki',
    category: 'Car',
    pricePerDay: 1800,
    fuelType: 'Petrol',
    transmission: 'Manual',
    location: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1611016186353-9af58c69a533?w=500&auto=format&fit=crop',
  },
  {
    name: 'Hyundai Creta',
    brand: 'Hyundai',
    category: 'Car',
    pricePerDay: 2500,
    fuelType: 'Diesel',
    transmission: 'Automatic',
    location: 'Hyderabad',
    image: 'https://images.unsplash.com/photo-1563720224160-bfe72e380e22?w=500&auto=format&fit=crop',
  },
  {
    name: 'Tata Nexon',
    brand: 'Tata',
    category: 'Car',
    pricePerDay: 2300,
    fuelType: 'Petrol',
    transmission: 'Manual',
    location: 'Pune',
    image: 'https://images.unsplash.com/photo-1503376766444-124b17e4bbd1?w=500&auto=format&fit=crop',
  },
  {
    name: 'Toyota Innova Crysta',
    brand: 'Toyota',
    category: 'Car',
    pricePerDay: 3500,
    fuelType: 'Diesel',
    transmission: 'Automatic',
    location: 'Mumbai',
    image: 'https://images.unsplash.com/photo-1605985859338-7c85c2921bae?w=500&auto=format&fit=crop',
  },
  {
    name: 'Mahindra Thar',
    brand: 'Mahindra',
    category: 'Car',
    pricePerDay: 4000,
    fuelType: 'Diesel',
    transmission: 'Manual',
    location: 'Ahmedabad',
    image: 'https://images.unsplash.com/photo-1563720311210-90fe3573e038?w=500&auto=format&fit=crop',
  }
];

const seedDB = async () => {
    try {
        await connectDB();
        
        // Remove existing
        await Vehicle.deleteMany({});
        await User.deleteMany({});

        // Create a dummy seller
        const user = await User.create({
            name: "Admin Seller",
            email: "seller@test.com",
            password: "password123",
            role: "seller"
        });

        // Create a true admin user
        await User.create({
            name: "Super Admin",
            email: "admin@test.com",
            password: "password123",
            role: "admin"
        });

        // Insert mock vehicles
        const vehiclesWithSeller = mockVehicles.map(v => ({
            vehicleName: v.name,
            brand: v.brand,
            category: v.category,
            pricePerHour: Math.floor(v.pricePerDay / 10),
            pricePerDay: v.pricePerDay,
            fuelType: v.fuelType,
            transmission: v.transmission,
            location: v.location,
            image: v.image,
            sellerId: user._id
        }));

        await Vehicle.insertMany(vehiclesWithSeller);
        console.log("DB Seeded Successfully!");
        process.exit();
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

seedDB();
