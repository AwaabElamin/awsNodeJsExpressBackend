const mongoose = require('mongoose');
class ConnectionDB {
    static async connectToDeliveryBD() {
        const connectionString =
            'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/Delivery?retryWrites=true&w=majority'
        try {
            mongoose.connect(connectionString);
            console.log("Awaab connected");
        } catch (error) {
            console.log('Error: ', error);
        }
    }
}
module.exports = ConnectionDB;