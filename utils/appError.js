class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        this.status = String(statusCode).startsWith("4") ? "fail" : "error";
        this.isOperational = true;

        // To prevent pollution of stack trace by unnecessary function calls
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
