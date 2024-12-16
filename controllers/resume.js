const resumeModel = require('../models/resume');
const connectResumeDB = require('mongoose');
const connectionString =
    'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/resume?retryWrites=true&w=majority';
exports.getAll = async (req, res) => {
    // await connectResumeDB.connect(connectionString)
    //     .then(async () => {
    //         console.log("Route Resume get all then connected");
    //         const resume = await resumeModel.findAll();
    //         res.send({status:"success",data:resume});
    //     })
    //     .catch(error => {
    //         console.log("Route Resume get all catch connect");
    //         res.send(error)
    //     });
    // await connectResumeDB.disconnect()
    //     .then(() => console.log("Route Resume get all then disconnected"))
    //     .catch(error => console.log("Route Resume get all catch disconnected"));
    res.send({status:"success", data:"Awaab"});
}
exports.getEducations = async (req, res) => {
    await connectResumeDB.connect(connectionString)
        .then(async() => {
            console.log("Route Resume get educations then connected");
            const educations = await resumeModel.getEducation();
            // console.log("educations data", educations);
            res.send({status:"success",data:educations});
        })
        .catch(error =>{
            console.log("Route Resume get educations catch connected",error);
            res.send({status:"error",data:error})
        });
    // await connectResumeDB.disconnect()
    //     .then(() => console.log("Route Resume get educations then disconnect"))
    //     .catch(error => console.log("Route Resume get educations catch disconnect",error));
}
exports.getExperience = async (req, res) => {
    await connectResumeDB.connect(connectionString)
        .then(async() => {
            console.log("Route Resume get Experience then connected");
            const experiences = await resumeModel.getExperience();
            res.send({status:"success",data:experiences});
        })
        .catch(error =>{
            console.log("Route Resume get experiences catch connected",error);
            res.send({status:"error",data:error})
        });
    // await connectResumeDB.disconnect()
    //     .then(() => console.log("Route Resume get experiences then disconnect"))
    //     .catch(error => console.log("Route Resume get experiences catch disconnect",error));
}
exports.getSummary = async (req, res) => {
    await connectResumeDB.connect(connectionString)
        .then(async() => {
            console.log("Route Resume get Summary then connected");
            const summaries = await resumeModel.getSummary();
            res.send({status:"success",data:summaries});
        })
        .catch(error =>{
            console.log("Route Resume get summaries catch connected",error);
            res.send({status:"error",data:error})
        });
    // await connectResumeDB.disconnect()
    //     .then(() => console.log("Route Resume get experiences then disconnect"))
    //     .catch(error => console.log("Route Resume get experiences catch disconnect",error));
}
