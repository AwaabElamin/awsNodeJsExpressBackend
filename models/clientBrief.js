const mongoose = require('mongoose');

const clientBriefSchema = new mongoose.Schema({
    clientName: { type: String, required: true, trim: true, maxlength: 120 },
    clientEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    company: { type: String, trim: true, maxlength: 160 },
    projectName: { type: String, required: true, trim: true, maxlength: 160 },
    projectType: { type: String, trim: true, maxlength: 100 },
    responses: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

module.exports = mongoose.model('clientBriefs', clientBriefSchema);