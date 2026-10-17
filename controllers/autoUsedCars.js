const usedCars = require('../models/autoUsedCar');

exports.listPublic = async (req, res, next) => {
    try {
        return res.json({ status: 'success', data: await usedCars.getPublicCars() });
    } catch (error) {
        return next(error);
    }
};

exports.listMine = async (req, res, next) => {
    try {
        return res.json({ status: 'success', data: await usedCars.getCarsForOwner(req.autoUser.email) });
    } catch (error) {
        return next(error);
    }
};

exports.add = async (req, res, next) => {
    try {
        const car = await usedCars.addCar(req.body || {}, req.autoUser.email);
        return res.status(201).json({ status: 'success', data: car });
    } catch (error) {
        return next(error);
    }
};

exports.edit = async (req, res, next) => {
    try {
        const car = await usedCars.updateCar(req.body?._id, req.autoUser.email, req.body || {});
        if (!car) {
            return res.status(404).json({ status: 'fail', message: 'Vehicle not found.' });
        }
        return res.json({ status: 'success', data: car });
    } catch (error) {
        return next(error);
    }
};

exports.remove = async (req, res, next) => {
    try {
        const car = await usedCars.deleteCar(req.body?._id, req.autoUser.email);
        if (!car) {
            return res.status(404).json({ status: 'fail', message: 'Vehicle not found.' });
        }
        return res.json({ status: 'success', data: car });
    } catch (error) {
        return next(error);
    }
};