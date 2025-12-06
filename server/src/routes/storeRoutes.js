const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const storeController = require('../controllers/storeController');

router.post('/add', authMiddleware, storeController.addStore);
router.get('/list', authMiddleware, storeController.listStores);
router.put('/:storeId', authMiddleware, storeController.updateStore);
router.delete('/:storeId', authMiddleware, storeController.deleteStore);

module.exports = router;
