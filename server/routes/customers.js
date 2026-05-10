const Router = require('express').Router;
const CustomerController = require('../controller/customer');
const { createCustomer, loginCustomer, sendOtp, getBalance, sendMoney, getAll } = require('../controller/customer');
const {validate, validateEmail} = require("../middlewares/validate");

const router = Router();

// POST /api/customers/create
router.post(
    '/create',
    validate(['companyEmail', 'walletAddress']),
    validateEmail('companyEmail'),
    CustomerController.createCustomer
);

// POST /api/customers/login
router.post(
    '/login',
    validate(['walletAddress']),
    CustomerController.loginCustomer
);

// POST /api/customers/sendotp
router.post(
    '/sendotp',
    validate(['email', 'otp']),
    validateEmail('email'),
    CustomerController.sendOtp
);

// POST /api/customers/sendmoney
router.post(
    '/sendmoney',
    validate(['key']),
    CustomerController.sendMoney
);

// GET /api/customers/getbalance?pkey=...
router.get('/getbalance', CustomerController.getBalance);

// GET /api/customers/getall
router.get('/getall', CustomerController.getAll);


module.exports = router;
