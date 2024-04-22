const AppError = require("../utils/appError");

function handleCastError(err) {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
}

function handleDuplicateFields(err) {
    const message = `Duplicate field value: ${JSON.stringify(err.keyValue)}. Please use another value!`;
    return new AppError(message, 400);
}

function handleValidationError(err) {
    const value = Object.values(err.errors).map((error) => error.message);
    const message = `Invalid input data: ${JSON.stringify(value)}`;
    return new AppError(message, 400);
}

function handleJWTError() {
    return new AppError("Invalid token! Please log in again.", 401);
}

function handleJWTExpiredError() {
    return new AppError("Your token has expired! Please log in again.", 401);
}

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        console.error("Error 💥", err);
        res.status(500).json({
            status: "error",
            message: "Something went wrong!",
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (process.env.NODE_ENV === "development") {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === "production") {
        if (err.name === "CastError") err = handleCastError(err);
        if (err.code === 11000) err = handleDuplicateFields(err);
        if (err.name === "ValidationError") err = handleValidationError(err);
        if (err.name === "JsonWebTokenError") err = handleJWTError();
        if (err.name === "TokenExpiredError") err = handleJWTExpiredError();

        sendErrorProd(err, res);
    }
};
