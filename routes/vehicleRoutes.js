const express = require('express');
const router = express.Router();
const { optional } = require('../middleware/authMiddleware');
const { getVehicles, getVehicleById } = require('../controllers/vehicleController');

router.get('/', optional, getVehicles);
router.get('/search', optional, getVehicles);
router.get('/:id', optional, getVehicleById);

module.exports = router;
