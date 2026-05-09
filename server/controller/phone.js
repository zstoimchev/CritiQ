const {wrapAsync} = require('../lib/wrapAsync.js');
const PhoneService = require('../services/phone.js');
const {success, httpError} = require('../lib/response.js');

// POST /phone/
const create = async (req, res) => {
    const {sid, id, phone} = req.body;

    // Check for duplicate
    const existing = await PhoneService.getOne({phone});
    if (existing) throw httpError(409, 'This phone number is already registered.');

    await PhoneService.create({sid, id, phone});
    return success(res, null, 'Phone added successfully.');
};

// GET /phone/?phone=...
const getOne = async (req, res) => {
    const {phone} = req.query;
    if (!phone) throw httpError(400, 'Query param `phone` is required.');

    const data = await PhoneService.getOne({phone});
    if (!data) return success(res, {status: 0});

    return success(res, {status: 1, data});
};

const PhoneController = {
    create: wrapAsync(create),
    getOne: wrapAsync(getOne),
};

module.exports = PhoneController;