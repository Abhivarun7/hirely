import { Search, Briefcase } from 'lucide-react';
import { useState} from 'react';
import { useNavigate } from "react-router-dom";


const LandingPage = () => {
  const [searchParams, setSearchParams] = useState({
    query: '',
    location: '',
  });
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Update the handleSearch function in your frontends
const handleSearch = async () => {
  try {
    setLoading(true);
    
    const queryString = new URLSearchParams({
      ...searchParams
    }).toString();

    const response = await fetch(`http://localhost:3000/api/jobs/search?${queryString}`);
    const data = await response.json();

    console.log('API response:', data);

    if (data.success && data.data && Array.isArray(data.data.jobs)) {
      setJobs(data.data.jobs);  // Changed from data.data.job to data.data.jobs
    } else {
      console.error('Error: Invalid response structure', data);
      setJobs([]);
    }
  } catch (error) {
    console.error('Error searching jobs:', error);
  } finally {
    setLoading(false);
  }
};
  
const handleuserlogin = () => {
  navigate("/user_login");
}
  
  

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Navbar remains the same */}
      <nav className="bg-zinc-900 shadow-purple-900/20 shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-400">Hirely</h1>
          <button   onClick={handleuserlogin} className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            Login
          </button>
        </div>
      </nav>

      {/* Search Section */}
      <div className="bg-zinc-900 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-black p-8 rounded-lg shadow-lg border border-purple-900/30">
            <h2 className="text-3xl font-semibold text-center mb-4 text-white">Find Your Dream Job</h2>
            <p className="text-gray-400 text-center mb-8">Discover opportunities that match your skills and aspirations</p>
            
            {/* Main Search Fields */}
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchParams.query}
                    onChange={(e) => setSearchParams({ ...searchParams, query: e.target.value })}
                    placeholder="Job title, keywords, or company"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-purple-900 text-white rounded-lg 
                              focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500
                              hover:border-purple-500 transition-colors"
                  />
                </div>
                
                <div className="relative flex-1">
                  <Briefcase className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchParams.location}
                    onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                    placeholder="Location (City or Remote)"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-purple-900 text-white rounded-lg 
                              focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500
                              hover:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              
              {/* Search Button */}
              <div className="flex justify-center">
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-purple-600 text-white px-12 py-3 rounded-lg hover:bg-purple-700 transition-all
                            hover:scale-105 shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Searching...' : 'Find Jobs'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results Section */}
        {jobs.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h2 className="text-3xl font-bold mb-8 text-gray-100">Search Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800 p-6 rounded-lg shadow-md border border-purple-800/40 transform hover:scale-105 transition-transform duration-300 ease-in-out"
                >
                  <h3 className="text-2xl font-semibold text-gray-100">{job.job_title}</h3>
                  <p className="text-purple-400 mt-2">{job.company_name}</p>
                  <div className="flex flex-wrap gap-2 mt-3 text-gray-300">
                    <span className="bg-zinc-700 px-3 py-1 rounded-full">{job.location}</span>
                    <span className="bg-zinc-700 px-3 py-1 rounded-full">{job.job_type}</span>
                    <span className="bg-zinc-700 px-3 py-1 rounded-full">{job.salary_range}</span>
                  </div>
                  {job.description && (
                    <p className="text-gray-400 mt-4 text-sm line-clamp-3">{job.description}</p>
                  )}
                  <button className="mt-4 px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}


      {jobs.length === 0 && !loading && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-gray-400">No jobs found for your search criteria.</p>
        </div>
      )}


      {/* Recent News Section */}
      <section className="py-12 bg-black">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-6 text-gray-200">Recent Hiring News</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-zinc-900 p-6 rounded-lg shadow-lg border border-purple-900/30 hover:border-purple-500/50 transition-colors">
                <h3 className="font-semibold mb-2 text-gray-200">Latest Tech Company Hiring Spree</h3>
                <p className="text-gray-400">
                  Major tech companies announce new job openings across various positions...
                </p>
                <a href="#" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
                  Read more
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-900 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-200">Popular Categories</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['Technology', 'Design', 'Marketing', 'Sales'].map((category, index) => (
              <div key={index} className="bg-black rounded-lg p-6 text-center hover:shadow-xl hover:shadow-purple-900/20 transition-all border border-purple-900/30">
                <div className="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-200">{category}</h3>
                <p className="text-gray-400">100+ Jobs Available</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-white mt-auto border-t border-purple-900/30">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-200">About Us</h3>
              <p className="text-gray-400">
                Hirely connects talented professionals with their dream careers.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-200">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="/user_login" className="text-gray-400 hover:text-purple-400">Find Jobs</a></li>
                <li><a  href="/client_signup" className="text-gray-400 hover:text-purple-400">Post a Job</a></li>
                <li><a href="/user_login" className="text-gray-400 hover:text-purple-400">Browse Companies</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-200">Contact Us</h3>
              <ul className="space-y-2">
                <li className="text-gray-400">Email: ram8374041@gmail.com</li>
                <li className="text-gray-400">Phone: 709 335 3332</li>
                <li className="text-gray-400">Address: Tanuku, West Godavari</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-200">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-purple-400" target="_blank" rel="noopener noreferrer">Twitter</a>
                <a href="https://www.linkedin.com/in/abhi-ram-3b9251279" className="text-gray-400 hover:text-purple-400" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="https://www.instagram.com/_bhi.v_run/" className="text-gray-400 hover:text-purple-400" target="_blank" rel="noopener noreferrer">Instagram</a>
              </div>

            </div>
          </div>
          <div className="border-t border-purple-900/30 mt-8 pt-8 text-center text-gray-400">
            © 2024 Hirely. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;