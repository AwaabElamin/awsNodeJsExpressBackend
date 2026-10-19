const mongoose = require('mongoose');
const DB = require('../lib/db');

const groceryProductSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 140 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    unit: { type: String, required: true, trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0 },
    mainPhoto: { type: String, required: true, trim: true, maxlength: 1200 },
    photos: { type: [String], default: [] },
    ingredients: {
        ingredients: { type: String, default: '', maxlength: 3000 },
        activeIngredientName: { type: String, default: '', maxlength: 1000 }
    },
    aboutItem: {
        nutritionFacts: { type: String, default: '', maxlength: 3000 },
        productDetails: { type: String, default: '', maxlength: 5000 }
    },
    aboutBrand: {
        brandName: { type: String, default: '', maxlength: 120 }
    },
    specifications: { type: String, default: '', maxlength: 2000 },
    customerRatingReviews: { type: [mongoose.Schema.Types.Mixed], default: [] },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    email: { type: String, required: true, index: true }
}, { timestamps: true, collection: 'products' });

const groceryProductModel = DB.getModel('groceries', 'GroceryProduct', groceryProductSchema);

class GroceryProducts {
    static async getPublicProducts() {
        return groceryProductModel.find({})
            .select('title category unit price mainPhoto photos ingredients aboutItem aboutBrand specifications customerRatingReviews createdAt')
            .sort({ createdAt: -1 })
            .lean()
            .exec();
    }

    static async getProductsForOwner(ownerId, email) {
        return groceryProductModel.find({
            $or: [
                { ownerId },
                { ownerId: null, email }
            ]
        })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
    }

    static async addProduct(data, ownerId, email) {
        return groceryProductModel.create({ ...data, ownerId, email });
    }

    static async updateProduct(id, ownerId, email, data) {
        return groceryProductModel.findOneAndUpdate(
            { _id: id, ownerId, email },
            { $set: data },
            { new: true, runValidators: true }
        ).lean().exec();
    }

    static async deleteProduct(id, ownerId, email) {
        return groceryProductModel.findOneAndDelete({ _id: id, ownerId, email }).lean().exec();
    }
}

module.exports = GroceryProducts;
