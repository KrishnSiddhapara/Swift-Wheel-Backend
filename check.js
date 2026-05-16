const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const Vehicle = require('./models/Vehicle');
const fs = require('fs');

dotenv.config();

const check = async () => {
    await connectDB();
    const data = fs.readFileSync('../Car-Rental-1-master/src/data/vehicles.js', 'utf8');
    const matches = data.match(/name:\s*'([^']+)'/g);
    const names = matches.map(m => m.match(/'([^']+)'/)[1]);
    
    let inDb = 0;
    let notInDb = [];
    for(const name of names) {
        // try to find by substring or exact match ignoring case
        const v = await Vehicle.findOne({ vehicleName: new RegExp(name.trim(), 'i') });
        if (v) inDb++;
        else notInDb.push(name);
    }
    console.log(`In DB: ${inDb}, Not in DB: ${notInDb.length}`);
    console.log('Not in DB list:', notInDb);
    process.exit(0);
};

check();
