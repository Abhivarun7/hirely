const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// Schema for individual applications within the "receivedApplications" object
const receivedApplicationSchema = new Schema({
  user_id: {
    type: Number, 
    ref: 'User',  // Reference to the User collection
    required: true,
  },
  user_name: {
    type: String, 
    ref: 'User',  // Reference to the User collection
    required: true,
  },
  date_applied: {
    type: Date, 
    default: Date.now,  // Automatically set the date when application is submitted
  },
  status: {
    type: String,
    enum: ['verified', 'pending', 'rejected'],  // Enum for possible statuses
    default: 'pending',  // Default status is 'pending'
  },
  resume: {
    type: Buffer,  // URL or file path to resume if needed
  },
  cover_letter: {
    type: String,  // URL or file path to cover letter if needed
  },
  comments: {
    type: String,  // Optional field to add internal comments or feedback
  },
});

const jobSchema = new mongoose.Schema({
  job_id: {
    type: Number,
    required: true,
    unique: true
  },
  job_title: {
    type: String,
    required: true,
    trim: true
  },
  company_name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  job_type: {
    type: String,
    required: true,
    enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote']
  },
  salary_range: {
    type: String,
    required: true,
    trim: true
  },
  experience_required: {
    type: String,
    required: true,
    trim: true
  },
  education_required: {
    type: String,
    required: true,
    trim: true
  },
  skills_required: {
    type: Array,
    required: true,
    trim: true
  },
  job_description: {
    type: String,
    required: true,
    trim: true
  },
  application_deadline: {
    type: Date,
    required: true
  },
  date_posted: {
    type: Date,
    required: true,
    default: Date.now
  },
  job_status: {
    type: String,
    required: true,
    enum: ['Open', 'Closed', 'Draft', 'Archived'],
    default: 'Open'
  },
  job_category: {
    type: String,
    required: true,
    trim: true
  },
  employeeId: {
    type: Number,  // Use Number instead of Integer
    required: true,
    trim: true
  },receivedApplications: [receivedApplicationSchema]  // Array of applications for a specific job


}, {
  timestamps: true
});

// Create indexes for searching
jobSchema.index({
  job_title: 'text',
  company_name: 'text',
  job_description: 'text',
  skills_required: 'text'
});

jobSchema.pre('save', async function(next) {
  if (!this.job_id) {
    const randomNum = Math.floor(10000 + Math.random() * 90000).toString();
    this.job_id = randomNum;
    console.log(`Generated job_id: ${this.job_id}`);
  }
  next();
});



const Job = mongoose.model('job', jobSchema, 'job');

module.exports = Job;
