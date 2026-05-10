const router = require('express').Router();
const QuestionController = require('../controller/question');
const { validate } = require('../middlewares/validate');

// POST /api/questions/
router.post(
    '/',
    validate(['productName', 'productDescription', 'productImageUrl', 'questions']),
    QuestionController.create
);

// GET /api/questions/:id
router.get('/:id', QuestionController.getById);

module.exports = router;