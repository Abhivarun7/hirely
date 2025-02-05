const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const clientController = require('../controllers/clientController');

// Configure file upload middleware
const fileUploadMiddleware = fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: true,
  abortOnLimit: true, // Return 413 when upload exceeds limits
  safeFileNames: true, // Strip special characters
  preserveExtension: true // Preserve file extension
});

// Middleware to handle file upload errors
const handleUploadError = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File size too large. Maximum size is 5MB.'
    });
  }
  next(err);
};

// Test Route (optional)
router.get('/', (req, res) => {
  res.send("Client Router is set up!");
});

// Authentication Routes
router.post('/login', (req, res) => {
  console.log("Login request received:", {
    email: req.body.email,
    timestamp: new Date().toISOString()
  });
  clientController.loginClient(req, res);
});

// Profile Picture Routes with Error Handling
router.post('/uploadProfilePic', 
  fileUploadMiddleware,
  handleUploadError,
  clientController.uploadProfilePic
);
router.get('/applications/:employeeId', clientController.getApplications);
router.get('/profilePic/:employeeId', clientController.getProfilePic);
router.get('/user/:userId', clientController.getApplicationUserData);
router.patch('/jobs/:jobId/applications/status', clientController.updateApplicationStatus);

// Dashboard Stats
router.get('/stats/:employeeId', clientController.getDashboardStats);

// CRUD Routes
router.post('/add', clientController.addClient);
router.get('/all', clientController.getAllClients);
router.put('/update/:id', clientController.updateClient);
router.delete('/delete/:id', clientController.removeClient);

router.get('/userSearch', clientController.searchUser);

// Error handling middleware for the router
router.use((err, req, res, next) => {
  console.error('Router Error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

module.exports = router;