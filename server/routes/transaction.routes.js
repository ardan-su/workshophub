const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/mine', authorize('customer'), transactionController.listMine);
router.get('/', authorize('admin'), transactionController.listAll);
router.post('/', authorize('admin'), transactionController.create);
router.patch('/:id/pay', authorize('admin'), transactionController.markPaid);

module.exports = router;
