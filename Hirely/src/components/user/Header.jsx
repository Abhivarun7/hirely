import React, { useState, useEffect  } from 'react';
import { Bell, Search } from 'lucide-react';
import axios from 'axios';

const Header = ({ setLoading, user, setSearchCompanyResults, setActiveTab,activeTab ,setIsOpen, onSearchResults }) => {
  const [freeText, setFreeText] = useState('');
  const [searchParams, setSearchParams] = useState({
    skills_required: '',
    job_title: '',
    location: '',
  });

  const [companyFreeText, setcompanyFreeText] = useState('');
  const [searchCompanyParams, setSearchCompanyParams] = useState({ 
    company_name: ''
  });

  useEffect(() => {
    console.log(user);

  }, [user]);

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

  const company_name = "infosys";

  // Function to determine the category of input
  const parseInput = (input) => {
    const skillKeywords = [
      'react', 'node', 'javascript', 'python', 'java', 'c++', 'c#', 'html', 'css', 'typescript',
      'angular', 'vue', 'swift', 'kotlin', 'flutter', 'django', 'spring', 'ruby on rails',
      'golang', 'php', 'rust', 'r', 'matlab', 'scala', 'perl', 'sas', 'haskell', 'elixir',
      'tensorflow', 'pytorch', 'scikit-learn', 'nlp', 'opencv', 'deep learning', 'ai', 
      'machine learning', 'data science', 'big data', 'hadoop', 'spark', 'kafka',
      'sql', 'mysql', 'postgresql', 'mongodb', 'firebase', 'oracle', 'redis', 'neo4j',
      'aws', 'azure', 'gcp', 'devops', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 
      'ansible', 'terraform', 'grafana', 'prometheus', 'blockchain', 'ethereum', 'solidity',
      'smart contracts', 'cybersecurity', 'ethical hacking', 'penetration testing',
      'cloud computing', 'network security', 'linux', 'bash scripting', 'powershell',
      'agile', 'scrum', 'jira', 'git', 'github', 'bitbucket', 'gitlab',
      'graphql', 'rest api', 'soap', 'microservices', 'serverless', 'web3',
      'frontend', 'backend', 'full stack', 'progressive web apps', 'tdd', 'bdd',
      'test automation', 'selenium', 'cypress', 'jest', 'mocha', 'chai', 'postman',
      'web development', 'mobile development', 'iot', 'robotics', 'embedded systems',
      'game development', 'unity', 'unreal engine', 'vr', 'ar', '3d modeling', 'animation',
      'ux', 'ui', 'figma', 'adobe xd', 'illustrator', 'photoshop'
    ];
  
    const locationKeywords = [
      // Indian Cities
      'bengaluru', 'mumbai', 'delhi', 'chennai', 'hyderabad', 'pune', 'kolkata', 
      'ahmedabad', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'visakhapatnam', 'bhopal', 
      'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'meerut', 
      'rajkot', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 
      'allahabad', 'ranchi', 'howrah', 'jodhpur', 'coimbatore', 'vijayawada', 
      'madurai', 'gwalior', 'chandigarh', 'guwahati', 'bhubaneswar', 'mysore', 
      'tiruchirappalli', 'dehradun', 'noida', 'gurgaon', 'faridabad', 'thane', 
      'indore', 'kochi', 'trivandrum', 'pondicherry', 'shimla', 'siliguri',
  
      // Global Cities
      'new york', 'california', 'remote', 'london', 'san francisco', 'los angeles', 'seattle',
      'boston', 'chicago', 'houston', 'austin', 'denver', 'atlanta', 'toronto', 'vancouver',
      'paris', 'berlin', 'tokyo', 'sydney', 'dubai', 'singapore', 'bangkok', 'amsterdam', 
      'dublin', 'hong kong', 'washington dc', 'miami', 'las vegas', 'san diego', 'portland', 
      'philadelphia', 'charlotte', 'orlando', 'kuala lumpur', 'jakarta', 'manila', 'madrid', 
      'barcelona', 'rome', 'milan', 'vienna', 'copenhagen', 'stockholm', 'oslo', 'helsinki', 
      'zurich', 'geneva', 'brussels', 'luxembourg', 'cape town', 'nairobi', 'istanbul', 
      'moscow', 'st petersburg', 'prague', 'budapest', 'warsaw', 'bucharest'
    ];
  
    const jobTitleKeywords = [
      'software engineer','designer', 'frontend developer', 'backend developer', 'full stack developer',
      'data scientist', 'machine learning engineer', 'ai engineer', 'cloud engineer', 
      'devops engineer', 'blockchain developer', 'cybersecurity analyst', 'system administrator',
      'database administrator', 'product manager', 'project manager', 'qa engineer',
      'ui/ux designer', 'business analyst', 'technical writer', 'mobile developer',
      'game developer', 'embedded systems engineer', 'network engineer', 'security engineer',
      'automation engineer', 'site reliability engineer', 'scrum master', 'it support specialist',
      'hardware engineer', 'big data engineer', 'web developer', 'frontend engineer',
      'backend engineer', 'ios developer', 'android developer', 'full stack engineer',
      'react developer', 'angular developer', 'vue developer', 'python developer',
      'java developer', 'node.js developer', 'ruby developer', 'php developer',
      'golang developer', 'rust developer', 'c++ developer', 'c# developer',
      'data analyst', 'mlops engineer', 'ai researcher', 'robotics engineer',
      'iot developer', 'game programmer', '3d artist', 'vr/ar developer',
      'bi engineer', 'etl developer', 'cloud architect', 'network security engineer',
      'pen tester', 'ethical hacker', 'digital marketing analyst', 'seo specialist',
      'social media manager', 'content writer', 'copywriter', 'graphic designer',
      'motion graphics designer', 'brand strategist', 'data visualization specialist',
      'product owner', 'scrum product manager', 'software architect', 
      'software development manager', 'cto', 'cio', 'security architect',
      'penetration tester', 'forensic analyst', 'legal tech specialist',
      'e-commerce specialist', 'ai chatbot developer', 'natural language processing engineer'
    ];

    
    
    
    const lowerInput = input.toLowerCase();
  
    if (skillKeywords.some((skill) => lowerInput.includes(skill))) {
      return { skills_required: input };
    } else if (locationKeywords.some((loc) => lowerInput.includes(loc))) {
      return { location: input };
    } else if (jobTitleKeywords.some((title) => lowerInput.includes(title))) {
      return { job_title: input };
    } else {
      return { job_title: input }; // Default to job title if unrecognized
    }
  };

  const handleSearch = async () => {
    try {
      // Reset searchParams when starting a new search
      if (freeText.length === 0) {
        setSearchParams({
          skills_required: '',
          job_title: '',
          location: '',
        });
      }
  
      const parsedInput = parseInput(freeText);
      setSearchParams((prev) => ({ ...prev, ...parsedInput }));
  
      const queryParams = new URLSearchParams();
      Object.entries({ ...searchParams, ...parsedInput }).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
  
      const response = await axios.get(`http://localhost:3000/api/users/users/jobsearch?${queryParams}`);
      
      // Handle the search results
      onSearchResults(response.data.results);
  
      // Reset the freeText input field after the search is completed
      setFreeText('');
      setLoading(false);
      // Clear searchParams after the query has been made
      setSearchParams({
        skills_required: '',
        job_title: '',
        location: '',
      });
    } catch (error) {
      console.error('Search failed:', error);
    }
  };
  const handleCompanySearch = async () => {
    try {
   
      console.log("companyFreeText", companyFreeText);
      
      if (companyFreeText.length === 0) {
        setSearchCompanyParams({
          company_name: ''
        });
      }
  
      // Update searchCompanyParams state with the company name
      setSearchCompanyParams({ company_name: companyFreeText });
  
      // Construct the query string using URLSearchParams
      const params = new URLSearchParams(searchCompanyParams).toString();
    
      const response = await axios.post(`http://localhost:3000/api/users/users/companysearch`, {
        company_name: companyFreeText
      });
  
      // Handle the search results (response.data instead of response.data.results)
      setSearchCompanyResults(response.data);
      console.log("searchCompanyResults", response.data);
    
      // Reset the freeText input field after the search is completed
      setcompanyFreeText('');
    
      // Clear searchParams after the query has been made
      setSearchCompanyParams({
        company_name: ''
      });
      setLoading(false);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };
  
  
  
  useEffect(() => {
    if (freeText.length > 0) {
      setLoading(true);
      setActiveTab("jobsearch");  // This now works since activeTab is the setter function
    }
  }, [freeText, setActiveTab, setLoading]);

  useEffect(() => {
    if (companyFreeText.length > 0) {
      setLoading(true);  // This now works since activeTab is the setter function
    }
  }, [companyFreeText, setLoading]);

  return (
    <div className="flex items-center justify-between mb-8 bg-slate-900/50 p-4 rounded-lg backdrop-blur-sm">
      {activeTab !== 'users' && activeTab !== 'companysearch' && (
        <div className="relative w-164">
          <div className="absolute left-3 top-2.5 h-4 w-4 text-slate-400">
                   
            </div>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Job Title, Skills, Location"
            className="w-full pl-10 pr-4 py-2 bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
      )}
      {
        activeTab === 'companysearch' && (
          <div className="relative w-164">
            <div className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"></div>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Companies"
              className="w-full pl-10 pr-4 py-2 bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={companyFreeText}
              onChange={(e) => setcompanyFreeText(e.target.value)}  // <-- Ensure this is updating the state
              onKeyDown={(e) => e.key === 'Enter' && handleCompanySearch()} // Trigger search when 'Enter' is pressed
            />
          </div>
        )
      }

      
      <div className="flex items-center space-x-4 ml-auto">
        <button className="p-2 rounded-lg hover:bg-slate-800 relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
        </button>
        <div className="flex items-center space-x-3">
          <div onClick={() => setIsOpen(true)} className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center cursor-pointer">

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
