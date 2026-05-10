'use strict';
/**
 * Core API tests — happy path + failure path.
 * Run with:  npx jest  (from server/ directory)
 *
 * Dependencies: jest, supertest  (add to devDependencies if missing)
 *   npm install --save-dev jest supertest
 *
 * Environment: these tests use an in-memory mock instead of a live DB,
 * achieved by mocking the service layer so no MongoDB connection is needed.
 */

const request = require('supertest');

// ── Mock services before requiring app ──────────────────────────────────────
jest.mock('../services/user', () => ({
    create: jest.fn(),
    getOne: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    updateById: jest.fn(),
}));

jest.mock('../services/customer', () => ({
    create: jest.fn(),
    getOne: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    updateById: jest.fn(),
}));

jest.mock('../services/question', () => ({
    create: jest.fn(),
    getOne: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    updateById: jest.fn(),
}));

// Mock mongoose connect so no real DB is needed
jest.mock('../config/mongoose', () => ({ connect: jest.fn() }));

// ── Import after mocks are in place ─────────────────────────────────────────
const app = require('../app');
const UserService = require('../services/user');
const CustomerService = require('../services/customer');
const QuestionService = require('../services/question');

const BASE = '/api';

// ────────────────────────────────────────────────────────────────────────────
// TEST 1 — User Signup
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/users/signup', () => {
    const VALID_BODY = {
        companyName: 'Acme Corp',
        companyEmail: 'acme@example.com',
        companyLogoUrl: 'https://example.com/logo.png',
        companyDescription: 'A great company',
        walletAddress: '0xABC123',
    };

    afterEach(() => jest.clearAllMocks());

    test('✅ happy path — creates company and returns 201', async () => {
        UserService.getOne.mockResolvedValue(null);       // no duplicate
        UserService.create.mockResolvedValue({ _id: 'user-id-1' });

        const res = await request(app).post(`${BASE}/users/signup`).send(VALID_BODY);

        expect(res.status).toBe(201);
        expect(res.body.result).toBe('success');
        expect(res.body.message).toMatch(/signup successful/i);
        expect(res.body.data.id).toBe('user-id-1');
    });

    test('❌ failure — missing required fields returns 400', async () => {
        const res = await request(app)
            .post(`${BASE}/users/signup`)
            .send({ companyName: 'Acme' }); // missing email, walletAddress, etc.

        expect(res.status).toBe(400);
        expect(res.body.result).toBe('error');
        expect(res.body.desc).toMatch(/missing required fields/i);
    });

    test('❌ failure — duplicate wallet address returns 409', async () => {
        UserService.getOne.mockResolvedValue({ _id: 'existing-id' }); // already exists

        const res = await request(app).post(`${BASE}/users/signup`).send(VALID_BODY);

        expect(res.status).toBe(409);
        expect(res.body.result).toBe('error');
        expect(res.body.desc).toMatch(/already exists/i);
    });

    test('❌ failure — invalid email format returns 400', async () => {
        const res = await request(app)
            .post(`${BASE}/users/signup`)
            .send({ ...VALID_BODY, companyEmail: 'not-an-email' });

        expect(res.status).toBe(400);
        expect(res.body.result).toBe('error');
    });
});

// ────────────────────────────────────────────────────────────────────────────
// TEST 2 — Customer Login
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/customers/login', () => {
    afterEach(() => jest.clearAllMocks());

    test('✅ happy path — existing wallet logs in', async () => {
        const fakeUser = { _id: 'cust-1', name: 'Bob', walletAddress: '0xBOB' };
        CustomerService.getOne.mockResolvedValue(fakeUser);

        const res = await request(app)
            .post(`${BASE}/customers/login`)
            .send({ walletAddress: '0xBOB' });

        expect(res.status).toBe(200);
        expect(res.body.result).toBe('success');
        expect(res.body.data.user.walletAddress).toBe('0xBOB');
    });

    test('❌ failure — missing walletAddress returns 400', async () => {
        const res = await request(app)
            .post(`${BASE}/customers/login`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.result).toBe('error');
        expect(res.body.desc).toMatch(/walletAddress/i);
    });

    test('❌ failure — unknown wallet returns 401', async () => {
        CustomerService.getOne.mockResolvedValue(null);

        const res = await request(app)
            .post(`${BASE}/customers/login`)
            .send({ walletAddress: '0xUNKNOWN' });

        expect(res.status).toBe(401);
        expect(res.body.result).toBe('error');
        expect(res.body.desc).toMatch(/not found/i);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// TEST 3 — Question Set creation
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/questions', () => {
    const VALID_BODY = {
        productName: 'Widget Pro',
        productDescription: 'A great widget',
        productImageUrl: 'https://example.com/widget.png',
        isOrderIdTracking: false,
        questions: [
            { type: 'SHORT', q: 'How would you rate us?' },
            { type: 'MCQ',   q: 'Which feature do you use most?', options: ['A', 'B', 'C'] },
        ],
    };

    afterEach(() => jest.clearAllMocks());

    test('✅ happy path — creates question set and returns 201', async () => {
        QuestionService.create.mockResolvedValue({ _id: 'qs-1', ...VALID_BODY });

        const res = await request(app).post(`${BASE}/questions`).send(VALID_BODY);

        expect(res.status).toBe(201);
        expect(res.body.result).toBe('success');
        expect(res.body.message).toMatch(/submitted successfully/i);
        expect(res.body.data.questionSet._id).toBe('qs-1');
    });

    test('❌ failure — missing productName returns 400', async () => {
        const { productName, ...body } = VALID_BODY;

        const res = await request(app).post(`${BASE}/questions`).send(body);

        expect(res.status).toBe(400);
        expect(res.body.result).toBe('error');
        expect(res.body.desc).toMatch(/productName/i);
    });

    test('❌ failure — empty questions array returns 400', async () => {
        const res = await request(app)
            .post(`${BASE}/questions`)
            .send({ ...VALID_BODY, questions: [] });

        expect(res.status).toBe(400);
        expect(res.body.result).toBe('error');
        expect(res.body.desc).toMatch(/at least one question/i);
    });

    test('❌ failure — question with invalid type returns 400', async () => {
        const res = await request(app)
            .post(`${BASE}/questions`)
            .send({
                ...VALID_BODY,
                questions: [{ type: 'INVALID', q: 'Bad question?' }],
            });

        expect(res.status).toBe(400);
        expect(res.body.result).toBe('error');
        expect(res.body.desc).toMatch(/invalid or missing type/i);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// TEST 4 — 404 on unknown route
// ────────────────────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
    test('returns 404 for unknown endpoint', async () => {
        const res = await request(app).get(`${BASE}/does-not-exist`);
        expect(res.status).toBe(404);
        expect(res.body.result).toBe('error');
    });
});