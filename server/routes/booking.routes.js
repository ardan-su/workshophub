const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(authenticate);

router.post('/', authorize('customer'), bookingController.create);
router.get('/mine', authorize('customer'), bookingController.listMine);
router.get('/', authorize('admin'), bookingController.listAll);
router.get('/:id', bookingController.getOne);
router.patch('/:id/accept', authorize('admin'), bookingController.accept);
router.patch('/:id/reject', authorize('admin'), bookingController.reject);
router.patch('/:id/reschedule', authorize('admin'), bookingController.reschedule);

module.exports = router;
