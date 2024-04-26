const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

function filterObj(obj, ...allowedFields) {
    Object.keys(obj).forEach((key) => {
        if (!allowedFields.includes(key)) delete obj[key];
    });
}

exports.getAllUsers = catchAsync(async (req, res, next) => {
    const users = await User.find();

    res.json({
        status: "success",
        results: users.length,
        data: {
            users,
        },
    });
});

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1. Check whether the "req.body" contains password related fields or not
    const { password, passwordConfirm } = req.body;
    if (password || passwordConfirm) {
        next(
            new AppError(
                "This route is not for password updates. Please use /update-password",
                400,
            ),
        );
    }

    /* 
        2. Now, filter the "req.body" to prevent unauthorized "role" changes 
           and to allow only certain fields to update
    */
    const queryObj = { ...req.body };
    filterObj(queryObj, "name", "email");
    console.log(queryObj);

    // 3. Update the user
    const updatedUser = await User.findByIdAndUpdate(req.user._id, queryObj, {
        new: true,
        runValidators: true,
    });

    res.json({
        status: "success",
        data: {
            updatedUser,
        },
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.status(204).json({
        status: "success",
        data: null,
    });
});
