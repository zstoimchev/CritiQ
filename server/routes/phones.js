const router = require('express').Router();
const PhoneController = require('../controller/phone');
const { validate } = require('../middlewares/validate');

// POST /api/phone/
router.post('/', validate(['sid', 'id', 'phone']), PhoneController.create);

// GET /api/phone/?phone=...
router.get('/', PhoneController.getOne);

module.exports = router;