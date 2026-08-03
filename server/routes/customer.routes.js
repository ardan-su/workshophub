const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(authenticate, authorize('admin'));

router.get('/', customerController.list);
router.get('/:id', customerController.getOne);
router.put('/:id', customerController.update);
router.patch('/:id/active', customerController.setActive);
router.delete('/:id', customerController.remove);

module.exports = router;
