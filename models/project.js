const mongoose = require('mongoose');
const projectSchema = mongoose.Schema({
    email: { type: String, unique: true },
    projectName: { type: String, unique: true }
});
const projectModel = mongoose.model('projects', projectSchema);
class ProjectCollection{
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
                return { status:'fail', message: error };
            }
        }
    }
}
module.exports = ProjectCollection;