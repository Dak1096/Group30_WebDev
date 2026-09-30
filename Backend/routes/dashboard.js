const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Read only, any signed in role
router.get('/overview', dashboardController.getOverview);
router.get('/charts', dashboardController.getCharts);

module.exports = router;
