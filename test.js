
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    const admin = await User.findOne({ role: 'admin' });
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    try {
        const response = await fetch('http://localhost:5000/api/admin/users?page=1&limit=10&search=', {
            headers: { Authorization: 'Bearer ' + token }
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Users length:', data.data.length);
    } catch (e) {
        console.log('Error:', e.message);
    }
    
    mongoose.disconnect();
}
test();

