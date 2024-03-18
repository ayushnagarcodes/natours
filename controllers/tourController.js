const fs = require("node:fs");

const tours = JSON.parse(
    fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
);

exports.checkID = (req, res, next, val) => {
    if (Number(req.params.id) > tours.length) {
        return res.json({
            status: "fail",
            message: "Invalid ID",
        });
    }
    next();
};

exports.checkBody = (req, res, next) => {
    if (!req.body.name || !req.body.duration) {
        return res.status(400).json({
            status: "error",
            message: "Please specify name & duration",
        });
    }
    next();
};

exports.getAllTours = (req, res) => {
    res.json({
        status: "success",
        data: {
            tours,
        },
    });
};

exports.getTour = (req, res) => {
    const tour = tours.find((el) => el.id === Number(req.params.id));

    tour
        ? res.json({
              status: "success",
              data: {
                  tour,
              },
          })
        : res.status(404).json({
              status: "fail",
              message: "Invalid ID",
          });
};

exports.createTour = (req, res) => {
    const newId = tours.at(-1).id + 1;
    const newTour = { id: newId, ...req.body };
    tours.push(newTour);

    fs.writeFile(
        `${__dirname}/dev-data/data/tours-simple.json`,
        JSON.stringify(tours),
        (err) => {
            res.status(201).send({
                status: "success",
                data: {
                    newTour,
                },
            });
        },
    );
};

exports.updateTour = (req, res) => {
    res.json({
        status: "success",
        data: {
            tour: "<Updated Tour Here>",
        },
    });
};

exports.deleteTour = (req, res) => {
    res.status(204).json({
        status: "success",
        data: null,
    });
};
