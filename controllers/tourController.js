const Tour = require("../models/tourModel");
const APIFeatures = require("../utils/apiFeatures");

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = "5";
    req.query.sort = "-ratingsAverage,price";
    req.query.fields = "name,price,ratingsAverage,summary,difficulty";
    next();
};

exports.getAllTours = async (req, res) => {
    try {
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
    } catch (err) {
        res.status(404).send({
            status: "fail",
            message: err.message,
        });
    }
};

exports.getTour = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        res.json({
            status: "success",
            data: {
                tour,
            },
        });
    } catch (err) {
        res.status(404).send({
            status: "fail",
            message: err,
        });
    }
};

exports.createTour = async (req, res) => {
    try {
        const newTour = await Tour.create(req.body);

        res.status(201).send({
            status: "success",
            data: {
                newTour,
            },
        });
    } catch (err) {
        res.status(400).send({
            status: "fail",
            message: err,
        });
    }
};

exports.updateTour = async (req, res) => {
    try {
        const updatedTour = await Tour.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true },
        );

        res.json({
            status: "success",
            data: {
                tour: updatedTour,
            },
        });
    } catch (err) {
        res.status(404).send({
            status: "fail",
            message: err,
        });
    }
};

exports.deleteTour = async (req, res) => {
    try {
        await Tour.findByIdAndDelete(req.params.id);

        res.status(204).json({
            status: "success",
            data: null,
        });
    } catch (err) {
        res.status(404).send({
            status: "fail",
            message: err,
        });
    }
};

exports.getTourStats = async (req, res) => {
    try {
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
    } catch (err) {
        res.status(404).send({
            status: "fail",
            message: err.message,
        });
    }
};

exports.getMonthlyPlan = async (req, res) => {
    try {
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
    } catch (err) {
        res.status(404).send({
            status: "fail",
            message: err.message,
        });
    }
};
