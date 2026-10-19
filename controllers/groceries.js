const users = require('../models/users');
const groceryProducts = require('../models/groceryProduct');

const text = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const isHttpUrl = (value) => {
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch (_) {
        return false;
    }
};

function normalizeProduct(input) {
    const source = input && typeof input === 'object' ? input : {};
    const title = text(source.title, 140);
    const category = text(source.category, 60);
    const unit = text(source.unit, 60);
    const mainPhoto = text(source.mainPhoto, 1200);
    const price = Number(source.price);
    const photos = Array.isArray(source.photos)
        ? source.photos.filter((photo) => typeof photo === 'string' && isHttpUrl(photo.trim())).slice(0, 20).map((photo) => photo.trim())
        : [];

    if (!title || !category || !unit || !mainPhoto || !isHttpUrl(mainPhoto)) {
        return { error: 'Title, category, unit, and a valid main photo URL are required.' };
    }
    if (!Number.isFinite(price) || price < 0 || price > 1000000) {
        return { error: 'Enter a valid product price.' };
    }

    return {
        data: {
            title,
            category,
            unit,
            price,
            mainPhoto,
            photos,
            ingredients: {
                ingredients: text(source.ingredients?.ingredients, 3000),
                activeIngredientName: text(source.ingredients?.activeIngredientName, 1000)
            },
            aboutItem: {
                nutritionFacts: text(source.aboutItem?.nutritionFacts, 3000),
                productDetails: text(source.aboutItem?.productDetails, 5000)
            },
            aboutBrand: { brandName: text(source.aboutBrand?.brandName, 120) },
            specifications: text(source.specifications, 2000),
            customerRatingReviews: []
        }
    };
}

exports.provisionUser = async (req, res, next) => {
    try {
        const user = await users.enablePlatform(req.autoUser.email, 'groceries');
        if (!user) {
            return res.status(404).json({ status: 'fail', message: 'A verified Awaaab account is required.' });
        }
        return res.json({
            status: 'success',
            data: {
                _id: user._id,
                email: user.email,
                firstname: user.firstname || '',
                lastname: user.lastname || '',
                userRole: user.role === 'Admin' ? 'Admin' : 'Employee',
                status: user.emailVerified === false ? 0 : 1
            }
        });
    } catch (error) {
        return next(error);
    }
};

exports.getUser = async (req, res, next) => {
    try {
        const user = req.account;
        if (!user || !user.platforms.includes('groceries')) {
            return res.status(404).json({ status: 'fail', message: 'Grocery workspace not found.' });
        }
        return res.json({
            status: 'success',
            data: {
                _id: user._id,
                email: user.email,
                firstname: user.firstname || '',
                lastname: user.lastname || '',
                userRole: user.role === 'Admin' ? 'Admin' : 'Employee',
                status: user.emailVerified === false ? 0 : 1
            }
        });
    } catch (error) {
        return next(error);
    }
};

exports.listPublic = async (req, res, next) => {
    try {
        return res.json({ status: 'success', data: await groceryProducts.getPublicProducts() });
    } catch (error) {
        return next(error);
    }
};

exports.listMine = async (req, res, next) => {
    try {
        return res.json({ status: 'success', data: await groceryProducts.getProductsForOwner(req.autoUser.id, req.autoUser.email) });
    } catch (error) {
        return next(error);
    }
};

exports.create = async (req, res, next) => {
    const normalized = normalizeProduct(req.body);
    if (normalized.error) return res.status(400).json({ status: 'fail', message: normalized.error });
    try {
        const product = await groceryProducts.addProduct(normalized.data, req.autoUser.id, req.autoUser.email);
        return res.status(201).json({ status: 'success', data: product });
    } catch (error) {
        return next(error);
    }
};

exports.update = async (req, res, next) => {
    const normalized = normalizeProduct(req.body);
    if (normalized.error) return res.status(400).json({ status: 'fail', message: normalized.error });
    try {
        const product = await groceryProducts.updateProduct(req.body?._id, req.autoUser.id, req.autoUser.email, normalized.data);
        if (!product) return res.status(404).json({ status: 'fail', message: 'Product not found.' });
        return res.json({ status: 'success', data: product });
    } catch (error) {
        return next(error);
    }
};

exports.remove = async (req, res, next) => {
    try {
        const product = await groceryProducts.deleteProduct(req.body?._id, req.autoUser.id, req.autoUser.email);
        if (!product) return res.status(404).json({ status: 'fail', message: 'Product not found.' });
        return res.json({ status: 'success', data: { _id: product._id } });
    } catch (error) {
        return next(error);
    }
};
