import React from 'react';
import { ArrowLeft, Share2, Download, Upload, Mail, Phone, MapPin } from 'lucide-react';
import ProgressLine from './progress';
import Skills from './Skills';
import Education from './Education';
import Certifications from './Certifications';
import Experience from './Experience';
import Projects from './Projects';
import axios from 'axios';
import {
  ProfileSkeleton,
  SkillsSkeleton,
  EducationSkeleton,
  CertificationsSkeleton,
  ExperienceSkeleton,
  ProjectsSkeleton,
} from './Skeletons';
import { Edit2 } from 'lucide-react';


const UserProfile = ({ setActiveTab,handleDataUpdate }) => {

  const [selectedFile, setSelectedFile] = React.useState(null); // File state
  const [activeUpload, setActiveUpload] = React.useState(false); // Upload state
  const [editingField, setEditingField] = React.useState(null);
  const [editValue, setEditValue] = React.useState('');
  const [user, setUser] = React.useState(() => JSON.parse(localStorage.getItem('userloginDetails')));
  const [count,setCount] = React.useState(0);

  const fields = [
    'certifications',
    'education',
    'experience',
    'projects',
    'skills',
    'location',
    'mail',
    'name',
    'phone_number',
    'pic',
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

  const getEmptyFieldsPercentage = () => {
    const emptyFields = fields.filter(field =>
      user[field] === null ||
      (Array.isArray(user[field]) && user[field].length === 0) ||
      user[field] === ''
    );
    return 100-((emptyFields.length / fields.length) * 100);
  };
  const handleExperienceUpdate = (newExperience) => {
    const updatedUser = {
      ...user,
      experience: newExperience
    };
    setUser(updatedUser);
    localStorage.setItem('userloginDetails', JSON.stringify(updatedUser));
  };

  const handleCertificationUpdate = (newCertification) => {
    const updatedUser = {
      ...user,
      certifications: newCertification
    };
    setUser(updatedUser);
    localStorage.setItem('userloginDetails', JSON.stringify(updatedUser));
  };

  const handleProjectUpdate = (newProject) => {
    const updatedUser = {
      ...user,
      projects: newProject
    };
    setUser(updatedUser);
    localStorage.setItem('userloginDetails', JSON.stringify(updatedUser));
  };
  const emptyFieldsPercentage = getEmptyFieldsPercentage();

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      console.error('No file selected.');
      alert('Please select a file to upload.');
      return;
    }
  
    // Check if the file is a PDF (optional but recommended)
    const validFileTypes = ['application/pdf'];
    if (!validFileTypes.includes(selectedFile.type)) {
      console.error('Invalid file type.');
      alert('Please upload a valid PDF file.');
      return;
    }
  
    const formData = new FormData();
    formData.append('resume', selectedFile);
  
    try {
      const response = await axios.put(`http://localhost:3000/api/users/users/${user.user_id}/resume/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Upload success:', response.data);
      alert('Resume uploaded successfully!'); // User feedback
      setActiveUpload(false); // Close upload form or update UI as needed
      setSelectedFile(null); // Clear file input after successful upload (optional)
      
    } catch (err) {
      console.error('Upload error:', err.response?.data || err.message);
      alert('Failed to upload the resume. Please try again.');
    }
  };
  
  const handleDownload = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/users/users/${user.user_id}/resume/download`,
        {
          responseType: 'arraybuffer', // Ensures binary data is retrieved correctly
        }
      );
  
      // Validate Content-Type
      const contentType = response.headers['content-type'];
      if (contentType !== 'application/pdf') {
        console.error('Invalid file format received');
        alert('Error: The file returned is not a valid PDF.');
        return;
      }
  
      // Create a Blob for the binary data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
  
      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${user.name || 'user'}-resume.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      console.log('Download successful');
    } catch (err) {
      console.error('Download error:', err.response?.data || err.message);
      alert('Failed to download the resume. Please try again.');
    }
  };

  const handlePicChange = async (userId, file) => {
    const formData = new FormData();
    formData.append('pic', file);
  
    try {
      const response = await axios.put(
        `http://localhost:3000/api/users/users/${userId}/pic/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      console.log('Pic upload success:', response.data);
      alert('Profile picture uploaded successfully!'); // User feedback

      const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64String = reader.result; // This is the Base64 encoded image

      const updatedUser = {
        ...user,
        pic: base64String, // Store Base64 string
      };

      setUser(updatedUser);
      handleDataUpdate(updatedUser);
      localStorage.setItem('userloginDetails', JSON.stringify(updatedUser));
    };
    } catch (err) {
      console.error('Pic upload error:', err.response?.data || err.message);
      alert('Failed to upload the profile picture. Please try again.');
    }
  }
  const handleInlineEdit = async (field) => {
    try {
      const response = await axios.put(
        `http://localhost:3000/api/users/users/${user.user_id}/personalInfo`,
        { [field]: editValue }
      );
      
      const updatedUser = {
        ...user,
        [field]: editValue
      };
      
      setUser(updatedUser);
      handleDataUpdate(updatedUser);
      localStorage.setItem('userloginDetails', JSON.stringify(updatedUser));
      
      setEditingField(null);
    } catch (err) {
      console.error(`${field} update error:`, err.response?.data || err.message);
      alert(`Failed to update ${field}. Please try again.`);
    }
  };
  const handleEducationUpdate = (newEducation) => { 
    const updatedUser = {
      ...user,
      education: newEducation
    };
    setUser(updatedUser);
    handleDataUpdate(updatedUser);
    localStorage.setItem('userloginDetails', JSON.stringify(updatedUser));
  };
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
      {user && emptyFieldsPercentage !== 100 ? (
          <ProgressLine progress={emptyFieldsPercentage} />
        ) : (
          <div className="animate-pulse h-6 bg-white-700 rounded w-1/3 mb-6"></div>
        )}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="text-white flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="flex gap-4">
            <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              onClick={() => {
                setActiveUpload(true); // Set activeUpload to true before starting download
                handleDownload(); // Call handleDownload function
              }}
            >
              <Download size={20} />
              Download Resume
            </button>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf" // Limit file selection to PDFs
              className={`file-input ${activeUpload ? 'block' : 'hidden'}`} // Conditionally apply 'hidden' or 'block'
            />
            <button
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              onClick={() => {
                setCount(prevCount => {
                  const newCount = prevCount + 1;
                  if (newCount % 2 === 0) { // Check if the updated count is even
                    handleUpload();
                  } else {
                    setActiveUpload(true); // Set activeUpload to true before starting download
                  }
                  return newCount; // Return the updated count
                });
              }}
            >
              <Upload size={20} />
              Upload Resume
            </button>

            <button className="text-white flex items-center gap-2">
              <Share2 size={20} />
              Share Profile
            </button>
          </div>
        </div>
        {user ? (
          <div className="bg-black rounded-2xl p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-shrink-0">
              <div className="relative w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center group">
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
                    <span className="text-3xl text-white">{userInitials}</span>
                  )}

                  {/* Edit icon */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <label htmlFor="fileInput" className="cursor-pointer">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </label>
                  </div>

                  {/* Hidden file input */}
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handlePicChange(user.user_id, file);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex-grow">
                <h1 className="group relative text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text mb-2 flex items-center">
                  {editingField === 'name' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleInlineEdit('name')}
                      onBlur={() => setEditingField(null)}
                      autoFocus
                      className="w-full bg-gray-800 text-white px-2 py-1 rounded"
                    />
                  ) : (
                    <>
                      {user.name}
                      <button 
                        onClick={() => {
                          setEditValue(user.name);
                          setEditingField('name');
                        }}
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <Edit2 size={16} className="text-gray-400 hover:text-blue-400" />
                      </button>
                    </>
                  )}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  {[
                    { 
                      Icon: Mail, 
                      label: 'Email', 
                      value: user.mail,
                      field: 'mail'
                    },
                    { 
                      Icon: Phone, 
                      label: 'Phone', 
                      value: user.phone_number,
                      field: 'phone_number'
                    },
                    { 
                      Icon: MapPin, 
                      label: 'Location', 
                      value: user.location,
                      field: 'location'
                    }
                  ].map(({ Icon, label, value, field }) => (
                    <div key={label}>
                      <p className="text-gray-400 text-sm">{label}</p>
                      <p className="group relative text-white flex items-center gap-2 hover:bg-gray-700 p-1 rounded transition-colors">
                        {editingField === field ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInlineEdit(field)}
                            onBlur={() => setEditingField(null)}
                            autoFocus
                            className="w-full bg-gray-800 text-white px-2 py-1 rounded"
                          />
                        ) : (
                          <>
                            <Icon size={16} />
                            {value}
                            <button 
                              onClick={() => {
                                setEditValue(value);
                                setEditingField(field);
                              }}
                              className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                              <Edit2 size={16} className="text-white ml-2 hover:text-blue-400" />
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ProfileSkeleton />
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-8">
            {user ? <Skills user={user} /> : <SkillsSkeleton />}
            {user ? <Education education={user.education} setEducatioin={handleEducationUpdate} userId={user.user_id} /> : <EducationSkeleton />}
            {user ? (
              <Certifications
                certifications={user.certifications}
                userId={user.user_id}
                setCertifications={handleCertificationUpdate}
              />
            ) : (
              <CertificationsSkeleton />
            )}
          </div>
          <div className="md:col-span-2 space-y-8">
            {user ? (
              <Experience
                experience={user.experience}
                userId={user.user_id}
                setExperience={handleExperienceUpdate}
              />
            ) : (
              <ExperienceSkeleton />
            )}
            {user ? (
              <Projects
                projects={user.projects}
                userId={user.user_id}
                setProjects={handleProjectUpdate}
              />
            ) : (
              <ProjectsSkeleton />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
