const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(authenticate, authorize('admin'));

router.post('/stock-in', inventoryController.stockIn);
router.post('/stock-out', inventoryController.stockOut);
router.get('/history', inventoryController.history);

module.exports = router;
