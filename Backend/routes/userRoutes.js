const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const router = express.Router();

// Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Authentication route
router.post('/login', userController.login);

// User management routes
router.post('/add', (req, res, next) => {
    console.log('body', req.body); // Log the body on each request
    userController.addUser(req, res, next); // Proceed to your controller
  });
  
router.delete('/remove/:user_id', userController.removeUser);
router.put('/edit/:user_id', upload.single('pic'), userController.editUser);
router.get('/:user_id', userController.getUserById);
router.get('/', userController.getAllUsers);

// Skill, education, and experience routes
router.put('/users/:user_id/skills', userController.modifySkill);
router.put('/users/:user_id/education', userController.modifyEducation);
router.put('/users/:user_id/experience', userController.modifyExperience);
router.put('/users/:user_id/project', userController.modifyProject);
router.put('/users/:user_id/certification', userController.modifyCertification);

// Resume upload/download route
router.put('/users/:user_id/resume/:action', upload.single('resume'), userController.handleResumeAction);
router.get('/users/:user_id/resume/:action', upload.single('resume'), userController.handleResumeAction);
router.put(
    '/users/:user_id/pic/:action', 
    upload.single('pic'), 
    userController.handlePicChange
  );
router.put('/users/:userId/personalInfo', userController.modifyPersonalInfo);


router.get('/users/jobsearch', userController.searchJobs);
router.post('/users/companysearch', userController.searchCompanies);
router.post('/users/applyjob', userController.applyJob);
router.get('/users/:user_id/countApplicationsSent', userController.getApplications);

module.exports = router;
