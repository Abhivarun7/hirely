// App.jsx
import React, { useState,useEffect } from "react";
import Sidebar from "./sidebar";
import DashboardLayout from "./dashboard";
import DashboardContent  from './dashboardContent';
import UserProfile from './profile/user_profile';
import JobSearch from './jobsearch/job_search';
import CompanySearch from './company/companyjobs';

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchCompanyResults, setSearchCompanyResults] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading,setLoading] = useState(false);
  const [user, setUser] = React.useState(() => 
    JSON.parse(localStorage.getItem('userloginDetails'))
  );
  const handleDataUpdate = (data) => {
    console.log("Data from user profile");
    console.log(data);

    setUser(data);
  }
  const handleSearchResults = (results) => {
    setSearchResults(results);
    console.log("Search Results");
    console.log(results);
  };
  useEffect(() => {
    console.log("Updated searchResults:", searchResults);
  }, [searchResults]); // This will log whenever 'searchResults' is updated
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setIsOpen(false);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    console.log("selectedJob", selectedJob);
  }, [selectedJob]);

  const renderContent = () => {
    if (activeTab === "dashboard") return <DashboardContent user={user} />;
    if (activeTab === "users") return <UserProfile handleDataUpdate={handleDataUpdate} setActiveTab={setActiveTab} />;
    if (activeTab === "jobsearch") return <JobSearch loading={loading} selectedJob={selectedJob} setSelectedJob={setSelectedJob} searchResults={searchResults} />; 
    if (activeTab === "companysearch") return <CompanySearch loading={loading} searchCompanyResults={searchCompanyResults} setSelectedJob={setSelectedJob} setActiveTab={setActiveTab}/>; 
         
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-400">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Content
        </h1>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-slate-950">
      {isMobile && (
        <div
          className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsOpen(false)}
        />
      )}
      <Sidebar 
        user={user}
        isOpen={isOpen} 
        toggleSidebar={() => setIsOpen(!isOpen)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      <DashboardLayout setLoading={setLoading} user={user} onSearchResults={handleSearchResults} activeTab={activeTab} setSearchCompanyResults={setSearchCompanyResults} setActiveTab={setActiveTab} isOpen={isOpen} setIsOpen={setIsOpen}>
        {renderContent()}
      </DashboardLayout>
    </div>
  );
};

export default App;