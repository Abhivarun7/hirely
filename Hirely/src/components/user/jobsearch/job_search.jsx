import React, { useState, useEffect } from 'react';
import axios from "axios";
import { MapPin, Briefcase, DollarSign, X, Clock, Terminal, Clipboard, BookOpen } from 'lucide-react';
import Skeleton from "./job_skeleton";

const JobSearch = ({ loading, selectedJob, setSelectedJob, searchResults }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('userloginDetails')));
  const [jobDeatils, setJob] = useState(null); 
  
  
  useEffect(() => {
    setJob(selectedJob);
  }, [selectedJob]);

  if(loading) {
    return <Skeleton />;
  }

  if (!Array.isArray(searchResults) || searchResults.length === 0) {
    return (
      <div className="h-screen p-4 bg-blue-500/5 text-white text-center rounded-lg">
        <p>No jobs found. Try searching by skill, location, or keyword.</p>
      </div>
    );
  }


  const handleJobDetails = (job) => {
    setSelectedJob(job);
  };

  const closeJobDetails = () => {
    setSelectedJob(null);
  };

  const handleApply = async (jobId) => {
    if (!user || !user.user_id) {
      alert("User not logged in.");
      return;
    }

    try {
      const response = await axios.post("https://hirely-2.onrender.com/api/users/users/applyjob", {
        user_id: user.user_id,
        job_id: jobId,
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 200) {
        alert('Application successful!');
      }
    } catch (error) {
      console.error('Error applying for job:', error);
      alert('Error applying for job');
    }
  };

  return (
    <div className="bg-blue-500/5 min-h-screen text-white p-8">
      <div className="container mx-auto">
        <div className="mt-8 space-y-4">
          {jobDeatils ? (
            <div className="bg-blue-500/5 p-6 rounded-lg">
              <div className="bg-blue-500/5 text-white p-6 rounded-xl shadow-2xl border border-electric-purple/30">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-electric-purple">{jobDeatils.job_title}</h2>
                    <p className="text-gray-300 flex items-center mt-2">
                      <Briefcase className="mr-2 text-electric-purple" size={18} />
                      {jobDeatils.company_name}
                    </p>
                  </div>
                  <button onClick={closeJobDetails} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-500/10 p-4 rounded-lg flex items-center">
                    <MapPin className="mr-2 text-electric-purple" size={20} />
                    <div>
                      <p className="font-semibold">Location</p>
                      <p className="text-sm text-gray-300">{jobDeatils.location}</p>
                    </div>
                  </div>
                  <div className="bg-blue-500/10 p-4 rounded-lg flex items-center">
                    <DollarSign className="mr-2 text-electric-purple" size={20} />
                    <div>
                      <p className="font-semibold">Salary</p>
                      <p className="text-sm text-gray-300">{jobDeatils.salary_range}</p>
                    </div>
                  </div>
                  <div className="bg-blue-500/10 p-4 rounded-lg flex items-center">
                    <Clock className="mr-2 text-electric-purple" size={20} />
                    <div>
                      <p className="font-semibold">Deadline</p>
                      <p className="text-sm text-gray-300">
                        {new Date(jobDeatils.application_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="flex items-center text-xl font-semibold mb-4 text-electric-purple">
                      <Terminal className="mr-2" size={20} />
                      Job Requirements
                    </h3>
                    <div className="space-y-2 text-gray-300">
                      <p><span className="font-bold">Job Type:</span> {jobDeatils.job_type}</p>
                      <p><span className="font-bold">Experience:</span> {jobDeatils.experience_required}</p>
                      <p><span className="font-bold">Education:</span> {jobDeatils.education_required}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="flex items-center text-xl font-semibold mb-4 text-electric-purple">
                      <Clipboard className="mr-2" size={20} />
                      Skills Required
                    </h3>
                    <ul className="list-disc pl-5 text-gray-300 space-y-1">
                      {jobDeatils?.skills_required?.map((skill, index) => (
                        <li key={index}>{skill}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="flex items-center text-xl font-semibold mb-4 text-electric-purple">
                    <BookOpen className="mr-2" size={20} />
                    Job Description
                  </h3>
                  <p className="text-gray-300 leading-relaxed">{jobDeatils.job_description}</p>
                </div>

                <div className="flex space-x-4">
                  <button 
                    onClick={() => handleApply(jobDeatils.job_id)}
                    className="flex-1 bg-blue-500/10 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                  >
                    Apply Now
                  </button>
                  <button 
                    onClick={closeJobDetails}
                    className="flex-1 bg-blue-500/10 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : (
            searchResults?.map((job) => (
              <div 
                key={job.job_id} 
                onClick={() => handleJobDetails(job)} 
                className="bg-blue-500/10 p-4 rounded-lg hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-electric-purple">{job.job_title}</h3>
                    <p className="flex items-center text-sm text-gray-300">
                      <Briefcase className="mr-2 text-electric-purple" size={16} />
                      {job.company_name}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default JobSearch;
