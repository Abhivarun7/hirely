import React, { useState, useEffect } from 'react';
import { Users, Briefcase, CheckCircle, Clock, XCircle, Target, Star, BadgeCheck, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const DashboardContent = ({ user }) => {
  const [applicationsData, setApplicationsData] = useState(null); // To store the full data
  const [applicationsCount, setApplicationsCount] = useState(null); // For just the count
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skills, setSkills] = useState([]);

  function calculateProfileProgress(user) {
    const sections = [
      { key: 'name', weight: 10 },
      { key: 'mail', weight: 10 },
      { key: 'phone_number', weight: 10 },
      { key: 'location', weight: 5 },
      { key: 'education', weight: 15 },
      { key: 'experience', weight: 15 },
      { key: 'skills', weight: 10 },
      { key: 'projects', weight: 10 },
      { key: 'certifications', weight: 5 },
      { key: 'resume', weight: 10 }
    ];

    let progress = 0;
    const prompts = [];
    sections.forEach(({ key, weight }) => {
      if (user[key] && (Array.isArray(user[key]) ? user[key].length > 0 : true)) {
        progress += weight;
      } else {
        prompts.push(`Add ${key.replace(/_/g, ' ')} to complete your profile.`);
      }
    });

    // Check if all sections are complete
    if (prompts.length === 0) {
      prompts.push('Your profile is complete!');
    }

    return { progress, prompts };
  }

  const { progress, prompts } = calculateProfileProgress(user);

  console.log(`Profile Progress: ${progress}%`);
  console.log("Suggestions:", prompts);

  const [profileProgress, setProfileProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setProfileProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  useEffect(() => {
    const fetchApplicationsData = async () => {
      if (user?.user_id) {
        try {
          const response = await axios.get(`https://hirely-2.onrender.com/api/users/users/${user.user_id}/countApplicationsSent`);
          setApplicationsData(response.data); // Store full data
          setApplicationsCount(response.data.totalApplications); // Store count separately
        } catch (err) {
          setError('Failed to fetch application data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchApplicationsData();
  }, [user.user_id]);

  useEffect(() => {
    if (user?.skills) {
      // Fix the structure to be an array of objects with name and random level
      const formattedSkills = user.skills.map(skill => {
        return {
          name: skill, // Set the skill name
          level: Math.floor(Math.random() * 101), // Random level between 0 and 100
        };
      });
      setSkills(formattedSkills);
      console.log("Formatted Skills:", formattedSkills);
    }
  }, [user]);

  console.log("Full Applications Data", applicationsData);
  console.log("Applications Count", applicationsCount);

  const mockActivityData = [
    { name: 'Mon', applications: 3 },
    { name: 'Tue', applications: 5 },
    { name: 'Wed', applications: 2 },
    { name: 'Thu', applications: 6 },
    { name: 'Fri', applications: 4 },
    { name: 'Sat', applications: 1 },
    { name: 'Sun', applications: 3 }
  ];


  return (
    <div className="flex-1 bg-slate-950 overflow-y-auto">
      <div className="max-w-full mx-auto space-y-6 p-6">
        <h1 className="text-2xl font-bold">Job Search Progress</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    className="text-slate-700"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="58"
                    cx="64"
                    cy="64"
                  />
                  <circle
                    className="text-transparent"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 58}`}
                    strokeDashoffset={`${2 * Math.PI * 58 * (1 - profileProgress / 100)}`}
                    strokeLinecap="round"
                    stroke="url(#gradient)"
                    fill="transparent"
                    r="58"
                    cx="64"
                    cy="64"
                    style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="text-2xl font-bold">{profileProgress}%</span>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Profile Strength</h2>
                {prompts.map((prompt, index) => (
                  <p key={index} className="text-sm text-slate-400">⧖ {prompt}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 flex items-center space-x-2">
                <Briefcase size={18} />
                <span>Update Resume</span>
              </button>
              <button className="w-full p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 flex items-center space-x-2">
                <Target size={18} />
                <span>Set Job Preferences</span>
              </button>
              <button className="w-full p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 flex items-center space-x-2">
                <Star size={18} />
                <span>Save Job Search</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Applications"
            value={applicationsCount} // This will show the total number of applications
            icon={<Users className="text-purple-500" size={20} />}
          />

          <StatsCard
            title="Accepted"
            value={applicationsData?.acceptedCount || 0} // Show the accepted count (0 if data is not available)
            icon={<CheckCircle className="text-green-500" size={20} />}
          />

          <StatsCard
            title="Rejected"
            value={applicationsData?.rejectedCount || 0} // Show the rejected count (0 if data is not available)
            icon={<XCircle className="text-red-500" size={20} />}
          />

          <StatsCard
            title="Pending"
            value={applicationsData?.pendingCount || 0} // Show the pending count (0 if data is not available)
            icon={<Clock className="text-yellow-500" size={20} />}
          />

          <StatsCard
            title="Skills Added"
            value={user?.skills?.length || 0} // Count the number of skills or show 0 if no skills
            icon={<BadgeCheck className="text-blue-500" size={20} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Activity</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockActivityData}>
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Line type="monotone" dataKey="applications" stroke="url(#gradient)" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Skills Progress</h3>
            <div className="space-y-4">
              {skills.length > 0 ? (
                skills.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between mb-1">
                      <span>{skill.name}</span>
                      <span>{skill.level}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{
                          width: `${skill.level}%`,
                          transition: 'width 1.5s ease-in-out',
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p>No skills available.</p> // Optional fallback text
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon, showBar = false }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
    <div className="flex items-center justify-between">
      <h2 className="text-slate-400">{title}</h2>
      {icon}
    </div>
    <p className="text-3xl font-bold mt-2">{value}</p>
    {showBar && (
      <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          style={{ width: '70%', transition: 'width 1.5s ease-in-out' }}
        />
      </div>
    )}
  </div>
);

export default DashboardContent;
