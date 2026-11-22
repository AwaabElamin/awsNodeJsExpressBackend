const users = require('../models/users');
const groceryProducts = require('../models/groceryProduct');
const { createPhotoUpload, getPhotoUrl } = require('../lib/autoHubS3');

const text = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const isHttpUrl = (value) => {
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch (_) {
        return false;
    }
};

function isOwnerPhoto(value, ownerId) {
    const prefix = `autohub/${String(ownerId)}/groceries/`;
    return value.startsWith(prefix) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(value.slice(prefix.length));
}

async function formatProduct(product, includeKeys = false) {
    const item = typeof product.toObject === 'function' ? product.toObject() : product;
    const mainPhotoKey = item.mainPhoto || '';
    const photoKeys = Array.isArray(item.photos) ? item.photos : [];
    const [mainPhoto, photos] = await Promise.all([
        getPhotoUrl(mainPhotoKey, item.ownerId, 'groceries'),
        Promise.all(photoKeys.map(photo => getPhotoUrl(photo, item.ownerId, 'groceries')))
    ]);
    return { ...item, mainPhoto, photos, ...(includeKeys ? { mainPhotoKey, photoKeys } : {}) };
}

exports.createPhotoUploadUrl = async (req, res, next) => {
    try {
        const { contentType, size } = req.body || {};
        const upload = await createPhotoUpload(req.autoUser.id, contentType, size, 'groceries');
        return res.json({ status: 'success', data: upload });
    } catch (error) {
        if (error.message && /Choose a JPEG/.test(error.message)) {
            return res.status(400).json({ status: 'fail', message: error.message });
        }
        return next(error);
    }
};

function normalizeProduct(input, ownerId) {
    const source = input && typeof input === 'object' ? input : {};
    if (['country', 'state'].some((field) => typeof source[field] !== 'string' || !source[field].trim() || source[field].trim().length > 100)) {
        return { error: 'Country and state/region are required and must each contain 1 to 100 characters.' };
    }
    const title = text(source.title, 140);
    const category = text(source.category, 60);
    const unit = text(source.unit, 60);
    const mainPhoto = text(source.mainPhoto, 1200);
    const price = Number(source.price);
    const validPhoto = (photo) => typeof photo === 'string' && photo.length <= 1200 && (isHttpUrl(photo) || isOwnerPhoto(photo, ownerId));
    const photos = Array.isArray(source.photos) ? source.photos.map(photo => typeof photo === 'string' ? photo.trim() : photo) : [];

    if (!title || !category || !unit || !mainPhoto || !validPhoto(mainPhoto)) {
        return { error: 'Title, category, unit, and a valid main photo are required.' };
    }
    if (photos.length > 20 || photos.some(photo => !validPhoto(photo))) {
        return { error: 'Choose up to 20 valid gallery photos.' };
    }
    if (!Number.isFinite(price) || price < 0 || price > 1000000) {
        return { error: 'Enter a valid product price.' };
    }

    return {
        data: {
            title,
            country: source.country.trim(),
            state: source.state.trim(),
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
        if (req.account?.role === 'Visitors') {
            return res.status(403).json({ status: 'fail', message: 'Create your Client workspace from My portal before enabling a grocery shop.' });
        }
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
        const products = await groceryProducts.getPublicProducts();
        const profiles = products.length ? await users.getPublicSellerProfiles(
            products.map(product => product.ownerId).filter(Boolean),
            [...new Set(products.map(product => String(product.email || '').trim().toLowerCase()).filter(Boolean))],
            'groceries'
        ) : [];
        const byId = new Map(profiles.map(profile => [String(profile._id), profile]));
        const byEmail = new Map(profiles.map(profile => [profile.email.trim().toLowerCase(), profile]));
        const formatted = await Promise.all(products.map(product => formatProduct(product)));
        const data = formatted.map(({ ownerId, email, ...product }) => {
            const seller = byId.get(String(ownerId)) || byEmail.get(String(email || '').trim().toLowerCase());
            return {
                ...product,
                sellerName: seller ? [seller.firstname, seller.lastname].filter(Boolean).join(' ').trim() : '',
                sellerEmail: seller?.email || ''
            };
        });
        return res.json({ status: 'success', data });
    } catch (error) {
        return next(error);
    }
};

exports.listMine = async (req, res, next) => {
    try {
        const products = await groceryProducts.getProductsForOwner(req.autoUser.id, req.autoUser.email);
        return res.json({ status: 'success', data: await Promise.all(products.map(product => formatProduct(product, true))) });
    } catch (error) {
        return next(error);
    }
};

exports.create = async (req, res, next) => {
    const normalized = normalizeProduct(req.body, req.autoUser?.id);
    if (normalized.error) return res.status(400).json({ status: 'fail', message: normalized.error });
    try {
        const product = await groceryProducts.addProduct(normalized.data, req.autoUser.id, req.autoUser.email);
        return res.status(201).json({ status: 'success', data: await formatProduct(product, true) });
    } catch (error) {
        return next(error);
    }
};

exports.update = async (req, res, next) => {
    const normalized = normalizeProduct(req.body, req.autoUser?.id);
    if (normalized.error) return res.status(400).json({ status: 'fail', message: normalized.error });
    try {
        const product = await groceryProducts.updateProduct(req.body?._id, req.autoUser.id, req.autoUser.email, normalized.data);
        if (!product) return res.status(404).json({ status: 'fail', message: 'Product not found.' });
        return res.json({ status: 'success', data: await formatProduct(product, true) });
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
