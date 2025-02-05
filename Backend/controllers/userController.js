const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");
const Job = require("../models/Job");


// Function to generate a 5-digit unique user ID
const generateUserId = async () => {
  let userId;
  let userExists = true;

  while (userExists) {
    userId = Math.floor(10000 + Math.random() * 90000); // Generate a 5-digit random number
    userExists = await User.findOne({ user_id: userId }); // Check if user ID already exists
  }

  return userId;
};
exports.addUser = async (req, res) => {
  try {
    const { name, mail, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ mail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate unique 5-digit user ID
    const user_id = await generateUserId();

    // Log password and salt for debugging
    console.log('Password:', password);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    console.log('Generated Salt:', salt);  // Check the salt
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Hashed Password:', hashedPassword);  // Check the hashed password

    // Prepare the new user object
    const newUser = new User({
      user_id,
      name,
      mail,
      password: hashedPassword,
      phoneNumber: null, // Set phoneNumber to null
      location: null, // Set location to null
      pic: null, // Set pic to null
      resume: null, // Set resume to null
    });

    // Save the new user to the database
    const savedUser = await newUser.save();

    // Don't send password in response
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse); // Send the user data without password
  } catch (err) {
    console.error(err);  // Log error for debugging
    res.status(500).json({ message: 'Error adding user: ' + err.message });
  }
};
exports.login = async (req, res) => {
  try {
    const { mail, password } = req.body;

    // Find user by email
    const user = await User.findOne({ mail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Prepare response without password
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log('User logged in:', userResponse);

    return res.status(200).json({ message: 'Login successful', user: userResponse });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Error during login: ' + err.message });
  }
};
// Remove a user by ID
exports.removeUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const deletedUser = await User.findOneAndDelete({ user_id });

    if (!deletedUser) {
      return res.status(404).send('User not found');
    }

    res.status(200).send('User removed successfully');
  } catch (err) {
    res.status(500).send('Error removing user: ' + err.message);
  }
};
// Edit a user by ID
exports.editUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const updates = req.body;
    if (req.file) {
      updates.pic = req.file.buffer; // Update the image if uploaded
    }

    const updatedUser = await User.findOneAndUpdate({ user_id }, updates, {
      new: true // Return the updated user
    });

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.status(200).send('User updated successfully');
  } catch (err) {
    res.status(500).send('Error updating user: ' + err.message);
  }
};
// Get user by ID
exports.getUserById = async (req, res) => {
  const { id } = req.params; // Extract user ID from URL params

  try {
    const user = await User.findById(id); // Query user by MongoDB `_id`

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${id} not found`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
};
exports.modifySkill = async (req, res) => {
  try {
    const { user_id } = req.params; // Extract user_id from the route parameters
    const { skill, action } = req.body; // Extract skill and action from the request body

    if (!skill || typeof skill !== 'string' || skill.trim() === '') {
      return res.status(400).json({ message: 'Invalid skill provided' });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action provided. Use "add" or "remove".' });
    }

    // Convert user_id to a number since it's stored as a number in the database
    const numericUserId = Number(user_id);

    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Determine the update operation based on the action
    const updateOperation =
      action === 'add'
        ? { $addToSet: { skills: skill.trim() } } // Add skill to array if it doesn't exist
        : { $pull: { skills: skill.trim() } }; // Remove skill from array

    // Find the user by user_id and update the skills array
    const updatedUser = await User.findOneAndUpdate(
      { user_id: numericUserId },
      updateOperation,
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: `Skill successfully ${action}ed`,
      data: updatedUser.skills, // Return updated skills array
    });
  } catch (err) {
    res.status(500).json({ message: 'Error modifying skill: ' + err.message });
  }
};
exports.modifyEducation = async (req, res) => {
  try {
    const { user_id } = req.params; // Extract user_id from route parameters
    const { education, action } = req.body; // Extract education object and action from request body

    console.log('Received user_id:', user_id);
    console.log('Received education:', education);
    console.log('Received action:', action);

    if (!education || typeof education !== 'object') {
      return res.status(400).json({ message: 'Invalid education data provided' });
    }

    const numericUserId = Number(user_id);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Validate required education fields
    const { degree, institution, timeline, _id } = education;
    if (!degree || !institution || !timeline || !timeline.start_date ) {
      return res.status(400).json({ message: 'Incomplete education details provided or missing _id' });
    }

    let updateQuery = null;

    if (action === 'add') {
      updateQuery = { $addToSet: { education } }; // Add new education entry
    } 
    else if (action === 'remove') {
      // Remove entry based on _id (no need for arrayFilters)
      updateQuery = { $pull: { education: { _id } } };
    } 
    else if (action === 'update') {
      // Update the specific education entry
      updateQuery = {
        $set: {
          "education.$[elem].degree": education.degree,
          "education.$[elem].institution": education.institution,
          "education.$[elem].location": education.location,
          "education.$[elem].timeline.start_date": new Date(education.timeline.start_date),
          "education.$[elem].timeline.end_date": new Date(education.timeline.end_date),
        },
      };
    }

    if (!updateQuery) {
      return res.status(400).json({ message: 'Invalid action specified' });
    }

    // Perform the update (use arrayFilters only for updates)
    const updatedUser = await User.findOneAndUpdate(
      { user_id: numericUserId },
      updateQuery,
      { 
        new: true, // Return updated user document
        arrayFilters: action === 'update' ? [{ "elem._id": _id }] : undefined, // Only use arrayFilters for update
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log("Updated User:", updatedUser);

    res.status(200).json({
      success: true,
      message: `Education successfully ${action === 'add' ? 'added' : action === 'remove' ? 'removed' : 'updated'}`,
      data: updatedUser.education,
    });

  } catch (err) {
    console.error("Error modifying education:", err);
    res.status(500).json({ message: 'Error modifying education: ' + err.message });
  }
};
exports.modifyExperience = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { experience, action } = req.body;

    console.log("Received user_id:", user_id);
    console.log("Received experience:", experience);
    console.log("Received action:", action);

    // Validate user_id
    const numericUserId = Number(user_id);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: "Invalid user ID. It must be a number." });
    }

    // Ensure experience is properly received
    if (!experience) {
      return res.status(400).json({ message: "Experience data is missing." });
    }

    if (action === "remove") {
      if (!experience._id) {
        return res.status(400).json({ message: "Experience ID is required for removal." });
      }

      updateQuery = { $pull: { experience: { _id: experience._id } } };
    } 
    else if (action === "add") {
      updateQuery = { $push: { experience } };
    } 
    else if (action === "update") {
      if (!experience._id) {
        return res.status(400).json({ message: "Experience ID is required for update." });
      }

      updateQuery = {
        $set: {
          "experience.$[elem].company": experience.company,
          "experience.$[elem].role": experience.role,
          "experience.$[elem].description": experience.description,
          "experience.$[elem].timeline.start_date": new Date(experience.timeline.start_date),
          "experience.$[elem].timeline.end_date": new Date(experience.timeline.end_date),
        },
      };
    } 
    else {
      return res.status(400).json({ message: "Invalid action. Use 'add', 'remove', or 'update'." });
    }

    // Perform the update
    const updatedUser = await User.findOneAndUpdate(
      { user_id: numericUserId },
      updateQuery,
      {
        new: true, // Return updated document
        arrayFilters: action === "update" ? [{ "elem._id": experience._id }] : undefined,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: `Experience successfully ${action === "add" ? "added" : action === "remove" ? "removed" : "updated"}`,
      experience: updatedUser.experience,
    });

  } catch (error) {
    console.error("Error updating experience:", error);
    res.status(500).json({ message: "Internal server error: " + error.message });
  }
};
exports.modifyCertification = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { certification, action } = req.body;

    console.log("Received user_id:", user_id);
    console.log("Received certification:", certification);
    console.log("Received action:", action);

    // Convert user_id to a number
    const numericUserId = Number(user_id);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }

    // Find the user by user_id (not MongoDB _id)
    const user = await User.findOne({ user_id: numericUserId });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (action === "add") {
      if (!certification || !certification.title || !certification.organization) {
        return res.status(400).json({ message: "Certification data is incomplete." });
      }
      user.certifications.push(certification);
    } else if (action === 'remove') {
      // Additional null checks and logging
      console.log('Current certifications:', user.certifications);
      console.log('Certification to remove:', certification);

      user.certifications = user.certifications.filter(
        cert => cert._id.toString() !== certification._id.toString()
      );
    } else if (action === "edit") {
      const index = user.certifications.findIndex(
        (cer) =>
          cer.title === certification.oldCertification.title &&
          cer.organization === certification.oldCertification.organization
      );
      if (index !== -1) {
        user.certifications[index] = certification.newCertification;
      } else {
        return res.status(404).json({ message: "Certification not found for editing." });
      }
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "add", "remove", or "edit".' });
    }

    await user.save();
    res.status(200).json({ message: "Certification updated successfully.", certifications: user.certifications });
  } catch (error) {
    console.error("Error updating certification:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
exports.modifyProject = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { project, action } = req.body;

    console.log('Received user_id:', user_id);
    console.log('Received project:', project);
    console.log('Received action:', action);

    const numericUserId = Number(user_id);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: 'Invalid user ID. It must be a number.' });
    }

    const user = await User.findOne({ user_id: numericUserId });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (action === 'add') {
      user.projects.push(project);
    } else if (action === "remove") {
      user.projects = user.projects.filter(
        (proj) => proj._id.toString() !== project._id.toString()
      );
    } else if (action === "edit") {
      if (!project.oldProject._id || !project.newProject) {
        return res.status(400).json({ message: "Project ID is required for update." });
      }

      // Find the project by _id and update it
      const updatedUser = await User.findOneAndUpdate(
        { user_id: numericUserId, "projects._id": project.oldProject._id },
        {
          $set: {
            "projects.$.title": project.newProject.title,
            "projects.$.description": project.newProject.description,
            "projects.$.link": project.newProject.link,
            "projects.$.technologies": project.newProject.technologies
          }
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "Project not found for editing." });
      }

      return res.status(200).json({ message: 'Project updated successfully.', projects: updatedUser.projects });
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "add", "remove", or "edit".' });
    }

    await user.save();
    res.status(200).json({ message: 'Project updated successfully.', projects: user.projects });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
exports.modifyUserDetails = async (userId, updatedData) => {
  try {
    // Find the user by user_id
    const user = await User.findOne({ user_id: userId });

    if (!user) {
      throw new Error('User not found');
    }

    // Update the basic details if provided
    if (updatedData.name) user.name = updatedData.name;
    if (updatedData.location) user.location = updatedData.location;
    if (updatedData.mail) user.mail = updatedData.mail;
    if (updatedData.phone_number) user.phone_number = updatedData.phone_number;

    // Handle resume file if provided
    if (updatedData.resumeFile) {
      user.resume.file = updatedData.resumeFile.buffer; // assuming resumeFile is a file buffer
      user.resume.filename = updatedData.resumeFile.originalname;
      user.resume.mimetype = updatedData.resumeFile.mimetype;
    }

    // Handle profile picture if provided
    if (updatedData.profilePicFile === null) {
      user.pic = null; // Remove profile picture
    } else if (updatedData.profilePicFile) {
      user.pic = updatedData.profilePicFile.buffer; // assuming profilePicFile is a file buffer
    }

    // Update the timestamp for modification
    user.updated_at = Date.now();

    // Save the updated user document
    const updatedUser = await user.save();

    return updatedUser;
  } catch (error) {
    console.error('Error updating user details:', error.message);
    throw error;
  }
};
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).send('Error retrieving users: ' + err.message);
  }
};
exports.handleResumeAction = async (req, res) => {
  try {
    const { user_id, action } = req.params;
    const numericUserId = Number(user_id);

    // Input validation
    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: 'Invalid user ID. It must be a number.' });
    }

    if (action === 'upload') {
      // Validate the uploaded file
      const resume = req.file ? req.file.buffer : null;
      if (!resume) {
        return res.status(400).json({ message: 'No resume file uploaded.' });
      }
    
      // Save the binary buffer directly in the database
      const updatedUser = await User.findOneAndUpdate(
        { user_id: numericUserId },
        { resume }, // Save the buffer directly
        { new: true, runValidators: true }
      );
    
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found.' });
      }
    
      return res.status(200).json({
        message: 'Resume uploaded and updated successfully.',
        user: updatedUser,
      });
    }else if (action === 'download') {
      // Retrieve the user and their resume
      const user = await User.findOne({ user_id: numericUserId });
      if (!user || !user.resume) {
        return res.status(404).json({ message: 'Resume not found for the specified user.' });
      }
    
      // Ensure the resume is properly extracted as a buffer
      const resumeBuffer = user.resume;
    
      // Set response headers for a file download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resume-${user_id}.pdf"`,
      });
    
      // Send the binary data as the response
      res.status(200).send(resumeBuffer);
    }
     else {
      return res.status(400).json({ message: 'Invalid action. Use "upload" or "download".' });
    }
  } catch (err) {
    console.error('Error handling resume action:', err);
    res.status(500).json({ message: 'Internal server error.', error: err.message });
  }
};
exports.handlePicChange = async (req, res) => {
  try {
    const { user_id, action } = req.params;
    const numericUserId = Number(user_id);

    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: 'Invalid user ID. It must be a number.' });
    }

    if (action === 'upload') {
      const pic = req.file ? req.file.buffer : null;
      if (!pic) {
        return res.status(400).json({ message: 'No profile picture uploaded.' });
      }

      const updatedUser = await User.findOneAndUpdate(
        { user_id: numericUserId },
        { pic },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found.' });
      }

      return res.status(200).json({
        message: 'Profile picture uploaded and updated successfully.',
        user: updatedUser,
      });
    } else if (action === 'remove') {
      const updatedUser = await User.findOneAndUpdate(
        { user_id: numericUserId },
        { pic: null },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found.' });
      }

      return res.status(200).json({
        message: 'Profile picture removed successfully.',
        user: updatedUser,
      });
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "upload" or "remove".' });
    }
  } catch (err) {
    console.error('Error handling profile picture change:', err);
    res.status(500).json({ message: 'Internal server error.', error: err.message });
  }
}
exports.modifyPersonalInfo = async (req, res) => {
  try {
    const { userId } = req.params; // userId from request params
    const { name, mail, phoneNumber, location } = req.body;

    console.log('Received userId:', userId);
    console.log('Type of userId:', typeof userId);

    const numericUserId = Number(userId); // Convert userId to number

    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: 'Invalid user ID. It must be a number.' });
    }

    console.log('Converted numericUserId:', numericUserId);
    console.log('Type of numericUserId:', typeof numericUserId);

    // Find user by `user_id` (which is stored as a number in DB)
    let user = await User.findOne({ user_id: numericUserId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update only provided fields
    if (name) user.name = name;
    if (mail) user.mail = mail;
    if (phoneNumber) user.phone_number = phoneNumber;
    if (location) user.location = location;

    // Save updated user details
    await user.save();

    return res.status(200).json({ message: 'User details updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
exports.searchJobs = async (req, res) => {
  try {
    const {
      job_id,
      job_title,
      company_name,
      location,
      job_type,
      salary_range,
      experience_required,
      education_required,
      skills_required,
      job_description,
      date_posted,
      job_status,
      job_category
    } = req.query;

    let query = {};
    console.log('Received query:', req.query);

    if (job_id) query.job_id = Number(job_id); // Ensure job_id is a number
    if (job_title) query.job_title = { $regex: job_title, $options: 'i' };
    if (company_name) query.company_name = { $regex: company_name, $options: 'i' };
    if (location) query.location = { $regex: location, $options: 'i' };
    if (job_type) query.job_type = job_type;
    if (salary_range) query.salary_range = salary_range;
    if (experience_required) query.experience_required = { $gte: Number(experience_required) };
    if (education_required) query.education_required = education_required;
    if (skills_required) query.skills_required = { $in: skills_required.split(',') };
    if (job_description) query.job_description = { $regex: job_description, $options: 'i' };
    if (date_posted) query.date_posted = { $gte: new Date(date_posted) };
    if (job_status) query.job_status = job_status;
    if (job_category) query.job_category = job_category;

    if (Object.keys(query).length === 0) {
      return res.status(400).json({ message: 'No search criteria provided' });
    }

    const jobs = await Job.find(query);
    console.log('Found jobs:', jobs);
    res.status(200).json({ message: 'Search results', results: jobs });

  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
exports.applyJob = async (req, res) => {
  try {
    let { user_id, job_id, cover_letter } = req.body;
    console.log('Received user_id:', user_id);
    console.log('Received job_id:', job_id);

    // Convert IDs to numbers
    user_id = Number(user_id);
    job_id = Number(job_id);

    if (isNaN(user_id) || isNaN(job_id)) {
      return res.status(400).json({ error: "Invalid user_id or job_id" });
    }

    // Fetch user details
    const user = await User.findOne({ user_id });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Fetch job details
    const job = await Job.findOne({ job_id });
    if (!job) return res.status(404).json({ error: "Job not found" });

    console.log("Job found:", job); // Debugging
    console.log({
      user_id: user_id,
      user_name: user.name,
      date_applied: new Date(), // Current date & time
      status: "pending", // Default status
      cover_letter: cover_letter || null, // Optional cover letter
      comments: null // No comments initially
    });
    

    // Ensure job.receivedApplications exists
    if (!job.receivedApplications) job.receivedApplications = [];

    // Add application
    job.receivedApplications.push({
      user_id,
      user_name: user.name,
      date_applied: new Date(), // Current date & time
      status: "pending", // Default status
      resume: null, // Assuming `resume` is stored in the user model
      cover_letter: cover_letter || null, // Optional cover letter
      comments: null, // No comments initially
    });

    await job.save();

    res.json({ message: "Application submitted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
exports.searchCompanies = async (req, res) => {
  const { company_name } = req.body; // company_name is coming from the request body

  if (!company_name) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  try {
    // Find jobs posted by the company (case-insensitive search)
    const jobs = await Job.find({ company_name: { $regex: company_name, $options: 'i' } });

    if (jobs.length === 0) {
      return res.status(404).json({ message: `No jobs found for company: ${company_name}` });
    }

    // Get the job IDs
    const jobIds = jobs.map((job) => job.job_id);

    // Count the number of jobs
    const jobCount = jobs.length;

    return res.status(200).json({
      company_name,
      job_count: jobCount,
      job_ids: jobIds,
      message: `${jobCount} job(s) found for ${company_name}`,
    });
  } catch (error) {
    console.error('Error searching for company jobs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
exports.getApplications = async (req, res) => {
  try {
    const userId = Number(req.params.user_id); // Convert user_id to number

    const jobs = await Job.find({
      'receivedApplications.user_id': userId
    }).select('job_id job_title company_name location receivedApplications');

    let totalApplications = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    const applications = jobs.flatMap(job => 
      job.receivedApplications
        .filter(app => app.user_id === userId) // Type-consistent comparison
        .map(app => {
          totalApplications++;
          if (app.status === 'accepted') acceptedCount++;
          if (app.status === 'rejected') rejectedCount++;
          if (app.status === 'pending') pendingCount++;

          return {
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
          };
        })
    );

    res.status(200).json({
      totalApplications,
      acceptedCount,
      rejectedCount,
      pendingCount,
      applications
    });
  } catch (error) {
    console.error('Error in getApplications:', error);
    res.status(500).json({ message: 'Error fetching applications' });
  }
};

