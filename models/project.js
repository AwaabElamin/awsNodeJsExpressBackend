const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;
const projectSchema = mongoose.Schema({
    email: { type: String, unique: false },
    projectName: { type: String, unique: true },
    actors: { type: Array, unique: false },
    userStories: [{
        actor: { type: String, unique: false },
        cRUD: { type: String, unique: false },
        action: { type: String, unique: false },
        title: { type: String, unique: false },
        description: { type: String, unique: false },
        PrimaryActor: { type: String, unique: false },
        Preconditions: { type: String, unique: false },
        postCondition: { type: String, unique: false },
        mainSuccessScenario: { type: String, unique: false },
        extensions: { type: String, unique: false },
        frequencyOfUse: { type: String, unique: false },
        status: { type: String, unique: false },
        owner: { type: String, unique: false },
        priority: { type: String, unique: false }
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
            return { status: 'success', message: projects };
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
                    action: userStory.action,
                    title: "Enter the goal of the use case - preferably as a short, active verb phrase",
                    description: 'Describe the goal and context of this use case. This is usually an expanded version of what you entered in the Title field.',
                    PrimaryActor: "A person or a software/hardware system that interacts with your system to achieve   the goal of this use case.",
                    Preconditions: "Describe the state the system is in before the first event in this use case.",
                    postCondition: "Describe the state the system is in after all the events in this use case have taken place.",
                    mainSuccessScenario: "Describe the flow of events from preconditions to postconditions, when nothing goes wrong. This is the meat of the use case.",
                    extensions: "Describe all the other scenarios for this use case - including exceptions and error cases.",
                    frequencyOfUse: "How often will this use case be used?",
                    status: "Development status.",
                    owner: "Who owns this use case, in your project team?",
                    priority: "Priority of this use case"
                }
            }
        }
        try {
            const us = await projectModel.findOneAndUpdate(filter, update);
            return { status: 'success', message: us };
        } catch (error) {
            return { status: 'fail', message: error };
        }
    }
    static async getAllActors(email, PID) {
        try {
            const project = await projectModel.findOne({ email: email, _id: PID });
            // console.log("Actors", project);
            return { status: 'success', message: project.actors };
        } catch (error) {
            return { status: 'fail', message: error };
        }
    }
    static async insertActor(email, projectId, actor) {
        const filter = { email: email };
        const update = { $push: { actors: actor } };
        try {
            const act = await projectModel.findOneAndUpdate(filter, update);
            return { status: 'success', message: act };
        } catch (error) {
            return { status: 'fail', message: error };
        }
    }
    static async insertUseCase(email, projectId, useCase) {
        // console.log('email', email);
        // console.log('projectId', projectId);
        // console.log('Awaab', useCase)
        const filter = { email: email, 'userStories._id': useCase.id };
        const update = {
            $set: {
                'userStories.$.title': useCase.title,
                'userStories.$.description': useCase.description,
                'userStories.$.PrimaryActor': useCase.PrimaryActor,
                'userStories.$.Preconditions': useCase.Preconditions,
                'userStories.$.postCondition': useCase.postCondition,
                'userStories.$.mainSuccessScenario': useCase.mainSuccessScenario,
                'userStories.$.extensions': useCase.mainSuccessScenario,
                'userStories.$.frequencyOfUse': useCase.mainSuccessScenario,
                'userStories.$.status': useCase.mainSuccessScenario,
                'userStories.$.owner': useCase.mainSuccessScenario,
                'userStories.$.priority': useCase.mainSuccessScenario
            }
        }
        try {
            const act = await projectModel.findOneAndUpdate(filter, update);
            uc = await act.userStories.find((n) => n._id = useCase.id)
            console.log("act", uc);
            return { status: 'success', message: uc };
        } catch (error) {
            return { status: 'fail', message: "error" };
        }
    }
    static async selectUseCase(email, projectId, id) {
        try {
            let useCase = [];
            const project = await projectModel.findOne({ email: email, _id: projectId });
            project.userStories.forEach(element => {
                element._id == id ? useCase = element : null;
            });

            return { status: 'success', message: useCase };
        } catch (error) {
            return { status: 'fail', message: error };
        }
    }
}
module.exports = ProjectCollection;