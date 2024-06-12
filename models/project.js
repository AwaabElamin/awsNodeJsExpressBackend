const mongoose = require('mongoose');
const projectSchema = mongoose.Schema({
    email: { type: String, unique: false },
    projectName: { type: String, unique: true },
    actors: { type: Array, unique: false },
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
        try {
            const projects = await projectModel.find({ email: email });
            return projects;
        } catch (error) {
            return { status: 'fail', message: error };
        }
    }
    static async getAllUserStories(email, PID) {
        try {
            const project = await projectModel.findOne({ email: email, _id: PID });
            return { status: 'success', message: project.userStories };
        } catch (error) {
            return { status: 'fail', message: error };
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
        try {
            const us = await projectModel.findOneAndUpdate(filter, update);
            return us;
        } catch (error) {
            return { status: 'fail', message: error };
        }
    }
    static async getAllActors(email, PID) {
        try {
            const actors = await projectsModel.findOne({ email: email, _id: PID });
            return { status: 'success', message: project.userStories };
        } catch (error) {
            return { status: 'fail', message: error };
        }
    }
}
module.exports = ProjectCollection;