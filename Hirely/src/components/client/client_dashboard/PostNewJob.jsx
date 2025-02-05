import { useState } from 'react';
import { MapPin, DollarSign, GraduationCap, X, Calendar, BriefcaseBusinessIcon } from 'lucide-react';
import axios from 'axios';
import CustomAlert from './PostNewJobCustomAlert';

const PostNewJob = () => {
  const jobTypes = ["Full-Time", "Part-Time", "Contract", "Internship", "Remote"];
  const jobCategories = ["Technology", "Finance", "Healthcare", "Marketing", "Sales", "Education", "Other"];

  const [newSkill, setNewSkill] = useState('');
  const [skillsRequired, setSkillsRequired] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const [jobData, setJobData] = useState({
    job_title: '',
    company_name: '',
    location: '',
    job_type: '',
    salary_range: '',
    experience_required: '',
    education_required: '',
    job_category: '',
    application_deadline: '',
    job_description: ''
  });

  const handleSkillAdd = () => {
    if (newSkill && !skillsRequired.includes(newSkill)) {
      setSkillsRequired((prevSkills) => [...prevSkills, newSkill]);
      setNewSkill(''); // Clear input after adding
    }
  };

  const handleSkillRemove = (skillToRemove) => {
    setSkillsRequired((prevSkills) =>
      prevSkills.filter((skill) => skill !== skillToRemove)
    );
  };

  const handleChange = (e) => {
    setJobData({
      ...jobData,
      [e.target.name]: e.target.value
    });
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
  
    const jobPayload = {
      ...jobData,
      skills_required: skillsRequired,
      employeeId: JSON.parse(localStorage.getItem("userDetails"))?.employeeId
    };
  
    try {
      const response = await axios.post('https://hirely-2.onrender.com/api/jobs/create', jobPayload, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
      if (response.status === 201) {
        setAlertMessage('Job posted successfully!');
        setShowAlert(true);
        
        // Clear the form
        setJobData({
          job_title: '',
          company_name: '',
          location: '',
          job_type: '',
          salary_range: '',
          experience_required: '',
          education_required: '',
          job_category: '',
          application_deadline: '',
          job_description: ''
        });
        setSkillsRequired([]);
        setNewSkill('');
      } else {
        setAlertMessage('Failed to post job. Please try again.');
        setShowAlert(true);
      }
    } catch (error) {
      setAlertMessage(error.response?.data?.message || 'Error posting job. Please try again.');
      setShowAlert(true);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-8 text-gray-100">Post New Job</h2>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-xl border border-purple-500/20">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Job Title</label>
                <input
                  type="text"
                  name="job_title"
                  value={jobData.job_title}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="e.g. Software Engineer"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Company Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={jobData.company_name}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="location"
                    value={jobData.location}
                    onChange={handleChange}
                    className="w-full p-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="e.g. San Francisco, CA"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Job Type</label>
                <select
                  name="job_type"
                  value={jobData.job_type}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  required
                >
                  <option value="">Select job type</option>
                  {jobTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Salary Range</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="salary_range"
                    value={jobData.salary_range}
                    onChange={handleChange}
                    className="w-full p-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="e.g. 50,000 - 70,000 USD"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Experience Required</label>
                <input
                  type="text"
                  name="experience_required"
                  value={jobData.experience_required}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="e.g. 2+ years"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Education Required</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="education_required"
                    value={jobData.education_required}
                    onChange={handleChange}
                    className="w-full p-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="e.g. Bachelor's Degree"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Job Category</label>
                <select
                  name="job_category"
                  value={jobData.job_category}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  required
                >
                  <option value="">Select category</option>
                  {jobCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Application Deadline</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input
                    type="date"
                    name="application_deadline"
                    value={jobData.application_deadline}
                    onChange={handleChange}
                    className="w-full p-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Fields */}
          <div>
            <label className="text-lg font-semibold text-gray-200 mb-2 block">Required Skills</label>
            {/* Display added skills */}
            <div className="flex flex-wrap gap-2 mb-2">
              {skillsRequired.map((skill, index) => (
                <span key={index} className="bg-gray-800 text-gray-200 px-3 py-1 rounded-full flex items-center gap-2">
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleSkillRemove(skill)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            {/* Input for new skill */}
            <div className="flex gap-2">
              <input
                type="text"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                placeholder="e.g. JavaScript, React"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)} // Capture input value
              />
              <button
                type="button"
                onClick={handleSkillAdd}
                className="bg-purple-500 text-white p-3 rounded-lg"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Job Description</label>
            <textarea
              name="job_description"
              value={jobData.job_description}
              onChange={handleChange}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors h-32"
              placeholder="Enter detailed job description"
              required
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <BriefcaseBusinessIcon size={20} />
            Post Job
          </button>
        </form>
      </div>
      {showAlert && (
        <CustomAlert
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  );
};

export default PostNewJob;
