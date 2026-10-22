const usedCars = require('../models/autoUsedCar');
const { getPhotoUrl } = require('../lib/autoHubS3');
const { money } = require('../lib/paypal');

async function formatCar(car, includePhotoKeys = false) {
    const ownerId = car.ownerId;
    const mainImageKey = car.mainImage || '';
    const photoKeys = Array.isArray(car.photos) ? car.photos : [];
    const [mainImage, photos] = await Promise.all([
        getPhotoUrl(mainImageKey, ownerId),
        Promise.all(photoKeys.map((photo) => getPhotoUrl(photo, ownerId)))
    ]);
    const result = {
        ...car,
        mainImage,
        photos,
        ...(includePhotoKeys ? { mainImageKey, photoKeys } : {})
    };
    delete result.ownerId;
    delete result.email;
    return result;
}

async function formatCars(cars, includePhotoKeys = false) {
    return Promise.all(cars.map((car) => formatCar(car, includePhotoKeys)));
}

function validateLocation(body, res) {
    if (['country', 'state'].some((field) =>
        typeof body?.[field] !== 'string' || !body[field].trim() || body[field].trim().length > 100
    )) {
        res.status(400).json({
            status: 'fail',
            message: 'Country and state/region are required and must each contain 1 to 100 characters.'
        });
        return false;
    }
    if (body.price !== undefined) {
        try { money(body.price); }
        catch (error) {
            res.status(400).json({ status: 'fail', message: error.message });
            return false;
        }
    }
    return true;
}

exports.listPublic = async (req, res, next) => {
    try {
        const cars = await usedCars.getPublicCars();
        return res.json({ status: 'success', data: await formatCars(cars) });
    } catch (error) {
        return next(error);
    }
};

exports.listMine = async (req, res, next) => {
    try {
        const cars = await usedCars.getCarsForOwner(req.autoUser.id, req.autoUser.email);
        return res.json({ status: 'success', data: await formatCars(cars, true) });
    } catch (error) {
        return next(error);
    }
};

exports.add = async (req, res, next) => {
    try {
        if (!validateLocation(req.body, res)) return;
        const car = await usedCars.addCar(req.body || {}, req.autoUser.id, req.autoUser.email);
        return res.status(201).json({ status: 'success', data: await formatCar(car.toObject(), true) });
    } catch (error) {
        return next(error);
    }
};

exports.edit = async (req, res, next) => {
    try {
        if (!validateLocation(req.body, res)) return;
        const car = await usedCars.updateCar(req.body?._id, req.autoUser.id, req.autoUser.email, req.body || {});
        if (!car) {
            return res.status(404).json({ status: 'fail', message: 'Vehicle not found.' });
        }
        return res.json({ status: 'success', data: await formatCar(car, true) });
    } catch (error) {
        return next(error);
    }
};

exports.remove = async (req, res, next) => {
    try {
        const car = await usedCars.deleteCar(req.body?._id, req.autoUser.id, req.autoUser.email);
        if (!car) {
            return res.status(404).json({ status: 'fail', message: 'Vehicle not found.' });
        }
        return res.json({ status: 'success', data: { _id: car._id } });
    } catch (error) {
        return next(error);
    }
};