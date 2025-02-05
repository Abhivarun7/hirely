import React from 'react';
import PropTypes from 'prop-types';
import { LogOut, Home, UserCircle, Search , Building2 , ChevronLeft, ChevronRight } from 'lucide-react';

export const Sidebar = ({ user, isOpen, toggleSidebar, activeTab, setActiveTab }) => {
  const menuItems = [
    { icon: <Home size={20} />, label: "Dashboard", key: "dashboard" },
    { icon: <UserCircle size={20} />, label: "Profile", key: "users" },
    { icon: <Search   size={20} />, label: "Search Job", key: "jobsearch" },
    { icon: <Building2  size={20} />, label: "Search Company", key: "companysearch" },
  ];

  function getInitials(user) {
    if (!user || !user.name) return '';
    
    const words = user.name.trim().split(' ');
  
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase(); // First letter of the single word
    } 
    
    if (words.length >= 2) {
      return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase(); // First letters of the first two words
    }
  }

  const userInitials = getInitials(user);

  const handleLogout = () => {
    localStorage.removeItem('userloginDetails');
    window.location.href = '/';
  };

  return (
    <aside 
      className={`fixed top-0 left-0 h-full bg-slate-900 text-white transition-all duration-300 ease-out
        ${isOpen ? 'w-72' : 'w-0'} 
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        z-50 overflow-hidden`}
    >
      <div className="h-full flex flex-col border-r border-slate-800">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h1 className={`font-bold text-xl whitespace-nowrap bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}>
            Hirley
          </h1>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200
                ${activeTab === item.key
                  ? "bg-blue-500/10 text-blue-500"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
            >
              {item.icon}
              <span className={`ml-4 transition-opacity duration-300 ${
                isOpen ? 'opacity-100' : 'opacity-0'
              }`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div>
          <div 
            onClick={() => setActiveTab("users")} 
            className="p-4 border-t border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors group"
          >
            <div className={`flex items-center transition-opacity duration-300 ${
              isOpen ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="relative w-12 h-12">
                {user.pic ? (
                  <img
                    src={typeof user.pic === 'string' && user.pic.startsWith('data:image') 
                      ? user.pic 
                      : `data:image/jpeg;base64,${user.pic}`
                    }
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {userInitials}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></span>
              </div>
              <div className="ml-3 flex-grow overflow-hidden">
                <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                  {user.name}
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="w-full px-4 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500 hover:to-red-600 text-red-500 hover:text-white font-medium transition-all duration-300 border-t border-slate-800"
          >
            <LogOut size={16} />
            {isOpen && "Log Out"}
          </button>
        </div>
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    pic: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(String)]), // No Buffer here
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
};

export default Sidebar;
