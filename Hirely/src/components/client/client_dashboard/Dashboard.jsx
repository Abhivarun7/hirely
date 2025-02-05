import {
  LayoutDashboard,
  Users,
  BriefcaseBusinessIcon,
  ChevronRight,
  Clock,
  Timer,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const StatsCard = ({ title, value, icon: Icon, loading }) => (
  <div className="cursor-pointer bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-xl border border-purple-500/20">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-gray-400">{title}</h3>
      <Icon className="text-purple-500" size={24} />
    </div>
    <p className="text-4xl font-bold text-gray-100">
      {loading ? <div className="h-8 bg-blue-400/10 rounded w-16" /> : value}
    </p>
  </div>
);


const LoadingSkeleton = () => (
  <div className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-3 w-2/3">
        <div className="h-4 bg-blue-400/20 rounded w-1/2" />
        <div className="h-3 bg-blue-400/10 rounded w-3/4" />
      </div>
      <div className="h-6 w-20 bg-blue-400/20 rounded-full" />
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-blue-400/10 rounded w-24" />
      <div className="h-3 bg-blue-400/10 rounded w-20" />
    </div>
  </div>
);

const Dashboard = ({ setActiveTab, setSelectedJob, setSelectedApplication }) => {
  const [stats, setStats] = useState({
    postedJobs: 0,
    activeListings: 0,
    totalApplicants: 0,
    recentApplications: [],
    recentJobs: []
  });
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const employeeId = JSON.parse(localStorage.getItem("userDetails"))?.employeeId;

  const handleselectedjob=()=>{
    console.log("Selected Job");
    setSelectedJob(job);
  }
  

  const fetchStats = useCallback(async () => {
    if (!employeeId) {
      setError("User details not found");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`https://hirely-2.onrender.com/api/clients/stats/${employeeId}`);
      if (response?.data) {
        const recentJobs = response.data.recentJobs || [];
        setStats({
          postedJobs: response.data.postedJobs || 0,
          activeListings: response.data.activeListings || 0,
          totalApplicants: response.data.pendingCount || 0,
          recentApplications: response.data.recentApplications || [],
          recentJobs
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const fetchRecentJobs = useCallback(async () => {
    try {
      const response = await axios.get(`https://hirely-2.onrender.com/api/jobs/recent-jobs/${employeeId}`);
      setJobs(response.data.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching recent jobs:', err);
    }
  }, [employeeId]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchRecentJobs()]);
  }, [fetchStats, fetchRecentJobs]);

  const ApplicationCard = ({ application }) => (
    <div onClick={() => {
    
      const applicationData = {
        id: Number(application.applicationid),
        type: "application"
      };
      console.log('Application ID:', application);
  
      // Pass the number directly
      setSelectedApplication(applicationData);
  
      // Set the active tab
      setActiveTab("applications");
    }}
    className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors">
      <div className="cursor-pointer flex justify-between items-start mb-2">
      <div >
          <h4 className="font-medium text-gray-200">{application.applicantName}</h4>
          <p className="text-sm text-gray-400">{application.jobTitle}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">
          {application.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <Clock size={14} />
          {new Date(application.appliedDate).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1">
          <Timer size={14} />
          {application.experience || "N/A"}
        </span>
      </div>
    </div>
  );

  const JobCard = ({ job }) => (
    <div onClick={() => handleselectedjob(job)} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors">
      <div className="cursor-pointer flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-gray-200">{job.job_title}</h4>
          <p className="text-sm text-gray-400">{job.location}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
          {job.job_status}
        </span>
      </div>
      <div className="cursor-pointer flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <Users size={14} />
          {job.applicants_count} Applications
        </span>
        <span className="flex items-center gap-1">
          <Clock size={14} />
          Deadline: {job.application_deadline}
        </span>
      </div>
    </div>
  );

  if (!employeeId) {
    return <div className="p-8 text-red-500">User not authenticated</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-8 text-gray-100">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Posted Jobs" value={stats.postedJobs} icon={LayoutDashboard} loading={loading} />
        <StatsCard title="Total Applicants" value={stats.totalApplicants} icon={Users} loading={loading} />
        <StatsCard title="Active Listings" value={stats.activeListings} icon={BriefcaseBusinessIcon} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {['Applications', 'Jobs'].map((section) => (
          <div key={section} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-100">Recent {section}</h3>
              <button
                onClick={() => setActiveTab(section.toLowerCase())}
                className="text-purple-500 hover:text-purple-400 flex items-center gap-1"
              >
                View All <ChevronRight size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {loading ? (
                Array(3).fill(null).map((_, i) => <LoadingSkeleton key={i} />)
              ) : section === 'Applications' ? (
                stats.recentApplications.length > 0 ? (
                  stats.recentApplications.map((app, i) => (
                    <ApplicationCard key={i} application={app} />
                  ))
                ) : (
                  <p className="text-gray-400">No recent applications available.</p>
                )
              ) : jobs.length > 0 ? (
                jobs.map((job, i) => <JobCard key={i} job={job} />)
              ) : (
                <p className="text-gray-400">No active job listings available.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

Dashboard.propTypes = {
  setActiveTab: PropTypes.func.isRequired,
  setSelectedJob: PropTypes.func.isRequired,
  setSelectedApplication: PropTypes.func.isRequired
};

export default Dashboard;