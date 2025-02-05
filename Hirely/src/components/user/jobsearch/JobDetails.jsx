import React from 'react';
import { MapPin, Briefcase, DollarSign, X } from 'lucide-react';

const JobDetails = ({ job, onClose }) => {
  const handleApply = () => {
    // Implement application logic
    console.log(`Applying for job: ${job.job_title}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2a2a2a] rounded-lg p-6 w-11/12 max-w-md relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white hover:text-red-500"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-electric-purple mb-4">{job.job_title}</h2>
        
        <div className="space-y-2 mb-4">
          <p className="flex items-center">
            <Briefcase className="mr-2 text-electric-purple" size={18} />
            {job.company_name}
          </p>
          <p className="flex items-center">
            <MapPin className="mr-2 text-electric-purple" size={18} />
            {job.location}
          </p>
          <p className="flex items-center">
            <DollarSign className="mr-2 text-electric-purple" size={18} />
            {job.salary_range}
          </p>
        </div>

        <div className="mb-4">
          <h3 className="font-bold mb-2">Job Description</h3>
          <p className="text-sm text-gray-300">{job.description}</p>
        </div>

        <div className="flex space-x-4">
          <button 
            onClick={handleApply}
            className="flex-1 bg-electric-purple text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Apply Now
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;