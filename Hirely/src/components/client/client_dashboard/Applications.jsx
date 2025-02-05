import { Clock, Timer, ArrowLeft, ExternalLink, XCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const TABS = [
  { id: 'pending', label: 'Pending Review', status: 'pending' },
  { id: 'verified', label: 'Accepted', status: 'verified' },
  { id: 'rejected', label: 'Rejected', status: 'rejected' }
];

const API_BASE_URL = 'http://localhost:3000/api/clients';

const ApplicationDetails = ({ application, userDetails, onBack, onStatusUpdate }) => (
  <div className="p-8">
    <button 
      onClick={onBack}
      className="flex items-center gap-2 text-purple-500 hover:text-purple-400 mb-6"
    >
      <ArrowLeft size={20} />
      Back to Applications
    </button>

    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl border border-purple-500/20 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">{userDetails?.name}</h2>
          <div className="text-gray-400">{application?.jobDetails?.jobTitle || 'Job title not available'}</div>
        </div>
        <span className="px-4 py-2 rounded-full text-sm font-medium bg-purple-500/10 text-purple-400">
          {application?.status || 'Status not available'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Contact Information</h3>
            <div className="space-y-2 text-gray-300">
              <div>Email: {userDetails?.email || 'Email not available'}</div>
              <div>Phone: {userDetails?.phoneNumber || 'Phone not available'}</div>
              <div>Location: {userDetails?.location || 'Location not available'}</div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Education</h3>
            <div className="space-y-2">
              {userDetails?.education?.length ? (
                userDetails.education.map((edu, index) => (
                  <article key={index} className="mb-4">
                    <h4 className="font-medium text-gray-300">{edu.degree || 'Degree not specified'}</h4>
                    <div className="text-gray-300">{edu.institution || 'Institution not specified'}</div>
                    <div className="text-gray-300">{edu.location || 'Location not specified'}</div>
                    {edu.timeline && (
                      <div className="text-sm text-gray-300">
                        {new Date(edu.timeline.start_date).getFullYear()} - 
                        {edu.timeline.end_date ? new Date(edu.timeline.end_date).getFullYear() : 'Present'}
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <div className="text-gray-300">No education details available.</div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {userDetails?.skills?.length ? (
                userDetails.skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
                    {skill}
                  </span>
                ))
              ) : (
                <div className="text-gray-300">No skills listed.</div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {userDetails?.portfolioLink && (
            <section>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Portfolio</h3>
              <a 
                href={userDetails.portfolioLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-500 hover:text-purple-400"
              >
                <ExternalLink size={16} />
                View Portfolio
              </a>
            </section>
          )}
        </div>
      </div>

      {application?.status === 'pending' && (
        <div className="mt-8 flex gap-4">
          <button 
            onClick={() => onStatusUpdate(application?.jobDetails?.jobId, application?.userId, 'verified')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <CheckCircle size={20} />
            Accept
          </button>
          <button 
            onClick={() => onStatusUpdate(application?.jobDetails?.jobId, application?.userId, 'rejected')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <XCircle size={20} />
            Reject
          </button>
        </div>
      )}
    </div>
  </div>
);

const ApplicationCard = ({ application, onClick }) => (
  <div
    className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors cursor-pointer"
    onClick={onClick}
  >
    <div className="flex justify-between items-start mb-2">
      <div>
        <h4 className="font-medium text-gray-200">{application.userName}</h4>
        <div className="text-sm text-gray-400">{application.jobDetails.jobTitle}</div>
      </div>
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">
        {application.status}
      </span>
    </div>
    <div className="flex items-center gap-4 text-sm text-gray-400">
      <span className="flex items-center gap-1">
        <Clock size={14} />
        {new Date(application.dateApplied).toLocaleDateString()}
      </span>
      <span className="flex items-center gap-1">
        <Timer size={14} />
        {application.jobDetails.location}
      </span>
    </div>
  </div>
);

const TabBar = ({ tabs, selectedTab, applicationCount, onSelect }) => (
  <div className="flex space-x-1 mb-6">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onSelect(tab.id)}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
          selectedTab === tab.id 
            ? 'bg-purple-500 text-white' 
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        {tab.label}
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          selectedTab === tab.id 
            ? 'bg-purple-400/20 text-white' 
            : 'bg-gray-700 text-gray-400'
        }`}>
          {applicationCount}
        </span>
      </button>
    ))}
  </div>
);

const ApplicationList = ({ applications, onSelectApplication }) => (
  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl border border-purple-500/20 p-6">
    <div className="space-y-4">
      {applications.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No applications found for this status
        </div>
      ) : (
        applications.map((application) => (
          <ApplicationCard
            key={application.applicationId}
            application={application}
            onClick={() => onSelectApplication(application)}
          />
        ))
      )}
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="p-8">
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
  </div>
);

const ErrorMessage = ({ error }) => (
  <div className="p-8 text-red-400">Error: {error}</div>
);

const Applications = ({ selectedApplication, setSelectedApplication }) => {
  const [state, setState] = useState({
    selectedTab: 'pending',
    applications: [],
    loading: true,
    error: null,
    userDetails: null
  });

  const employeeId = JSON.parse(localStorage.getItem("userDetails"))?.employeeId;

  const fetchApplications = useCallback(async () => {
    if (!employeeId) return;
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      const { data } = await axios.get(
        `${API_BASE_URL}/applications/${employeeId}?status=${TABS.find(tab => tab.id === state.selectedTab).status}`
      );
      setState(prev => ({ 
        ...prev, 
        applications: data,
        loading: false,
        error: null 
      }));
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err.message,
        loading: false 
      }));
    }
  }, [employeeId, state.selectedTab]);

  const fetchUserDetails = useCallback(async (application) => {
    if (!application) {
      setState(prev => ({ ...prev, userDetails: null }));
      return;
    }

    try {
      const userId = Number(application.userId || application.id);
      if (isNaN(userId)) throw new Error('Invalid user ID');
      
      const { data } = await axios.get(`${API_BASE_URL}/user/${userId}`);
      setState(prev => ({ 
        ...prev, 
        userDetails: data,
        error: null 
      }));
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  }, []);

  const handleStatusUpdate = async (jobId, userId, newStatus) => {
    try {
      const { data } = await axios.patch(
        `${API_BASE_URL}/jobs/${jobId}/applications/status`,
        {
          userId,
          status: newStatus,
          comments: `Status updated to ${newStatus}`
        }
      );

      if (data.success) {
        setState(prev => ({
          ...prev,
          applications: prev.applications.filter(
            app => !(app.userId === userId && app.jobDetails.jobId === jobId)
          )
        }));
        setSelectedApplication(null);
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    fetchUserDetails(selectedApplication);
  }, [selectedApplication, fetchUserDetails]);

  if (state.loading) return <LoadingSkeleton />;
  if (state.error) return <ErrorMessage error={state.error} />;
  if (selectedApplication && state.userDetails) {
    return (
      <ApplicationDetails
        application={selectedApplication}
        userDetails={state.userDetails}
        onBack={() => setSelectedApplication(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-100">Applications</h2>
      
      <TabBar 
        tabs={TABS}
        selectedTab={state.selectedTab}
        applicationCount={state.applications.length}
        onSelect={tab => setState(prev => ({ ...prev, selectedTab: tab }))}
      />

      <ApplicationList 
        applications={state.applications}
        onSelectApplication={setSelectedApplication}
      />
    </div>
  );
};

ApplicationDetails.propTypes = {
  application: PropTypes.object.isRequired,
  userDetails: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
  onStatusUpdate: PropTypes.func.isRequired
};

ApplicationCard.propTypes = {
  application: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired
};

TabBar.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired
  })).isRequired,
  selectedTab: PropTypes.string.isRequired,
  applicationCount: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired
};

ApplicationList.propTypes = {
  applications: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSelectApplication: PropTypes.func.isRequired
};

ErrorMessage.propTypes = {
  error: PropTypes.string.isRequired
};

Applications.propTypes = {
  selectedApplication: PropTypes.object,
  setSelectedApplication: PropTypes.func.isRequired
};

export default Applications;