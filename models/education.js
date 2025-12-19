// models/education.js
const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
    email: { type: String, required: true },
    universityName: { type: String },
    degreeType: { type: String },
    majorName: { type: String },
    yearOfGraduate: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Education', educationSchema);