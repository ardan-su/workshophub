const express = require('express');
const router = express.Router();
const sparePartController = require('../controllers/sparePart.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(authenticate, authorize('admin'));

router.post('/', sparePartController.create);
router.get('/', sparePartController.listAll);
router.get('/simple', sparePartController.listSimple);
router.get('/low-stock', sparePartController.lowStock);
router.get('/:id', sparePartController.getOne);
router.put('/:id', sparePartController.update);
router.delete('/:id', sparePartController.remove);

module.exports = router;
