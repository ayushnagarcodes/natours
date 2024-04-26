const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

const morgan = require("morgan");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");

const app = express();

// Security HTTP headers
app.use(helmet());

// Development Logging
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// Rate Limiting
const limiter = rateLimit({
    max: 100,
    windowMs: 1 * 60 * 60 * 1000,
    message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Body Parser
app.use(express.json({ limit: "10kb" }));

// Data Sanitization against NoSQL Query Injection
app.use(mongoSanitize());

// Data Sanitization against XSS
app.use(xss());

// Preventing Parameter Pollution
app.use(
    hpp({
        whitelist: [
            "ratingsAverage",
            "ratingsQuantity",
            "maxGroupSize",
            "duration",
            "difficulty",
            "price",
        ],
    }),
);

// Serving Static Files
app.use(express.static(`${__dirname}/public`));

app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);

app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
