const express = require('express');
const router = express.Router();
const mechanicController = require('../controllers/mechanic.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { uploadAvatar } = require('../middleware/upload.middleware');

router.use(authenticate);

router.get('/active', mechanicController.listActive); // any authenticated role may need this for dropdowns
router.use(authorize('admin'));

router.post('/', uploadAvatar.single('avatar'), mechanicController.create);
router.get('/', mechanicController.listAll);
router.get('/:id', mechanicController.getOne);
router.put('/:id', uploadAvatar.single('avatar'), mechanicController.update);
router.delete('/:id', mechanicController.remove);

module.exports = router;
