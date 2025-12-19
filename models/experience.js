// models/experience.js
const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
    user: { type: String, required: true },
    companyName: { type: String },
    startYear: { type: String },
    positionName: { type: String },
    endYear: { type: String },
    projectName: { type: String },
    summary: { type: String },
    link: { type: String },
    TechnologiesUsed: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Experience', experienceSchema);