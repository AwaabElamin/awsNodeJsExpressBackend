const auto = require('../models/auto');
const connectAutoDB = require('mongoose');

exports.getAutoUser = async(req,res) =>{
    try{
        // console.log("email",req.params.email);
        const user = await auto.getUserInfo(req.params.email);
        res.send({status:"success", data:user});
    }catch(error){
        console.log("Route Auto get autoUser catch connected",error);
        res.send({status:"error",data:error})
    };
}