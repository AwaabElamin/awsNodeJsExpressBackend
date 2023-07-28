var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res, next)=> {
  try {
    req.db.collection('resume').find().toArray()
        .then(data => {
            res.json({
                status: "success",
                summary: data[0].summary,
                Education: data[0].Education,
                Certificate: data[0].Certificate,
                Experience: data[0].Experience
            });
        });

} catch (error) {
    console.log(error);
    res.json({ status: "fail", data: error });
}
  // res.render('index', { title: 'Express' });
  // res.json({status:2, summary:"I am full stack developer with more than 3 years experience. "+
  // "I have hands-on experience in developing web and mobile apps using JavaScript,"+
  // "jQuery, NodeJS, React and Angular throw all phases of SDLC. Also, I have worked "+
  // "for 3 years developing many projects using Dot Net C Sharp and Java SPS."+
  // " I'm effective team member who communicates closely with the team while developing a project"})
}
);

module.exports = router;
