module.exports = (platformId) => (req, res, next) => {
    if (!req.account || !Array.isArray(req.account.platforms) || !req.account.platforms.includes(platformId)) {
        return res.status(403).json({ status: 'fail', message: 'Platform access is not enabled for this account.' });
    }
    return next();
};
