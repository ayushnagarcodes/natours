const Tour = require("../models/tourModel");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = "5";
    req.query.sort = "-ratingsAverage,price";
    req.query.fields = "name,price,ratingsAverage,summary,difficulty";
    next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
    // BUILD THE QUERY
    const features = new APIFeatures(Tour.find(), req.query);
    features.filter().sort().project().paginate();

    // EXECUTE THE QUERY
    const tours = await features.query;

    res.json({
        status: "success",
        results: tours.length,
        data: {
            tours,
        },
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
        return next(new AppError("No tour found with that ID", 404));
    }

    res.json({
        status: "success",
        data: {
            tour,
        },
    });
});

exports.createTour = catchAsync(async (req, res, next) => {
    const newTour = await Tour.create(req.body);

    res.status(201).send({
        status: "success",
        data: {
            newTour,
        },
    });
});

exports.updateTour = catchAsync(async (req, res, next) => {
    const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!updatedTour) {
        return next(new AppError("No tour found with that ID", 404));
    }

    res.json({
        status: "success",
        data: {
            tour: updatedTour,
        },
    });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
    const deletedTour = await Tour.findByIdAndDelete(req.params.id);

    if (!deletedTour) {
        return next(new AppError("No tour found with that ID", 404));
    }

    res.status(204).json({
        status: "success",
        data: null,
    });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } },
        },
        {
            $group: {
                _id: "$difficulty",
                numTours: { $sum: 1 },
                numRatings: { $sum: "$ratingsQuantity" },
                avgRating: { $avg: "$ratingsAverage" },
                avgPrice: { $avg: "$price" },
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
            },
        },
        {
            $sort: { avgPrice: -1 },
        },
    ]);

    res.json({
        status: "success",
        data: {
            tour: stats,
        },
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = Number(req.params.year);
    const plan = await Tour.aggregate([
        {
            $unwind: "$startDates",
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                },
            },
        },
        {
            $group: {
                _id: { $month: "$startDates" },
                numTourStarts: { $sum: 1 },
                tours: { $push: "$name" },
            },
        },
        {
            $addFields: { month: "$_id" },
        },
        {
            $project: {
                _id: 0,
            },
        },
        {
            $sort: { numTourStarts: 1 },
        },
    ]);

    res.json({
        status: "success",
        results: plan.length,
        data: {
            tour: plan,
        },
    });
});
