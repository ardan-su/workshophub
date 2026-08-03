const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/statuses', serviceController.getStatuses);
router.get('/mine', authorize('customer'), serviceController.listMine);
router.get('/mine/active', authorize('customer'), serviceController.listMineActive);
// Accessible to both roles - ownership is enforced inside the controller.
router.get('/:id', serviceController.getOne);

router.use(authorize('admin'));
router.post('/', serviceController.create);
router.get('/', serviceController.listAll);
router.patch('/:id/assign-mechanic', serviceController.assignMechanic);
router.patch('/:id/status', serviceController.updateStatus);
router.put('/:id/details', serviceController.updateDetails);
router.post('/:id/parts', serviceController.addPart);

module.exports = router;
