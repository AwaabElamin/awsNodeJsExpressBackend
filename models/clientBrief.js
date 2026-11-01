const mongoose = require('mongoose');

const clientBriefSchema = new mongoose.Schema({
    clientName: { type: String, required: true, trim: true, maxlength: 120 },
    clientEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    company: { type: String, trim: true, maxlength: 160 },
    projectName: { type: String, required: true, trim: true, maxlength: 160 },
    projectType: { type: String, trim: true, maxlength: 100 },
    responses: { type: mongoose.Schema.Types.Mixed, required: true },
    // Legacy public submissions stay read-only; an Admin converts them into a client project profile.
    status: { type: String, enum: ['new', 'converted', 'archived'], default: 'new' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'clientProjects', default: null }
}, { timestamps: true });

const clientBriefModel = mongoose.model('clientBriefs', clientBriefSchema);

class ClientBriefCollection {
    static async listForAdmin() {
        return clientBriefModel.find({}).sort({ createdAt: -1 }).lean();
    }

    static async getForAdmin(id) {
        return clientBriefModel.findById(id).lean();
    }

    static async markConverted(id, projectId) {
        return clientBriefModel.findByIdAndUpdate(
            id,
            { $set: { status: 'converted', projectId } },
            { new: true }
        ).lean();
    }
}

module.exports = ClientBriefCollection;