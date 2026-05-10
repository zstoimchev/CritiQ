const {wrapAsync} = require("../lib/wrapAsync.js");
const UserService = require("../services/user.js");
const CONSTANTS = require("../lib/constants");
const {success, httpError} = require("../lib/response");

// POST /users/signup
const create = async (req, res) => {
    const {companyName, companyEmail, companyLogoUrl, companyDescription, walletAddress} = req.body;

    // Check for duplicate wallet address before hitting DB unique constraint
    const existing = await UserService.getOne({walletAddress});
    if (existing) throw httpError(409, 'A company with this wallet address already exists.');

    const payload = {
        name: companyName,
        email: companyEmail,
        imageUrl: companyLogoUrl,
        description: companyDescription,
        walletAddress: walletAddress,
        type: CONSTANTS.USER_ROLE.COMPANY,
        role: CONSTANTS.USER_ROLE.COMPANY,
    };

    const user = await UserService.create(payload);
    return success(res, {id: user._id}, 'Signup successful!', 201);
};

// POST /users/login
const login = async (req, res) => {
    const {walletAddress} = req.body;

    const user = await UserService.getOne({walletAddress});

    if (!user) throw httpError(401, 'Wallet address not found. Please sign up first.');

    return success(res, {user}, 'Login successful!');
};

const UserController = {
    create: wrapAsync(create),
    login: wrapAsync(login),
};

module.exports = UserController;
