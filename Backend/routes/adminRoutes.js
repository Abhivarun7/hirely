const express = require('express');
const userController = require('../controllers/userController'); // Adjust the path as necessary

const router = express.Router();

// Route to fetch all users
router.get('/users', userController.getAllUsers);

module.exports = router;
