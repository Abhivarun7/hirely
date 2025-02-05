import {
  LayoutDashboard,
  Users,
  BriefcaseBusinessIcon,
  FileText,
  LogOut
} from "lucide-react";
import { HiUser } from "react-icons/hi";
import PropTypes from "prop-types";

const Sidebar = ({ activeTab, setSelectedJob, setActiveTab, user }) => {
  Sidebar.propTypes = {
    activeTab: PropTypes.string.isRequired,
    setActiveTab: PropTypes.func.isRequired
  };

  const userDetails = JSON.parse(localStorage.getItem('userDetails'));
  
  const handleLogout = () => {
    localStorage.removeItem('userDetails');
    window.location.href = '/login';
  };

  const handleProfilePicUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.error('No file selected.');
      return;
    }
  
    const formData = new FormData();
    formData.append('profilePic', file);
    formData.append('employeeId', userDetails?.employeeId);
  
    try {
      const response = await fetch('https://hirely-2.onrender.com/api/clients/uploadProfilePic', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        const result = await response.json();
        console.log('Upload success:', result);
      } else {
        const errorData = await response.json();
        console.error('Upload error:', errorData.message);
      }
    } catch (error) {
      console.error('Upload error:', error.message);
    }
  };
  
  return (
    <div className="flex flex-col h-screen w-64 bg-gray-900 border-r border-purple-500/20">
      <div className="p-6 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-purple-500" size={28} />
          <h1 className="text-xl font-bold text-gray-100">Hirely</h1>
        </div>
      </div>

      <div className="p-6 border-b border-purple-500/20 flex items-center gap-4">
        {userDetails?.profilePic?.data?.length > 0 ? (
          <img
            src={`data:image/png;base64,${btoa(
              String.fromCharCode(...new Uint8Array(userDetails.profilePic.data))
            )}`}
            alt="Profile"
            className="w-10 h-10 rounded-full border border-purple-500"
          />
        ) : (
          <>
            <HiUser
              onClick={() => document.getElementById('uploadPicInput').click()}
              className="w-10 h-10 text-gray-400 cursor-pointer"
            />
            <input
              id="uploadPicInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleProfilePicUpload(e)}
            />
          </>
        )}
        <div>
          <h2 className="text-sm font-medium text-gray-100">
            {userDetails?.name || "Welcome"}
          </h2>
          <p className="text-xs text-gray-400">Active</p>
        </div>
      </div>

      <nav className="flex-grow p-4">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === "dashboard"
                  ? "bg-purple-500/10 text-purple-500 shadow-lg shadow-purple-500/10"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === "users"
                  ? "bg-purple-500/10 text-purple-500 shadow-lg shadow-purple-500/10"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <Users size={20} />
              Users
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("postJob")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === "postJob"
                  ? "bg-purple-500/10 text-purple-500 shadow-lg shadow-purple-500/10"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <BriefcaseBusinessIcon size={20} />
              Post Job
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("applications")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === "applications"
                  ? "bg-purple-500/10 text-purple-500 shadow-lg shadow-purple-500/10"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <FileText size={20} />
              Applications
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveTab("postedJobs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === "postedJobs"
                  ? "bg-purple-500/10 text-purple-500 shadow-lg shadow-purple-500/10"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <FileText size={20} />
              Jobs Posted
            </button>
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t border-purple-500/20">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-gray-800 hover:text-red-300 transition-all"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;