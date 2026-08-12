const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
require('dotenv').config();

async function verifyBookingIdempotency() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const vehicleId = '61c4e0fccb499e46665a1234'; // 24-char hex
    const userId = '61c4e0fccb499e46665b1234'; // 24-char hex

    const bookingData = {
        userId: new mongoose.Types.ObjectId(userId),
        vehicleId: new mongoose.Types.ObjectId(vehicleId),
        sellerId: new mongoose.Types.ObjectId(userId), // Dummy
        pickupLocation: 'Amdavad',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-02'),
        basePrice: 1000,
        platformFee: 100,
        gstAmount: 120,
        securityDeposit: 3000,
        totalAmount: 4220,
        drivingLicense: 'url',
        voterId: 'url'
    };

    try {
        // 1. Create first booking
        console.log('Creating first booking...');
        const b1 = new Booking(bookingData);
        await b1.save();
        console.log('First booking saved. ID:', b1._id);

        // 2. Try to "create" again via the logic we added (simulating the controller logic)
        // Controller logic:
        const startDateString = '2026-05-01';
        const endDateString = '2026-05-02';
        
        const existingPending = await Booking.findOne({
            userId: bookingData.userId,
            vehicleId: bookingData.vehicleId,
            bookingStatus: 'Pending',
            startDate: new Date(startDateString),
            endDate: new Date(endDateString)
        });

        if (existingPending) {
            console.log('SUCCESS: Found existing Pending booking. ID:', existingPending._id);
            if (existingPending._id.toString() === b1._id.toString()) {
                console.log('IDEMPOTENCY VERIFIED');
            }
        } else {
            console.log('FAILURE: Existing Pending booking not found');
        }

        // Cleanup
        await Booking.deleteOne({ _id: b1._id });
        console.log('Cleanup done');

    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

verifyBookingIdempotency();
