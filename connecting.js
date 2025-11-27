const DB = require('./lib/db');

class ConnectionDB {
    static async connectToDeliveryBD() {
        const uri = process.env.MONGODB_URI_DELIVERY;
        if (!uri) {
            console.warn('MONGODB_URI_DELIVERY not set; skipping delivery DB connect');
            return;
        }
        return DB.connect(uri);
    }
}

module.exports = ConnectionDB;