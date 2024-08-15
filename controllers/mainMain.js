const mainMainModel = require("../models/mainMain");
exports.getProjects = async (req,res) => {
    const projects = await mainMainModel.getProjects();
    res.send(projects);
}
exports.create = async (req, res) => {
    console.log("req.body", req.body);
    const projects = [
        {
          header:"MIS For Awaaab LLC",
          points: [
            "Create MIS web site serve provide all SDLC steps to let client fills them directly.",
            "I doing all three level (frontend, backend and DB ) for each feature daily  and push it to GitHub.",
            "Deploy all code using ci/cd via GitHub and achieved 99% of business rules.",
            "Technologies used: VS code, Angular, Node JS,  MongoDB Atlas, GitHub, AWS (Amplify, App Runner, Code Pipeline, Route53), DevOps."
          ],
        },
        {
          header:"MIS For Transporter LLC",
          points:[
            "Contributed to the design and development of internal software applications, APIs, and libraries to serves three Frontend apps.",
            "(web, android mobile, desktop) and achieved a 90% of owner requires.",
            "Worked with a highly motivated team in an Agile environment for all lifecycle stages.",
            "Deploy all code using ci/cd via GitHub and achieved 99% of business rules.",
            "Technologies used: Visual Studio .Net 6 C Sharp, GitHub, AWS (EC, S3, RDS and Route53), DevOps"
          ]
        },
        {
          header:"Web Application For Mosta LLC",
          points:[
            "Developed web application using WIX platform and achieved 100% of requirements.",
            "Increased market base by double and decreased Operating costs  10%.",
            "Technology used: WIX platform, AWS SNS, google domain."
          ]
        }
      ];
    const projectAdded = await projectModel.create(projects);
    console.log('add project', projectAdded);
    res.send({status:'success', message: projectAdded});
}