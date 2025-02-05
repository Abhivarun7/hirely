const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the User schema
const userSchema = new Schema({
  user_id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: false
  },
  mail: {
    type: String,
    required: true,
    unique: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email']
  },
  phone_number: {
    type: String,
    required: false,
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: true
  },
  pic: {
    type: Buffer, // Store the image as binary data
    required: false
  },
  skills: {
    type: [String], // Array of strings for skills
    default: []
  },
  education: [
    {
      degree: {
        type: String,
        required: true
      },
      institution: {
        type: String,
        required: true
      },
      location: {
        type: String,
        required: false
      },
      timeline: {
        start_date: {
          type: Date,
          required: true
        },
        end_date: {
          type: Date,
          required: false // Allow for ongoing education
        }
      }
    }
  ],
  certifications: [
    {
      title: {
        type: String,
        required: true
      },
      organization: {
        type: String,
        required: true
      },
      date_issued: {
        type: Date,
        required: true
      },
      link: {
        type: String,
        required: false // Optional link to the certificate
      }
    }
  ],
  portfolio_link: {
    type: String,
    required: false // URL for portfolio
  },
  resume: {
    file: {
      type: Buffer, // Store the resume file as binary data
      required: false
    },
    filename: {
      type: String,
      required: false
    },
    mimetype: {
      type: String,
      required: false
    }
  },
  experience: [
    {
      company: {
        type: String,
        required: true
      },
      role: {
        type: String,
        required: true
      },
      timeline: {
        start_date: {
          type: Date,
          required: true
        },
        end_date: {
          type: Date,
          required: false // Allow for ongoing roles
        }
      },
      description: {
        type: String,
        required: false
      }
    }
  ],
  projects: [
    {
      title: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: false
      },
      link: {
        type: String,
        required: false // Optional link to the project
      },
      technologies: {
        type: [String],
        default: [] // List of technologies used
      }
    }
  ],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Create the User model
const User = mongoose.model('User', userSchema);

module.exports = User;
