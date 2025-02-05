import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Building2 } from 'lucide-react';
import Skeleton from './company_skeleton';

const CompanyJobs = ({ loading, setSelectedJob, setActiveTab, searchCompanyResults }) => {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (searchCompanyResults?.company_name) {
      fetchJobs(searchCompanyResults.company_name);
    }
  }, [searchCompanyResults]);

  const fetchJobs = async (companyName) => {
    try {
      const response = await axios.get('http://localhost:3000/api/users/users/jobsearch', {
        params: { company_name: companyName }
      });
      setJobs(response.data.results);
    } catch (error) {
      console.error('Error fetching job details:', error);
      setJobs([]);
    }
  };

  if(loading){
    <Skeleton />;
  }

  if (!searchCompanyResults || Object.keys(searchCompanyResults).length === 0) {
    return (
      <div className="h-screen p-4 bg-slate-900/50 text-white rounded">
        <p className="text-center">Search for a company name.</p>
      </div>
    );
  }

  const handleSelection = (job) => {
    console.log('Selected job:', job);
    setSelectedJob(job);
    setActiveTab("jobsearch");
  };

  const { company_name, job_count } = searchCompanyResults;

  return (
    <div className="h-screen p-4 bg-slate-900/50 text-white rounded w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Building2 className="text-white w-6 h-6" />
          <h2 className="text-white text-lg font-medium">{company_name}</h2>
        </div>
        <div className="bg-slate-800 px-4 py-1 rounded-full text-white">
          {job_count} Jobs
        </div>
      </div>
      <div>
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <div 
              key={job.job_id} 
              onClick={() => handleSelection(job)}
              className="bg-slate-800 p-3 rounded mb-2 cursor-pointer hover:bg-slate-700 transition"
            >
              <h3 className="text-white text-md font-semibold">{job.job_title}</h3>
              <p className="text-gray-300 text-sm">{job.location} - {job.salary_range}</p>
            </div>
          ))
        ) : (
          <p className="h-screen text-gray-400">No jobs available.</p>
        )}
      </div>
    </div>
  );
};

export default CompanyJobs;
