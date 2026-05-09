const {wrapAsync} = require('../lib/wrapAsync.js');
const QuestionService = require('../services/question.js');
const {success, created, httpError} = require('../lib/response.js');
const CONSTANTS = require('../lib/constants.js');

// POST /questions/
const create = async (req, res) => {
    const {
        productName,
        productDescription,
        productImageUrl,
        isOrderIdTracking,
        reviewDate,
        excelFile,
        questions,
    } = req.body;

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) throw httpError(400, 'At least one question is required.');

    for (const [i, q] of questions.entries()) {
        if (!q.type || !Object.values(CONSTANTS.QUESTION_TYPE).includes(q.type)) throw httpError(400, `Question ${i + 1}: invalid or missing type. Must be one of: ${Object.values(CONSTANTS.QUESTION_TYPE).join(', ')}`);
        if (!q.q || q.q.trim() === '') throw httpError(400, `Question ${i + 1}: question text is required.`);
    }

    const payload = {
        productName,
        productDescription,
        productImageUrl,
        isOrderIdTracking: Boolean(isOrderIdTracking),
        reviewDate: isOrderIdTracking ? reviewDate : null,
        excelFile: !isOrderIdTracking ? excelFile : null,
        questions,
    };

    const questionSet = await QuestionService.create(payload);
    return created(res, {questionSet}, 'Form submitted successfully!');
};

// GET /questions/:id
const getById = async (req, res) => {
    const {id} = req.params;

    const questionSet = await QuestionService.getById(id);
    if (!questionSet) throw httpError(404, 'Question set not found.');

    return success(res, {
        isOrderIdTracking: questionSet.isOrderIdTracking,
        questions: questionSet.questions,
    });
};

const QuestionController = {
    create: wrapAsync(create),
    getById: wrapAsync(getById),
};

module.exports = QuestionController;