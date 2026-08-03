const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(authenticate, authorize('admin'));

router.get('/services', reportController.services);
router.get('/bookings', reportController.bookings);
router.get('/revenue', reportController.revenue);
router.get('/inventory', reportController.inventory);

module.exports = router;
