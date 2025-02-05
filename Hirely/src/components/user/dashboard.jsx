// DashboardLayout.jsx
import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import  Header  from './Header.jsx';

export const DashboardLayout = ({ setLoading, user, setSearchCompanyResults, onSearchResults, activeTab, setActiveTab, children, isOpen, setIsOpen }) => {
  const layoutClass = clsx(
    'h-full w-full bg-slate-950 text-white p-4 md:p-8 transition-all duration-300 ease-out',
    {
      'lg:ml-72': isOpen, // Sidebar open (72 = 18rem)
      'lg:ml-0': !isOpen, // Sidebar closed, no margin
    }
  );

  return (
    <main className={layoutClass}>
      <div className="w-full h-full mx-auto">
       <Header setLoading={setLoading} user={user} setSearchCompanyResults={setSearchCompanyResults} onSearchResults={onSearchResults} activeTab={activeTab} setActiveTab={setActiveTab} setIsOpen={setIsOpen} />

        {children}
      </div>
    </main>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  activeTab: PropTypes.string.isRequired, // Add this prop type for activeTab
};

export default DashboardLayout;
