const mongoose = require('mongoose');
const mainMainSchema = mongoose.Schema({
    header : {type:String, unique:false},
    points : {type:Array, unique:false}
})
const mainMainModel = mongoose.model("mainMain",mainMainSchema);
class MainMainCollection {
    static async getProjects(){
        try {
            // const testProjects = await mainMainModel.find({});
            const projects = [
                {
                  header:"Auto Service",
                  points: [
                    "Display cars with all their details within an integrated package of tools that facilitate the mechanism of access and communication.",
                    "Quick exchange and modification of car details and insertion and deletion of attached photos.",
                    "Deploy all code using ci/cd via GitHub and achieved 99% of business rules.",
                    "After-sales services such as oil change and mechanical review can be added."
                  ],
                  url:"https://main.dfnradbwueq86.amplifyapp.com/"
                },
                {
                  header:"Groceries Shop",
                  points:[
                    "Display a list of all products, their prices and types.",
                    "Possibility of updating products periodically.",
                    "Enabling the customer to select and reserve products to be ready before his arrival.",
                    "Possibility of linking to the delivery program."
                  ],
                  url:"./groceries"
                },
                {
                  header:"Delivery Service",
                  points:[
                    "user-friendly interface.",
                    "real-time order tracking.",
                    "managing delivery drivers, location services, order history.", 
                    "ability to browse menus or product listings", 
                    "option to schedule deliveries."
                  ],
                  url:"./"
                }
              ];
            return projects;
        } catch (error) {
            return error;
        }
    }
}
module.exports = MainMainCollection;