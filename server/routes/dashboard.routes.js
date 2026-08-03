const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.get('/admin', authenticate, authorize('admin'), dashboardController.adminOverview);
router.get('/customer', authenticate, authorize('customer'), dashboardController.customerOverview);

module.exports = router;
