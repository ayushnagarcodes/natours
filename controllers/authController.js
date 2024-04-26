const { promisify } = require("util");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");

function signToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
}

function sendToken(res, statusCode, user) {
    const token = signToken(user._id);

    // Creating cookies for JWT token
    const expireTime =
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000;
    console.log(expireTime);

    const cookieOptions = {
        expires: new Date(expireTime),
        httpOnly: true,
    };
    if (process.env.NODE_ENV === "production") {
        cookieOptions.secure = true;
    }
    res.cookie("jwt", token, cookieOptions);

    // Sending the response
    user.password = undefined;
    res.status(statusCode).json({
        status: "success",
        token,
        data: {
            user,
        },
    });
}

exports.signup = catchAsync(async (req, res, next) => {
    /*
        Doing it this way instead of:
            -> const newUser = await User.create(req.body);
        because anyone would be able to register as an admin
    */
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
    });

    sendToken(res, 201, newUser);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1. Checking whether data was entered or not
    if (!email || !password) {
        return next(new AppError("Please provide email and password!", 400));
    }

    // 2. Checking whether user exists && password is correct or not
    const user = await User.findOne({ email }).select("+password");

    // If user doesn't exist then the checkPassword method won't run
    if (!user || !(await user.checkPassword(password, user.password))) {
        return next(new AppError("Incorrect email or password!", 401));
    }

    // 3. If everything's correct, send the token to client
    sendToken(res, 200, user);
});

exports.protect = catchAsync(async (req, res, next) => {
    // 1. Checking whether the token exists or not
    let token;
    const { authorization } = req.headers;
    if (authorization && authorization.startsWith("Bearer")) {
        token = authorization.split(" ")[1];
    }
    if (!token) {
        return next(
            new AppError(
                "You are not logged in! Please log in to get access.",
                401,
            ),
        );
    }

    // 2. Verifying token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3. Checking whether the user still exists or not
    const user = await User.findById(decoded.id);
    if (!user) {
        return next(
            new AppError(
                "The user belonging to this token no longer exists.",
                401,
            ),
        );
    }

    // 4. Checking whether the password was changed or not after the token was issued
    if (user.isPasswordChanged(decoded.iat)) {
        return next(
            new AppError(
                "The user password was changed. Please log in again!",
                401,
            ),
        );
    }

    // 5. If everything's correct, grant access to the protected route/middleware
    req.user = user; // passing data because it will be helpful for next middlewares
    next();
});

exports.restrictTo =
    (...roles) =>
    (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    "You don't have permission to perform this action.",
                    403,
                ),
            );
        }
        next();
    };

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1. Get user from email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(
            new AppError("There is no user with that email address.", 404),
        );
    }

    // 2. Generate a reset token
    const resetToken = user.createResetToken();
    await user.save({ validateBeforeSave: false });

    // 3. Send it to user's email
    const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/reset-password/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

    try {
        await sendEmail({
            email: user.email,
            subject: "Your password reset token (valid for 10 min)",
            message,
        });

        res.json({
            status: "success",
            message: "Token sent to email",
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                "There was an error sending the email. Try again later!",
                500,
            ),
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1. Get user from token which is not expired
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    // 2. If user exists, then set the password and modify other fields
    if (!user) {
        return next(new AppError("Token is invalid or has expired!", 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3. 'passwordChangedAt' field is updated in a pre middleware on save in 'userModel.js'

    // 4. If everything's correct, send the token to client
    sendToken(res, 200, user);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    const { prevPassword, newPassword, newPasswordConfirm } = req.body;

    // 1. Checking whether the data was provided or not
    if (!prevPassword || !newPassword) {
        return next(
            new AppError("Please enter the current and the new password!", 400),
        );
    }

    // 2. Get the user ("req.user" coming from previous middleware)
    const user = await User.findById(req.user._id).select("+password");

    // 3. Checking whether password entered is correct or not
    if (!(await user.checkPassword(prevPassword, user.password))) {
        return next(new AppError("Incorrect password.", 400));
    }

    // 4. If password entered is correct, then update it
    user.password = newPassword;
    user.passwordConfirm = newPasswordConfirm;
    await user.save();

    // 5. Log in the user, send JWT
    sendToken(res, 200, user);
});
