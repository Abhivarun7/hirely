import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader, X, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE_URL = 'https://hirely-2.onrender.com/api/clients';

const skillsList = [
  'python', 'java', 'javascript', 'react', 'node', 'angular', 'vue', 'html', 'css',
  'docker', 'kubernetes', 'machine learning', 'deep learning', 'data science', 'sql',
  'mongodb', 'postgresql', 'git', 'github', 'linux', 'tensorflow', 'pytorch', 'django',
  'flask', 'bootstrap', 'tailwind', 'sass', 'typescript', 'graphql', 'aws', 'azure',
  'gcp', 'firebase', 'redux', 'numpy', 'pandas', 'matplotlib', 'seaborn', 'scikit-learn',
  'nlp', 'opencv', 'ci/cd', 'jenkins', 'jira', 'bitbucket', 'agile', 'scrum',
  'android', 'ios', 'swift', 'kotlin', 'c', 'c++', 'c#', 'php', 'laravel',
  'ruby', 'rails', 'bash', 'shell', 'api', 'rest', 'soap', 'microservices',
  'hadoop', 'spark', 'big data', 'blockchain', 'solidity', 'ethereum', 'unity',
  'unreal', 'game development', 'ar', 'vr', '3d modeling', 'blender', 'adobe xd',
  'figma', 'photoshop', 'illustrator', 'after effects', 'premiere', 'video editing'
];

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Results per page
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [sortBy, setSortBy] = useState('name'); // Default sorting

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch users when debounced search term or filters change
  useEffect(() => {
    handleSearch();
  }, [debouncedSearchTerm, selectedSkills, sortBy, currentPage]);

  const handleSearch = useCallback(async () => {
    if (!debouncedSearchTerm.trim() && selectedSkills.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        skills: selectedSkills.join(','),
      };

      const term = debouncedSearchTerm.trim().toLowerCase();
      if (term.includes('@') || term.includes('.com')) {
        params.email = term;
      } else if (skillsList.includes(term)) {
        params.skills = term;
      } else if (term.split(' ').length > 1 || term.length > 15) {
        params.location = term;
      } else {
        params.name = term;
      }

      const { data } = await axios.get(`${API_BASE_URL}/userSearch`, { params });
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error searching users');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, selectedSkills, sortBy, currentPage]);

  const handleUserClick = async (id) => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/user/${id}`);
      setSelectedUser(data);
    } catch (err) {
      console.error('Error fetching user details:', err);
    }
  };

  const closeModal = () => setSelectedUser(null);

  const handleSkillToggle = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handlePageChange = (direction) => {
    setCurrentPage((prev) => (direction === 'next' ? prev + 1 : prev - 1));
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-8 text-gray-100">User Search</h2>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-xl border border-purple-500/20">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full p-4 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              placeholder="Search by name, location, skills..."
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-purple-500 disabled:opacity-50"
            >
              {loading ? <Loader className="animate-spin" /> : <Search />}
            </button>
          </div>

          {/* Skill Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {skillsList.map((skill) => (
              <button
                key={skill}
                onClick={() => handleSkillToggle(skill)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  selectedSkills.includes(skill)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>

          {/* Sorting Dropdown */}
          <div className="mt-4">
            <label className="text-gray-400 text-sm">Sort by:</label>
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="ml-2 p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100"
            >
              <option value="name">Name</option>
              <option value="location">Location</option>
              <option value="skills">Skills</option>
            </select>
          </div>

          {error && (
            <div className="mt-4 text-red-400 text-center">
              {error} <button onClick={handleSearch} className="text-purple-400 hover:text-purple-300">Retry</button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="mt-8 space-y-4">
              {[...Array(itemsPerPage)].map((_, idx) => (
                <div key={idx} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          )}

          {/* Search Results */}
          {!loading && results.length > 0 && (
            <div className="mt-8 space-y-4">
              {results.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleUserClick(user.user_id)}
                  className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 cursor-pointer hover:bg-gray-700 transition"
                >
                  <div className="font-medium text-gray-200">{user.name}</div>
                  <div className="text-sm text-gray-400">{user.location} • {user.email}</div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {results.length > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={currentPage === 1}
                className="flex items-center text-gray-400 hover:text-purple-500 disabled:opacity-50"
              >
                <ChevronLeft size={20} /> Previous
              </button>
              <span className="text-gray-400">Page {currentPage}</span>
              <button
                onClick={() => handlePageChange('next')}
                disabled={results.length < itemsPerPage}
                className="flex items-center text-gray-400 hover:text-purple-500 disabled:opacity-50"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-lg shadow-lg max-w-2xl w-full relative border border-purple-500/50">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
              onClick={closeModal}
            >
              <X size={24} />
            </button>

            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-2xl font-bold">
                {selectedUser.name.charAt(0)}
              </div>

              <div className="flex-1">
                <h3 className="text-3xl font-bold text-purple-400 mb-2">{selectedUser.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{selectedUser.location}</p>

                <div className="grid grid-cols-2 gap-4 text-gray-300">
                  <div>
                    <p><strong>Email:</strong> {selectedUser.email}</p>
                    <p><strong>Phone:</strong> {selectedUser.phone}</p>
                  </div>
                  <div>
                    <p><strong>LinkedIn:</strong> <a href={selectedUser.linkedIn} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">View Profile</a></p>
                    <p><strong>GitHub:</strong> <a href={selectedUser.github} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">View Repositories</a></p>
                  </div>
                </div>

                {/* Contact Button */}
                <button
                  onClick={() => window.location.href = `mailto:${selectedUser.email}`}
                  className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Contact
                </button>
              </div>
            </div>

            {selectedUser.education?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xl font-bold text-purple-400 mb-4">Education</h4>
                <div className="space-y-4">
                  {selectedUser.education.map((edu, idx) => (
                    <div key={idx} className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="font-medium text-gray-200">{edu.degree}</p>
                      <p className="text-sm text-gray-400">{edu.institution}</p>
                      <p className="text-xs text-gray-500">{edu.location} • {edu.startYear} - {edu.endYear}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser.projects?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xl font-bold text-purple-400 mb-4">Projects</h4>
                <div className="space-y-4">
                  {selectedUser.projects.map((proj, idx) => (
                    <div key={idx} className="bg-gray-800/50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-200">{proj.title}</h5>
                      <p className="text-sm text-gray-400">{proj.description}</p>
                      {proj.technologies && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {proj.technologies.map((tech, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                      {proj.link && (
                        <a
                          href={proj.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-purple-400 hover:text-purple-300 text-sm"
                        >
                          View Project
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser.certifications?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xl font-bold text-purple-400 mb-4">Certifications</h4>
                <div className="space-y-2">
                  {selectedUser.certifications.map((cert, idx) => (
                    <div key={idx} className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-200">{cert}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser.skills?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xl font-bold text-purple-400 mb-4">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;