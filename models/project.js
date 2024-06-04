const mongoose = require('mongoose');
const projectSchema = mongoose.Schema({
    email: { type: String, unique: false },
    projectName: { type: String, unique: true },
    userStories: [{
        actor: { type: String, unique: false },
        cRUD: { type: String, unique: false },
        action: { type: String, unique: false },
    }],
});
const projectModel = mongoose.model('projects', projectSchema);
class ProjectCollection {
    static async create(project) {
        const new_project = new projectModel(project);
        try {
            await new_project.save();
            console.log('create:- ', new_project);
            return { status: 'success', message: new_project };
        } catch (error) {
            // console.log('', error.code);
            if (error.code == 11000) {
                return { status: 'success', message: "project already exist" };
            } else {
                return { status: 'fail', message: error };
            }
        }
    }
    static async getAllProjects(email) {
        const projects = await projectModel.find({ email: email });
        return projects;
    }
    static async getAllUserStories(email,PID) {
        try {
            const project = await projectModel.find({ email: email, _id:PID});
        return {status: 'success', message:project.userStories};
        } catch (error) {
            if (error.code == 11000) {
                return { status: 'success', message: "project already exist" };
            } else {
                return { status: 'fail', message: error };
            }
        }
        
    }
    static async insertUserStory(userStory) {
        const filter = { email: userStory.email }
        const update = {
            $push: {
                userStories: {
                    actor: userStory.actor,
                    cRUD: userStory.cRUD,
                    action: userStory.action
                }
            }
        }
        const us = await projectModel.findOneAndUpdate(filter, update);
        // console.log('us1',us1);
        const us1 = await projectModel.findOne(filter);
        console.log('us', us1);
        return us;
    }
}
module.exports = ProjectCollection;