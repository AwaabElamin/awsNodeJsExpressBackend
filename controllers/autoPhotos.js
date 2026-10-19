const { createPhotoUpload } = require('../lib/autoHubS3');

exports.createUploadUrl = async (req, res, next) => {
    try {
        const { contentType, size } = req.body || {};
        const upload = await createPhotoUpload(req.autoUser.id, contentType, size);
        return res.json({ status: 'success', data: upload });
    } catch (error) {
        if (error.message && /Choose a JPEG/.test(error.message)) {
            return res.status(400).json({ status: 'fail', message: error.message });
        }
        return next(error);
    }
};
