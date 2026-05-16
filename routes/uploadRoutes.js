const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Route specifically for uploading a vehicle image independently
router.post('/vehicle-image', protect, authorize('seller', 'admin'), upload.single('image'), (req, res) => {
  if (req.file) {
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: `/uploads/${req.file.filename}`
    });
  } else {
    res.status(400).json({ message: 'No image provided or invalid file type' });
  }
});

// Route for users to upload verification documents (Driving License, Voter ID)
router.post('/document', protect, upload.single('document'), (req, res) => {
  if (req.file) {
    res.json({
      message: 'Document uploaded successfully',
      documentUrl: `/uploads/${req.file.filename}`
    });
  } else {
    res.status(400).json({ message: 'No document provided or invalid file type' });
  }
});

module.exports = router;
