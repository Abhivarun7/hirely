import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import Header from './Header.jsx';

export const DashboardLayout = ({ setLoading, user, setSearchCompanyResults, onSearchResults, activeTab, setActiveTab, children, isOpen, setIsOpen }) => {
  const layoutClass = clsx(
    'w-full bg-slate-950 text-white p-4 md:p-8 transition-all duration-300 ease-out flex flex-col min-h-screen', 
    {
      'lg:ml-72': isOpen,
      'lg:ml-0': !isOpen,
    }
  );

  return (
    <main className={layoutClass}>
      <Header 
        setLoading={setLoading}
        user={user}
        setSearchCompanyResults={setSearchCompanyResults}
        onSearchResults={onSearchResults}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setIsOpen={setIsOpen}
      />
      <div className="flex-grow">
        {children}
      </div>
    </main>
  );
};

DashboardLayout.propTypes = {
  setLoading: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  setSearchCompanyResults: PropTypes.func.isRequired,
  onSearchResults: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired
};

export default DashboardLayout;