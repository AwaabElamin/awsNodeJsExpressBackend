const mongoose = require('mongoose');
const resumeSchema = mongoose.Schema({
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
//64c1be86558cfea813977fd2
const resumeModel = mongoose.model('resume', resumeSchema);
class ResumeCollection {
    static async findAll() {
        const resume = await resumeModel.find({});
        console.log("Find All:-", resume);
        return resume;
    }
}
module.exports = ResumeCollection;