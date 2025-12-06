const express = require('express');
const router = express.Router();
const ingestionController = require('../controllers/ingestionController');
const authMiddleware = require('../middleware/authMiddleware');
const bulkSyncController = require('../controllers/bulkSyncController');

router.post('/sync', authMiddleware, ingestionController.syncData);
router.post('/sync-all', authMiddleware, bulkSyncController.syncAllStores);

module.exports = router;
