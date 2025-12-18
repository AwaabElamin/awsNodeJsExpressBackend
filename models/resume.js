const DB = require('../lib/db');
const resumeSchema = {
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
};
const educationSchema = {
    email: { type: String },
    universityName: { type: String },
    degreeType: { type: String },
    majorName: { type: String },
    yearOfGraduate: { type: String }
}
const experienceSchema = {
    email: { type: String },
    companyName: { type: String },
    startYear: { type: String },
    positionName: { type: String },
    endYear: { type: String },
    projectName: { type: String },
    summary: { type: String },
    link: { type: String },
    TechnologiesUsed: { type: String }
};
const summarySchema = {
    email: {type:String},
    summary:{type:String}
}
// Use named connection 'resume' created in app startup
const resumeModel = DB.getModel('resume', 'resume', resumeSchema);
const educationModel = DB.getModel('resume', 'educations', educationSchema);
const experienceModel = DB.getModel('resume', 'experiences', experienceSchema);
const summaryModel = DB.getModel('resume', 'summary', summarySchema);
class ResumeCollection {
    static async findAll() {
        try {
            const resume = await resumeModel.findOne({});
            return resume;
        } catch (error) {
            return error;
        }
    }
    static async getEducation() {
        try {
            const educations = await educationModel.find({});
            return educations;
        } catch (error) {
            return error;
        }
    }
    static async getExperience() {
        try {
            const experiences = await experienceModel.find({});
            return experiences;
        } catch (error) {
            console.log('error in getting experience', error);
            return error;
        }
    }
    static async getSummary() {
        try {
            const summaries = await summaryModel.find({});
            return summaries;
        } catch (error) {
            console.log('error in getting summary', error);
            return error;
        }
    }
}
module.exports = ResumeCollection;