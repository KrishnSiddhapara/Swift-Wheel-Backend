const Notification = require('../models/Notification');
const Waitlist = require('../models/Waitlist');
const Vehicle = require('../models/Vehicle');

// @desc    Join waitlist for a specific vehicle
// @route   POST /api/interactions/waitlist
// @access  Private
const joinWaitlist = async (req, res) => {
  try {
    const { vehicleId } = req.body;
    
    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle ID is required.' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    // Check if user is already on waitlist
    const existingEntry = await Waitlist.findOne({ userId: req.user._id, vehicleId, status: 'Waiting' });
    if (existingEntry) {
      return res.status(400).json({ message: 'You are already on the waitlist for this vehicle.' });
    }

    const waitlistEntry = new Waitlist({
      userId: req.user._id,
      vehicleId
    });

    await waitlistEntry.save();
    return res.status(201).json({ message: 'Successfully joined the waitlist.', waitlistEntry });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request to be notified for a vehicle
// @route   POST /api/interactions/notify
// @access  Private
const requestNotification = async (req, res) => {
  try {
    const { vehicleId } = req.body;
    
    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle ID is required.' });
    }

    // To prevent spam, check if an unread notification request already exists
    const existingNotification = await Notification.findOne({
        userId: req.user._id,
        vehicleId,
        read: false
    });

    if (existingNotification) {
      return res.status(400).json({ message: 'You have already requested notification for this vehicle.' });
    }

    const notification = new Notification({
      userId: req.user._id,
      vehicleId,
      message: 'You requested to be notified when this vehicle becomes available.'
    });

    await notification.save();
    res.status(201).json({ message: 'We will notify you when it becomes available.', notification });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user notifications
// @route   GET /api/interactions/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Mark notification as read
// @route   PUT /api/interactions/notifications/:id/read
// @access  Private
const markNotificationRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { read: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = { joinWaitlist, requestNotification, getNotifications, markNotificationRead };
