const Job = require('../models/Job');

const generateJobId = async () => {
  // Find the highest job_id in the database
  const lastJob = await Job.findOne().sort({ job_id: -1 });
  if (!lastJob) {
    // If no jobs exist, start with a default job_id
    return 10000; // First job_id
  }
  // Increment the last job_id to generate the next job_id
  return lastJob.job_id + 1;
};
// Create new job
exports.createJob = async (req, res) => {
  try {
    // Generate job_id
    const jobId = await generateJobId();

    // Create a new job object with the generated job_id and job_status set to "Open"
    const job = new Job({
      ...req.body, // Spread the data from the request body
      job_id: jobId, // Assign the generated job_id
      job_status: 'Open', // Set the job status to "Open"
    });

    // Save the job to the database
    await job.save();
    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Error creating job',
      error: error.message,
    });
  }
};
// Search jobs with multiple filters
exports.searchJobs = async (req, res) => {
  try {
    const { query, location, page = 1, limit = 10 } = req.query;
    let searchCriteria = { job_status: 'Open' };

    if (query) {
      searchCriteria.$text = { $search: query };
    }

    if (location) {
      searchCriteria.location = { $regex: location, $options: 'i' };
    }


    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(searchCriteria)
      .sort({ date_posted: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(searchCriteria);

    res.json({
      success: true,
      data: {
        jobs,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalJobs: total
      }
    });
  } catch (error) {
    console.error("Error searching jobs:", error);  // Log error to server console
    res.status(500).json({
      success: false,
      message: 'Error searching jobs',
      error: error.message
    });
  }
};
exports.getRecentJobs = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log('Request received for employeeId:', employeeId);

    // First check if any jobs exist for this employeeId
    const jobCheck = await Job.findOne({ employeeId: parseInt(employeeId) });
    console.log('Initial job check:', jobCheck ? 'Jobs found' : 'No jobs found');

    const recentJobs = await Job.aggregate([
      {
        $match: { employeeId: parseInt(employeeId) }
      },
      {
        // Debug stage to log the structure of documents
        $addFields: {
          debug_info: {
            hasReceivedApplications: { $toBool: { $ifNull: ["$receivedApplications", false] } },
            applicationsCount: { 
              $cond: {
                if: { $isArray: "$receivedApplications" },
                then: { $size: "$receivedApplications" },
                else: 0
              }
            }
          }
        }
      },
      {
        $sort: { date_posted: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          job_id: 1,
          job_title: 1,
          company_name: 1,
          location: 1,
          job_type: 1,
          salary_range: 1,
          experience_required: 1,
          education_required: 1,
          application_deadline: 1,
          date_posted: 1,
          job_status: 1,
          job_category: 1,
          applicants_count: {
            $cond: {
              if: { $isArray: "$receivedApplications" },
              then: { $size: "$receivedApplications" },
              else: 0
            }
          },
          applications_status: {
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
          },
          debug_info: 1
        }
      }
    ]);

    console.log('Aggregation pipeline completed');
    console.log('Number of jobs found:', recentJobs.length);
    
    // Log detailed information about each job
    recentJobs.forEach((job, index) => {
      console.log(`\nJob ${index + 1} details:`);
      console.log('Job ID:', job.job_id);
      console.log('Title:', job.job_title);
      console.log('Total Applicants:', job.applicants_count);
      console.log('Applications Status:', job.applications_status);
      console.log('Debug Info:', job.debug_info);
    });

    // Remove debug info before sending response
    const cleanedJobs = recentJobs.map(job => {
      const { debug_info, ...cleanJob } = job;
      return cleanJob;
    });

    res.status(200).json({
      success: true,
      count: cleanedJobs.length,
      data: cleanedJobs
    });

  } catch (error) {
    console.error('Error in getRecentJobs:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: "Error fetching recent jobs",
      error: error.message
    });
  }
};
// Get job by job_id
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findOne({ job_id: req.params.job_id });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving job',
      error: error.message
    });
  }
};
// Get job stats for an employee
exports.getJobStats = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Total jobs posted by this employee
    const postedJobs = await Job.countDocuments({ employeeId });

    // Active listings (jobs with status "Open") posted by this employee
    const activeListings = await Job.countDocuments({ employeeId, job_status: 'Open' });

    res.json({
      success: true,
      stats: {
        postedJobs,
        activeListings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving job stats',
      error: error.message,
    });
  }
};
exports.getJobsByEmployeeId = async (req, res) => {
  try {
    const jobs = await Job.find({ employeeId: req.params.employee_id }); // Fetch multiple jobs
    console.log("Retrieved Jobs:", jobs); // Log the data
    
    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No jobs found for this employee'
      });
    }
    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error("Error retrieving jobs:", error); // Log the error
    res.status(500).json({
      success: false,
      message: 'Error retrieving jobs',
      error: error.message
    });
  }
};
// Update job
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { job_id: req.params.job_id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating job',
      error: error.message
    });
  }
};
// Delete job
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ job_id: req.params.job_id });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting job',
      error: error.message
    });
  }
};

