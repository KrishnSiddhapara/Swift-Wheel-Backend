const express = require('express');
const router = express.Router();
const { joinWaitlist, requestNotification, getNotifications, markNotificationRead } = require('../controllers/interactionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/waitlist', protect, joinWaitlist);
router.post('/notify', protect, requestNotification);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);

module.exports = router;
