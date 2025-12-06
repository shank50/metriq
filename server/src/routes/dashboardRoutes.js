const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/stats', authMiddleware, dashboardController.getStats);
router.get('/sales', authMiddleware, dashboardController.getSalesOverTime);
router.get('/customers/top', authMiddleware, dashboardController.getTopCustomers);
router.get('/products/top', authMiddleware, dashboardController.getSalesByProduct);
router.get('/orders/recent', authMiddleware, dashboardController.getRecentOrders);
router.get('/abandoned/stats', authMiddleware, dashboardController.getAbandonedStats);

module.exports = router;
