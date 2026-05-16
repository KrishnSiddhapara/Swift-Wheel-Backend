const Vehicle = require('../models/Vehicle');

const checkAvailabilitySoon = async (io) => {
    try {
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
        
        // Find vehicles that are currently unavailable but will be available within 2 hours
        const vehiclesToUpdate = await Vehicle.find({
            availabilityStatus: 'unavailable',
            expectedAvailableAt: { $lte: twoHoursFromNow, $ne: null }
        });

        for (const vehicle of vehiclesToUpdate) {
            vehicle.availabilityStatus = 'available_soon';
            await vehicle.save();

            // Emit socket event
            if (io) {
                io.emit('vehicle_availability_updated', {
                    vehicleId: vehicle._id,
                    availabilityStatus: 'available_soon',
                    expectedAvailableAt: vehicle.expectedAvailableAt
                });
            }
        }
    } catch (error) {
        console.error('Error in availabilityScheduler:', error);
    }
};

const startScheduler = (io) => {
    // Run every 5 minutes
    setInterval(() => {
        checkAvailabilitySoon(io);
    }, 5 * 60 * 1000);
    // Also run immediately on start
    setTimeout(() => {
        checkAvailabilitySoon(io);
    }, 5000);
};

module.exports = { startScheduler };
