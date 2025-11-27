const mongoose = require('mongoose');
const DB = require('../lib/db');
const resumeSchema = new mongoose.Schema({
    summary: { type: String, unique: true },
    Education: {
        master: { type: String },
        Bacholar: { type: String }
    },
    Certificate: {
        Associate: { type: String },
        Certificates: { type: String }
    },
    Experience: {
        Infosys: { type: String },
        AwaaabLLC: { type: String }
    }
});
const educationSchema = new mongoose.Schema({
    email: { type: String },
    universityName: { type: String },
    degreeType: { type: String },
    majorName: { type: String },
    yearOfGraduate: { type: String }
});
const experienceSchema = new mongoose.Schema({
    email: { type: String },
    companyName: { type: String },
    startYear: { type: String },
    positionName: { type: String },
    endYear: { type: String },
    projectName: { type: String },
    summary: { type: String },
    link: { type: String },
    TechnologiesUsed: { type: String }
});
const summarySchema = new mongoose.Schema({
    email: {type:String},
    summary:{type:String}
});
//64c1be86558cfea813977fd2
function getResumeModel() {
    try {
        return DB.getModel('resume', 'resume', resumeSchema);
    } catch (err) {
        return DB.getModel(null, 'resume', resumeSchema);
    }
}
function getEducationModel() {
    try { return DB.getModel('resume', 'educations', educationSchema); } catch (e) { return DB.getModel(null, 'educations', educationSchema); }
}
function getExperienceModel() {
    try { return DB.getModel('resume', 'experiences', experienceSchema); } catch (e) { return DB.getModel(null, 'experiences', experienceSchema); }
}
function getSummaryModel() {
    try { return DB.getModel('resume', 'summary', summarySchema); } catch (e) { return DB.getModel(null, 'summary', summarySchema); }
}
class ResumeCollection {
    static async findAll() {
        try {
            const resume = await getResumeModel().findOne({});
            return resume;
        } catch (error) {
            return error;
        }
    }
    static async getEducation() {
        try {
            const educations = await getEducationModel().find({});
            return educations;
        } catch (error) {
            return error;
        }
    }
    static async getExperience() {
        try {
            const experiences = await getExperienceModel().find({});
            return experiences;
        } catch (error) {
            return error;
        }
    }
    static async getSummary() {
        try {
            const summaries = await getSummaryModel().find({});
            return summaries;
        } catch (error) {
            return error;
        }
    }
}
module.exports = ResumeCollection;