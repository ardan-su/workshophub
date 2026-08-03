const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { uploadVehiclePhoto } = require('../middleware/upload.middleware');

router.use(authenticate);

router.post('/', uploadVehiclePhoto.single('photo'), vehicleController.create);
router.get('/mine', authorize('customer'), vehicleController.listMine);
router.get('/', authorize('admin'), vehicleController.listAll);
router.get('/:id', vehicleController.getOne);
router.get('/:id/history', vehicleController.history);
router.put('/:id', uploadVehiclePhoto.single('photo'), vehicleController.update);
router.delete('/:id', vehicleController.remove);

module.exports = router;
