const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Job = require('../models/Job');
const Client = require('../models/Client');
const mongoose = require('mongoose');
const User = require('../models/User');
mongoose.set('debug', true);

exports.getApplicationUserData = async (req, res) => {
  try {
    // Parse userId from the request params to an integer
    const { userId } = req.params;
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Fetch user data based on parsed userId
    const user = await User.findOne({ user_id: parsedUserId });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the user data
    res.status(200).json({
      userId: user.user_id,
      name: user.name,
      location: user.location,
      email: user.mail,
      phoneNumber: user.phone_number,
      skills: user.skills,
      education: user.education,
      portfolioLink: user.portfolio_link,
      experience: user.experience,
      projects: user.projects,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    console.error('Error in getApplicationUserData:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const employeeid = req.params.employeeId;

    const jobs = await Job.find({
      employeeId: employeeid,
      'receivedApplications.status': status,
      job_status: 'Open', // Only fetch open jobs
    }).select('job_id job_title company_name location receivedApplications');

    // Transform data into a frontend-friendly format
    const applications = jobs.flatMap(job => 
      job.receivedApplications
        .filter(app => app.status === status)
        .map(app => ({
          applicationId: app._id,
          userId: app.user_id,
          userName: app.user_name,
          dateApplied: app.date_applied,
          status: app.status,
          jobDetails: {
            jobId: job.job_id,
            jobTitle: job.job_title,
            companyName: job.company_name,
            location: job.location,
          },
        }))
    );

    res.status(200).json(applications);
  } catch (error) {
    console.error('Error in getApplications:', error);
    res.status(500).json({ message: 'Error fetching applications' });
  }
};
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId, status, comments } = req.body;

    // Validate request body
    if (!userId || !status) {
      return res.status(400).json({ 
        success: false,
        message: 'userId and status are required fields' 
      });
    }

    // Validate if the status is valid
    if (!['verified', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status value. Must be verified, pending, or rejected' 
      });
    }

    // Find and update the job application
    const job = await Job.findOne({ job_id: parseInt(jobId) });

    if (!job) {
      return res.status(404).json({ 
        success: false,
        message: 'Job not found' 
      });
    }

    const applicationIndex = job.receivedApplications.findIndex(
      app => app.user_id === parseInt(userId)
    );

    if (applicationIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Application not found for this user' 
      });
    }

    // Update application status and comments
    job.receivedApplications[applicationIndex].status = status;
    
    if (comments) {
      job.receivedApplications[applicationIndex].comments = comments;
    }

    // Save the updated job document
    await job.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      updatedApplication: job.receivedApplications[applicationIndex]
    });

  } catch (error) {
    console.error('Error in updateApplicationStatus:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating application status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOne({ user_id: parseInt(userId) })
      .select('-password -pic -resume.file'); // Exclude sensitive/binary data

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userDetails = {
      userId: user.user_id,
      name: user.name,
      location: user.location,
      email: user.mail,
      phone: user.phone_number,
      skills: user.skills,
      education: user.education,
      certifications: user.certifications,
      portfolioLink: user.portfolio_link,
      experience: user.experience,
      projects: user.projects,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    res.status(200).json(userDetails);
  } catch (error) {
    console.error('Error in getUserDetails:', error);
    res.status(500).json({ message: 'Error fetching user details' });
  }
};
// Add a new client
exports.addClient = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match!" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    req.body.password = hashedPassword;
    req.body.confirmPassword = undefined; // remove confirmPassword from the body

    const newClient = new Client(req.body);
    const savedClient = await newClient.save();

    res.status(201).json({ message: "Client registered successfully!", data: savedClient });
  } catch (error) {
    res.status(500).json({ message: "Error adding client", error: error.message });
  }
};
exports.getDashboardStats = async (req, res) => {
  const employeeId = req.params.employeeId; // Keep as string since MongoDB handles type conversion
  console.log('getDashboardStats accessed with employeeId:', employeeId);

  try {
    // Get total jobs posted by this employee
    const postedJobs = await Job.countDocuments({ employeeId });
    console.log(`Total posted jobs: ${postedJobs}`);

    // Get active listings (jobs with status "Open")
    const activeListings = await Job.countDocuments({ 
      employeeId, 
      job_status: "Open" 
    });
    console.log(`Active listings: ${activeListings}`);

    // Get recent jobs with their details
    const recentJobs = await Job.aggregate([
      { $match: { employeeId } },
      { $sort: { date_posted: -1 } },
      {
        $project: {
          job_id: 1,
          job_title: 1,
          location: 1,
          application_deadline: 1,
          job_status: 1,
          applicants_count: {
            $cond: {
              if: { $isArray: "$receivedApplications" },
              then: { $size: "$receivedApplications" },
              else: 0
            }
          },
          status_breakdown: {
            verified: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$receivedApplications", []] },
                  as: "app",
                  cond: { $eq: ["$$app.status", "verified"] }
                }
              }
            },
            pending: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$receivedApplications", []] },
                  as: "app",
                  cond: { $eq: ["$$app.status", "pending"] }
                }
              }
            },
            rejected: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$receivedApplications", []] },
                  as: "app",
                  cond: { $eq: ["$$app.status", "rejected"] }
                }
              }
            }
          }
        }
      }
    ]);
    console.log('Recent Jobs:',recentJobs);  // Log the recent jobs,

  // Add applications count to each recent job
  const recentJobsWithApplications = await Promise.all(
    recentJobs.map(async (job) => {
      const applicationCount = await Job.countDocuments({
        job_id: Number(job.job_id), // Safely convert to a JavaScript Number
      });
      return {
        ...job._doc, // Spread the job details
        applications: applicationCount, // Add the applications count
      };
    })
  );
  

      console.log('Recent jobs with application counts:', recentJobsWithApplications);

    // Get pending applications count
    const applications = await Job.find({
      employeeId: Number(employeeId),
      'receivedApplications.status': 'pending'
    });

    let pendingCount = 0;
    applications.forEach(app => {
      pendingCount += app.receivedApplications.filter(ra => ra.status === 'pending').length;
    });
    console.log(`Pending applications count: ${pendingCount}`);

    // Get recent pending applications
    const recentPendingApplications = await Job.aggregate([
      {
        $match: {
          employeeId: Number(employeeId) // Convert to a JavaScript Number
        }
      },
      {
        $unwind: '$receivedApplications'
      },
      {
        $match: {
          'receivedApplications.status': 'pending'
        }
      },
      {
        $sort: {
          'receivedApplications.appliedDate': -1
        }
      },
      {
        $limit: 5
      },
      {
        $project: {
          applicantName: '$receivedApplications.applicantName',
          jobTitle: '$receivedApplications.jobTitle',
          appliedDate: '$receivedApplications.appliedDate',
          status: '$receivedApplications.status'
        }
      }
    ]);
    console.log('Recent pending applications:', recentPendingApplications);


    const recentApplications = await Job.aggregate([
      {
        $match: {
          employeeId: Number(employeeId)
        }
      },
      {
        $unwind: '$receivedApplications'
      },
      {
        $sort: {
          'receivedApplications.appliedDate': -1
        }
      },
      {
        $limit: 5
      },
      {
        $project: {
          applicationid:`$receivedApplications.user_id`,
          applicantName: '$receivedApplications.user_name',
          jobTitle: '$job_title',
          appliedDate: '$receivedApplications.date_applied',
          status: '$receivedApplications.status'
        }
      }
    ]);
    console.log('Recent applications:', recentApplications);



    // Return all stats
    res.status(200).json({
      postedJobs,
      activeListings,
      pendingApplications: recentPendingApplications,
      pendingCount,
      recentApplications: recentApplications,
      recentJobs
    });

  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ 
      message: "Error fetching dashboard stats", 
      error: error.message 
    });
  }
};
// Get all clients
exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: "Error fetching clients", error: error.message });
  }
};
// Update client details
exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedClient = await Client.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json({ message: "Client updated successfully", data: updatedClient });
  } catch (error) {
    res.status(500).json({ message: "Error updating client", error: error.message });
  }
};
// Remove a client
exports.removeClient = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedClient = await Client.findByIdAndDelete(id);
    if (!deletedClient) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json({ message: "Client removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error removing client", error: error.message });
  }
};
exports.uploadProfilePic = async (req, res) => {
  try {
    console.log('--- Request Received ---');
    console.log('Headers:', req.headers);
    console.log('Files:', req.files); // Log all uploaded files
    console.log('Body:', req.body);   // Log the request body

    // Check if file is uploaded
    if (!req.files || !req.files.profilePic) {
      console.log('Error: No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Validate employee ID
    const employeeId = req.body.employeeId;
    if (!employeeId) {
      console.log('Error: Employee ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    // Extract file
    const file = req.files.profilePic;
    console.log('File Details:', {
      name: file.name,
      size: file.size,
      mimetype: file.mimetype,
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      console.log('Error: Invalid file type', file.mimetype);
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPG, PNG, and GIF are allowed.',
      });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      console.log('Error: File size exceeds limit', file.size);
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.',
      });
    }

    // Simulating saving to database
    console.log('Attempting to update client with employeeId:', employeeId);

    const client = await Client.findOneAndUpdate(
      { employeeId: employeeId },
      {
        pic: {
          data: file.data,
          contentType: file.mimetype,
        },
      },
      { new: true }
    );

    if (!client) {
      console.log('Error: Client not found');
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Log success
    console.log('Profile picture updated successfully for:', employeeId);

    // Construct updated user details
    const userDetails = {
      id: client._id,
      email: client.email,
      name: client.firstName,
      employeeId: client.employeeId,
      isVerified: client.isVerified,
      profilePic: {
        data: file.data,
        contentType: file.mimetype,
      },
    };

    // Respond with success
    return res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        id: client._id,
        email: client.email,
        name: client.firstName,
        employeeId: client.employeeId,
        isVerified: client.isVerified,
        profilePic, // Base64 image string
      },
    });
    

  } catch (error) {
    console.error('--- Error in uploadProfilePic ---');
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);

    // Respond with error
    return res.status(500).json({
      success: false,
      message: 'Error uploading profile picture',
      error: error.message,
    });
  }
};
// Add this function to get profile picture
exports.getProfilePic = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const client = await Client.findOne({ employeeId });
    
    if (!client || !client.profilePic || !client.profilePic.data) {
      return res.status(404).json({
        success: false,
        message: 'Profile picture not found'
      });
    }

    res.set('Content-Type', client.profilePic.contentType);
    res.send(client.profilePic.data);

  } catch (error) {
    console.error('Error in getProfilePic:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving profile picture',
      error: error.message
    });
  }
};
exports.loginClient = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find the client by email
    const client = await Client.findOne({ email });

    if (!client) {
      return res.status(400).json({ message: "Client not found" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, client.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Create a JWT token (ensure a secret key is stored in an environment variable)
    const token = jwt.sign({ id: client._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Send the token and client details (exclude sensitive fields like password)
    res.json({
      message: 'Login successful',
      token,
      client: {
        id: client._id,
        email: client.email,
        name: client.firstName,
        profilePic: client.pic,
        employeeId: client.employeeId,
        isVerified: client.isVerified,
        // Add other client fields if necessary
      }
    });
  } catch (error) {
    console.error(error.message || "Error");
    res.status(500).json({ message: "Server error" });
  }
};
const levenshtein = require('fast-levenshtein');  // You can install this package for calculating string similarity

exports.searchUser = async (req, res) => {
  const { name, location, skills } = req.query;

  try {
    let query = {};
    let closeMatches = { name: [], location: [], skills: [] };

    if (name) {
      query.name = { $regex: name, $options: 'i' }; // Case-insensitive name search
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' }; // Case-insensitive location search
    }

    if (skills) {
      query.skills = { $regex: skills, $options: 'i' }; // Case-insensitive partial match for skills
    }

    const users = await User.find(query);

    if (users.length > 0) {
      return res.json(users);
    }

    // No exact matches found, look for close matches
    if (name) {
      closeMatches.name = await findCloseMatches('name', name);
    }

    if (location) {
      closeMatches.location = await findCloseMatches('location', location);
    }

    if (skills) {
      closeMatches.skills = await findCloseMatches('skills', skills);
    }

    const allCloseMatches = [
      ...closeMatches.name,
      ...closeMatches.location,
      ...closeMatches.skills,
    ];

    if (allCloseMatches.length === 0) {
      return res
        .status(404)
        .json({ message: 'No similar users found with the provided search criteria' });
    }

    res.json(allCloseMatches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error searching users', error: err.message });
  }
};

// Helper function for close matches
const findCloseMatches = async (field, searchTerm) => {
  const users = await User.find({});
  const threshold = 3; // Adjust this for tolerance level
  let closeMatches = [];

  users.forEach((user) => {
    let value = user[field];

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (levenshtein.get(item.toLowerCase(), searchTerm.toLowerCase()) <= threshold) {
          closeMatches.push(user);
        }
      });
    } else if (
      value &&
      levenshtein.get(value.toLowerCase(), searchTerm.toLowerCase()) <= threshold
    ) {
      closeMatches.push(user);
    }
  });

  return closeMatches;
};
