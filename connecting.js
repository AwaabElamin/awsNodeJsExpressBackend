const DB = require('./lib/db');
class ConnectionDB {
    static async connectToDeliveryBD() {
        const connection = DB.getConnection('delivery');
        if (!connection) {
            throw new Error("The 'delivery' MongoDB connection is not available");
        }
        return connection;
    }
}
module.exports = ConnectionDB;