const auto = require('../models/auto');
const connectAutoDB = require('mongoose');
const connectionString = 'mongodb+srv://root:123@cluster0.wpzy5.mongodb.net/CarShop?retryWrites=true&w=majority';
exports.getAutoUser = async(req,res) =>{
    await connectAutoDB.connect(connectionString)
    .then(async () =>{
        console.log("Route Resume get educations then connected");
        const user = await auto.getUserInfo(req.email);
        res.send({status:"success", data:user});
    })
    .catch(error =>{
        console.log("Route Auto get autoUser catch connected",error);
        res.send({status:"error",data:error})
    });
}