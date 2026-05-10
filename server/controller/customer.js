const {wrapAsync} = require('../lib/wrapAsync.js');
const CustomerService = require('../services/customer.js');
const {success, httpError} = require('../lib/response.js');
const nodemailer = require('nodemailer');
const {
    Keypair,
    TransactionBuilder,
    Operation,
    Networks,
} = require("diamante-base");
const {Horizon, Asset} = require("diamante-sdk-js");

const SENDER_SECRET = process.env.DIAM_SENDER_SECRET || 'SBBXMWUSGQDDH73N3NICSCFH3B5NQA3QF6PZ7KRIZPNFIOCE7JI4NGZ3';
const REWARD_AMOUNT = '1';

async function sendOTPViaEmail(to, otp) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.SMTP_MAIL,
        to,
        subject: 'Your CritiQ OTP',
        html: `<h3>Your OTP is: <strong>${otp}</strong></h3><p>Do not share this with anyone.</p>`,
    });
}

// POST /customers/create
const createCustomer = async (req, res) => {
    const {name, companyEmail, walletAddress} = req.body;

    // 409 on duplicate wallet
    const existing = await CustomerService.getOne({walletAddress});
    if (existing) throw httpError(409, 'A customer with this wallet address already exists.');

    // Activate a new on-chain account
    const keypair = Keypair.random();
    const pkey = keypair.publicKey();
    const skey = keypair.secret();

    const fetch = await import('node-fetch').then((m) => m.default);
    const fbRes = await fetch(`https://friendbot.diamcircle.io/?addr=${pkey}`);
    if (!fbRes.ok) throw httpError(502, `Failed to activate blockchain account: ${fbRes.statusText}`);

    const customer = await CustomerService.create({
        name: name,
        email: companyEmail,
        walletAddress: walletAddress,
        type: 'user',
        pkey,
        skey,
    });

    return success(res, {id: customer._id}, 'Signup successful!', 201);
};

// POST /customers/login
const loginCustomer = async (req, res) => {
    const {walletAddress} = req.body;

    const user = await CustomerService.getOne({walletAddress});
    if (!user) throw httpError(401, 'Wallet address not found. Please sign up first.');

    return success(res, {user}, 'Login successful!');
};

// POST /customers/sendotp
const sendOtp = async (req, res) => {
    const {email, otp} = req.body;

    if (!otp || String(otp).length < 4) throw httpError(400, 'A valid OTP is required.');

    await sendOTPViaEmail(email, otp);
    return success(res, null, 'OTP sent successfully!');
};

// POST /customers/sendmoney
const sendMoney = async (req, res) => {
    const {key} = req.body;

    if (!key) throw httpError(400, 'Destination public key is required.');

    const server = new Horizon.Server('https://diamtestnet.diamcircle.io/');
    const senderKeypair = Keypair.fromSecret(SENDER_SECRET);
    const senderPublicKey = senderKeypair.publicKey();

    const account = await server.loadAccount(senderPublicKey);
    const transaction = new TransactionBuilder(account, {
        fee: await server.fetchBaseFee(),
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(Operation.payment({
            destination: key,
            asset: Asset.native(),
            amount: REWARD_AMOUNT,
        }))
        .setTimeout(30)
        .build();

    transaction.sign(senderKeypair);
    await server.submitTransaction(transaction);

    return success(res, null, `Payment of ${REWARD_AMOUNT} DIAM made to ${key} successfully.`);
};

// GET /customers/getbalance?pkey=...
const getBalance = async (req, res) => {
    const {pkey} = req.query;
    if (!pkey) throw httpError(400, 'Query param `pkey` is required.');

    const server = new Horizon.Server('https://diamtestnet.diamcircle.io/');
    const account = await server.loadAccount(pkey);

    const native = account.balances.find((b) => b.asset_type === 'native');
    const balance = native ? native.balance : '0';

    return success(res, {balance});
};

// GET /customers/getall
const getAll = async (req, res) => {
    const customers = await CustomerService.getAll();
    return success(res, {customers});
};

const CustomerController = {
    createCustomer: wrapAsync(createCustomer),
    loginCustomer: wrapAsync(loginCustomer),
    sendOtp: wrapAsync(sendOtp),
    sendMoney: wrapAsync(sendMoney),
    getBalance: wrapAsync(getBalance),
    getAll: wrapAsync(getAll),
};

module.exports = CustomerController;
