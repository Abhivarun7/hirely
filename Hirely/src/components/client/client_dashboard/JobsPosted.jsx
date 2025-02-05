import { Users, Clock, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import JobEdit from './JobEdit';

import CustomAlert from './CustomAlert.jsx';

const JobsPosted = ({ selectedJob, setSelectedJob }) => {
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const employeeId = userDetails?.employeeId || null;

  const [allPostedJobs, setAllPostedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      if (employeeId) {
        try {
          const response = await axios.get(
            `https://hirely-2.onrender.com/api/jobs/getJobsByEmployeeId/${employeeId}`
          );
          setAllPostedJobs(response.data.data || []);
        } catch (error) {
          console.error("Error fetching jobs:", error);
          setError("Failed to load jobs. Please try again later.");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError("No employee ID found.");
      }
    };

    fetchJobs();
  }, [employeeId]);

  const renderApplicationCount = (applications) => {
    if (!applications) return '0 Applications';
    if (Array.isArray(applications)) return `${applications.length} Applications`;
    if (typeof applications === 'number') return `${applications} Applications`;
    return '0 Applications';
  };

  const handleDelete = async (jobId) => {
    try {
      await axios.delete(`https://hirely-2.onrender.com/api/jobs/delete/${jobId}`);
      setAlertMessage('Job deleted successfully');
      setShowAlert(true);
      setSelectedJob(null);
      // Refresh jobs list
      const response = await axios.get(
        `https://hirely-2.onrender.com/api/jobs/getJobsByEmployeeId/${employeeId}`
      );
      setAllPostedJobs(response.data.data || []);
    } catch (error) {
      setAlertMessage('Failed to delete job. Please try again.');
      setShowAlert(true);
    }
  };

  const renderJobDetails = () => {
    if (!selectedJob) return null;

    const job = selectedJob;
    return (
      <div className="p-8">
        <button
          onClick={() => setSelectedJob(null)}
          className="flex items-center gap-2 text-purple-500 hover:text-purple-400 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Jobs
        </button>
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl border border-purple-500/20 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">{job.job_title}</h2>
              <p className="text-gray-400">{job.company_name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Edit size={16} />
                Edit
              </button>
              <button 
                onClick={() => handleDelete(job.job_id)} 
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Job Details</h3>
                <div className="space-y-2 text-gray-300">
                  <div>Location: {job.location}</div>
                  <div>Type: {job.job_type}</div>
                  <div>Category: {job.job_category}</div>
                  <div>Salary: {job.salary_range}</div>
                  <div>Applications: {renderApplicationCount(job.receivedApplications)}</div>
                  <div>Deadline: {job.application_deadline}</div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Requirements</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  {Array.isArray(job.requirements) && job.requirements.length > 0 ? (
                    job.requirements.map((req, index) => <li key={index}>{req}</li>)
                  ) : (
                    <li>No requirements listed.</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Description</h3>
                <p className="text-gray-300">{job.job_description}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(job.skills_required) && job.skills_required.length > 0 ? (
                    job.skills_required.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-300">No skills listed.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>

    );
  };
  if (isEditing && selectedJob) {
    return <JobEdit 
      job={selectedJob} 
      onBack={() => setIsEditing(false)}
      onSave={() => {
        setIsEditing(false);
        setSelectedJob(null);
      }}
    />;
  }
  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (selectedJob) {
    return renderJobDetails();
  }

  

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-8 text-gray-100">Jobs Posted</h2>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl border border-purple-500/20 p-6">
        <div className="space-y-4">
          {allPostedJobs.map((job) => (
            <div
              key={job.id || job._id}
              className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => setSelectedJob(job)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-gray-200">{job.job_title}</h4>
                  <p className="text-sm text-gray-400">{job.location}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    job.job_status === 'Open'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {job.job_status}
                </span>

              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {renderApplicationCount(job.receivedApplications)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  Deadline: {job.application_deadline}
                </span>
              </div>
            </div>
          ))}
        </div>
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

export default JobsPosted;
