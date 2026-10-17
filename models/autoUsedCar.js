const mongoose = require('mongoose');
const DB = require('../lib/db');

const usedCarSchema = new mongoose.Schema({
    make: String,
    model: String,
    color: String,
    year: String,
    description: String,
    mainImage: String,
    imagesFolder: String,
    email: { type: String, required: true, index: true }
});

const usedCarModel = DB.getModel('carshop', 'usedCars', usedCarSchema);

class AutoUsedCars {
    static async getPublicCars() {
        return usedCarModel.find({}).lean().exec();
    }

    static async getCarsForOwner(email) {
        return usedCarModel.find({ email }).lean().exec();
    }

    static async addCar(data, email) {
        return usedCarModel.create({
            make: data.make,
            model: data.model,
            color: data.color,
            year: data.year,
            description: data.description,
            mainImage: data.mainImage,
            imagesFolder: data.imagesFolder,
            email
        });
    }

    static async updateCar(id, email, data) {
        return usedCarModel.findOneAndUpdate(
            { _id: id, email },
            {
                $set: {
                    make: data.make,
                    model: data.model,
                    color: data.color,
                    year: data.year,
                    description: data.description,
                    mainImage: data.mainImage,
                    imagesFolder: data.imagesFolder
                }
            },
            { new: true, runValidators: true }
        ).lean().exec();
    }

    static async deleteCar(id, email) {
        return usedCarModel.findOneAndDelete({ _id: id, email }).lean().exec();
    }
}

module.exports = AutoUsedCars;