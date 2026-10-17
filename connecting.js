const mongoose = require('mongoose');
class ConnectionDB {
    static async connectToDeliveryBD() {
        const connectionString = process.env.MONGODB_URI_DELIVERY;
        if (!connectionString) {
            throw new Error('MONGODB_URI_DELIVERY environment variable is required');
        }
        try {
            await mongoose.connect(connectionString);
            console.log("Awaab connected");
        } catch (error) {
            console.log('Error: ', error);
        }
    }
}
module.exports = ConnectionDB;