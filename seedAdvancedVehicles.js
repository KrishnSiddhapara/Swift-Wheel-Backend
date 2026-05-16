const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Vehicle = require('./models/Vehicle');
const User = require('./models/User');
const connectDB = require('./config/database');

dotenv.config();

const locations = ['Ahmedabad', 'Mumbai', 'Delhi', 'Pune', 'Bangalore', 'Hyderabad'];
const colors = ['Red', 'Black', 'Pearl White', 'Blue', 'Silver', 'Metallic Grey'];

const generateVehicles = (sellerId) => {
  const vehicles = [];
  
  const templates = [
    { brand: 'Honda', name: 'City', category: 'Car', basePrice: 2000, type: 'Petrol', trans: 'Automatic', seats: 5, mileage: 18, img: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800' },
    { brand: 'Hyundai', name: 'Creta', category: 'Car', basePrice: 2500, type: 'Diesel', trans: 'Automatic', seats: 5, mileage: 16, img: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=800' },
    { brand: 'Toyota', name: 'Innova Crysta', category: 'Car', basePrice: 3500, type: 'Diesel', trans: 'Manual', seats: 7, mileage: 12, img: 'https://images.unsplash.com/photo-1605985859338-7c85c2921bae?auto=format&fit=crop&w=800' },
    { brand: 'Maruti Suzuki', name: 'Swift', category: 'Car', basePrice: 1500, type: 'Petrol', trans: 'Manual', seats: 5, mileage: 22, img: 'https://images.unsplash.com/photo-1611016186353-9af58c69a533?auto=format&fit=crop&w=800' },
    { brand: 'Mahindra', name: 'Thar', category: 'Car', basePrice: 4000, type: 'Diesel', trans: 'Manual', seats: 4, mileage: 14, img: 'https://images.unsplash.com/photo-1563720311210-90fe3573e038?auto=format&fit=crop&w=800' },
    { brand: 'Mahindra', name: 'Scorpio N', category: 'Car', basePrice: 3800, type: 'Diesel', trans: 'Manual', seats: 7, mileage: 13, img: 'https://images.unsplash.com/photo-1563720311210-90fe3573e038?auto=format&fit=crop&w=800' },
    { brand: 'Tata', name: 'Nexon', category: 'Car', basePrice: 2300, type: 'Petrol', trans: 'Automatic', seats: 5, mileage: 17, img: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=800' },
    { brand: 'Maruti Suzuki', name: 'Baleno', category: 'Car', basePrice: 1600, type: 'Petrol', trans: 'Automatic', seats: 5, mileage: 23, img: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800' },
    { brand: 'Royal Enfield', name: 'Classic 350', category: 'Bike', basePrice: 900, type: 'Petrol', trans: 'Manual', seats: 2, mileage: 35, img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800' },
    { brand: 'Yamaha', name: 'R15', category: 'Bike', basePrice: 850, type: 'Petrol', trans: 'Manual', seats: 2, mileage: 40, img: 'https://images.unsplash.com/photo-1568772585407-9361f9bf801h?auto=format&fit=crop&w=800' },
    { brand: 'KTM', name: 'Duke 200', category: 'Bike', basePrice: 800, type: 'Petrol', trans: 'Manual', seats: 2, mileage: 35, img: 'https://images.unsplash.com/photo-1588887857212-0fe9dcb7cd94?auto=format&fit=crop&w=800' },
    { brand: 'Bajaj', name: 'Pulsar NS200', category: 'Bike', basePrice: 750, type: 'Petrol', trans: 'Manual', seats: 2, mileage: 38, img: 'https://images.unsplash.com/photo-1568772585407-9361f9bf801h?auto=format&fit=crop&w=800' },
    { brand: 'Hero', name: 'Splendor Plus', category: 'Bike', basePrice: 500, type: 'Petrol', trans: 'Manual', seats: 2, mileage: 65, img: 'https://images.unsplash.com/photo-1588887857212-0fe9dcb7cd94?auto=format&fit=crop&w=800' },
    { brand: 'Honda', name: 'Activa 6G', category: 'Moped', basePrice: 400, type: 'Petrol', trans: 'Automatic', seats: 2, mileage: 45, img: 'https://images.unsplash.com/photo-1614064390543-02b489d2d0fc?auto=format&fit=crop&w=800' },
    { brand: 'TVS', name: 'Jupiter', category: 'Moped', basePrice: 450, type: 'Petrol', trans: 'Automatic', seats: 2, mileage: 48, img: 'https://images.unsplash.com/photo-1614064390543-02b489d2d0fc?auto=format&fit=crop&w=800' },
    { brand: 'Suzuki', name: 'Access 125', category: 'Moped', basePrice: 420, type: 'Petrol', trans: 'Automatic', seats: 2, mileage: 46, img: 'https://images.unsplash.com/photo-1614064390543-02b489d2d0fc?auto=format&fit=crop&w=800' }
  ];

  for (let i = 0; i < 30; i++) {
    const tpl = templates[i % templates.length];
    const loc = locations[Math.floor(Math.random() * locations.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Fallback array containing 2 images for the gallery display
    const images = [
      tpl.img,
      'https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=800' // Generic auto-focused detail image
    ];

    vehicles.push({
      vehicleName: `${tpl.name} - Version ${i+1}`,
      brand: tpl.brand,
      category: tpl.category,
      pricePerHour: Math.floor(tpl.basePrice / 10),
      pricePerDay: tpl.basePrice,
      fuelType: tpl.type,
      transmission: tpl.trans,
      location: loc,
      seatingCapacity: tpl.seats,
      mileage: tpl.mileage,
      color: color,
      images: images,
      description: `Experience the thrill of driving this premium ${color} ${tpl.brand} ${tpl.name} in ${loc}! Excellent condition, perfectly maintained, clean interiors, and ready for your adventure.`,
      availability: true,
      sellerId: sellerId
    });
  }
  return vehicles;
};

const run = async () => {
    try {
        await connectDB();
        
        // Remove all old incompatible vehicles
        await Vehicle.deleteMany({});
        
        // Ensure there is at least one seller to map the vehicles to
        let user = await User.findOne({ email: "seller@test.com" });
        if (!user) {
            user = await User.create({
                name: "Admin Seller",
                email: "seller@test.com",
                password: "password123",
                role: "seller"
            });
        }
        
        const newVehicles = generateVehicles(user._id);
        await Vehicle.insertMany(newVehicles);
        console.log("30 Advanced Vehicles Seeded Successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Seeding Failed:", e);
        process.exit(1);
    }
};

run();
