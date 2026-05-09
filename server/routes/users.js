const UserController = require("../controller/user");
const {validate, validateEmail} = require("../middlewares/validate");
const router = require("express").Router();

router.post(
    '/signup',
    validate(['companyName', 'companyEmail', 'walletAddress', 'companyLogoUrl', 'companyDescription']),
    validateEmail('companyEmail'),
    UserController.create
);

router.post(
    '/login',
    validate(['walletAddress']),
    UserController.login
);

module.exports = router;
