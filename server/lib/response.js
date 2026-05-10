/**
 * Unified response helpers.
 * Every endpoint must use these so the contract is consistent.
 *
 * Success shape:  { result: 'success', code, data?, message? }
 * Error shape:    { result: 'error',   code, desc,    stack? }   ← handled by error middleware
 */

const success = (res, data = null, message = 'OK', statusCode = 200) => {
    const body = { result: 'success', code: statusCode };
    if (message) body.message = message;
    if (data !== null && data !== undefined) body.data = data;
    return res.status(statusCode).json(body);
};

const created = (res, data = null, message = 'Created') =>
    success(res, data, message, 201);

/**
 * Throw an HTTP error that will be caught by the centralized error middleware.
 * Usage: httpError(404, 'User not found') inside a controller.
 */
const httpError = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

module.exports = { success, created, httpError };