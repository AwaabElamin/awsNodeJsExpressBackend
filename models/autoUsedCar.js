const mongoose = require('mongoose');
const DB = require('../lib/db');

const usedCarSchema = new mongoose.Schema({
    make: String,
    model: String,
    color: String,
    year: String,
    country: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    description: String,
    mainImage: String,
    photos: { type: [String], default: [] },
    imagesFolder: String,
    ownerId: { type: mongoose.Schema.Types.ObjectId, index: true },
    email: { type: String, required: true, index: true }
});

const usedCarModel = DB.getModel('carshop', 'usedCars', usedCarSchema);

class AutoUsedCars {
    static async getContactTarget(id) {
        return usedCarModel.findById(id)
            .select('make model year ownerId email')
            .lean()
            .exec();
    }

    static async getPublicCars() {
        return usedCarModel.find({})
            .select('make model color year country state description mainImage photos imagesFolder ownerId')
            .lean()
            .exec();
    }

    static async getCarsForOwner(ownerId, email) {
        return usedCarModel.find({
            $or: [
                { ownerId },
                { ownerId: null, email }
            ]
        }).lean().exec();
    }

    static async addCar(data, ownerId, email) {
        return usedCarModel.create({
            make: data.make,
            model: data.model,
            color: data.color,
            year: data.year,
            country: data.country,
            state: data.state,
            description: data.description,
            mainImage: data.mainImage,
            photos: Array.isArray(data.photos) ? data.photos.filter((photo) => typeof photo === 'string').slice(0, 20) : [],
            imagesFolder: data.imagesFolder,
            ownerId,
            email
        });
    }

    static async updateCar(id, ownerId, email, data) {
        return usedCarModel.findOneAndUpdate(
            {
                _id: id,
                $or: [
                    { ownerId },
                    { ownerId: null, email }
                ]
            },
            {
                $set: {
                    make: data.make,
                    model: data.model,
                    color: data.color,
                    year: data.year,
                    country: data.country,
                    state: data.state,
                    description: data.description,
                    mainImage: data.mainImage,
                    photos: Array.isArray(data.photos) ? data.photos.filter((photo) => typeof photo === 'string').slice(0, 20) : [],
                    imagesFolder: data.imagesFolder,
                    ownerId,
                    email
                }
            },
            { new: true, runValidators: true }
        ).lean().exec();
    }

    static async deleteCar(id, ownerId, email) {
        return usedCarModel.findOneAndDelete({
            _id: id,
            $or: [
                { ownerId },
                { ownerId: null, email }
            ]
        }).lean().exec();
    }
}

module.exports = AutoUsedCars;