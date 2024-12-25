const connectResumeDB = require('mongoose');
const connectionString =
    'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/resume?retryWrites=true&w=majority';
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
//64c1be86558cfea813977fd2
const resumeModel = connectResumeDB.model('resume', resumeSchema);
const educationModel = connectResumeDB.model('educations', educationSchema);
const experienceModel = connectResumeDB.model('experiences', experienceSchema);
const summaryModel = connectResumeDB.model('summary', summarySchema);
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
        const edu = await connectResumeDB.connect(connectionString)
        .then(async()=> {
            console.log('connect to education');
            const educations = await educationModel.find({});
            // await connectResumeDB.disconnect();
            return educations;
        })
        .catch( (error)=>{
            return error;
        });
        return edu;
    }
    static async getExperience() {
        const expe = await connectResumeDB.connect(connectionString)
        .then( async()=>{
            console.log('connect to experience');
            const experiences = await experienceModel.find({});
            await connectResumeDB.disconnect();
            return experiences;
        })
        .catch((error)=>{
            console.log('error in getting experience', error);
            return error;
        });
        return expe;
    }
    static async getSummary() {
        const summary = await connectResumeDB.connect(connectionString)
        .then(async()=> {
            console.log('connect to summary');
            const summaries = await summaryModel.find({});
            // await connectResumeDB.disconnect();
            return summaries;
        })
        .catch ((error) =>{
            console.log('error in getting summary', error);
            return error;
        });
        return summary;
    }
}
module.exports = ResumeCollection;