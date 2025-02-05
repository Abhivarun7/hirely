import React, { useState } from 'react';
import axios from 'axios';
import { GraduationCap, Trash2, Plus, Edit2 } from 'lucide-react';

// Set the base URL for the API
const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Adjust this to your backend's actual URL
});

// Component for individual education items
const EducationItem = ({ degree, institution, timeline, location, onEdit, onRemove }) => {
  const formatDate = (date) => {
    if (!date) return 'Present';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="relative border-l-4 border-blue-500 pl-8 pb-10 animate-slideDown">
  {/* Timeline Marker */}
  <div className="absolute top-0 left-[-10px] w-5 h-5 bg-blue-500 rounded-full"></div>

  {/* Content Wrapper */}
  <div className="flex items-start gap-6">
    {/* Icon */}
    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
      <GraduationCap size={24} className="text-white" />
    </div>

    {/* Details */}
    <div>
      <h3 className="text-white font-semibold text-lg">{degree}</h3>
      <p className="text-purple-400 text-sm">{institution}</p>
      <p className="text-gray-400 text-sm mt-1">
        {formatDate(timeline?.start_date)} - {formatDate(timeline?.end_date)}
      </p>
      <p className="text-gray-400 text-sm">{location}</p>
    </div>
  </div>

  {/* Action Buttons */}
  <div className="absolute bottom-0 right-0 flex gap-2">
    <button
      onClick={onEdit}
      className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
    >
      <Edit2 size={16} />
    </button>
    <button
      onClick={onRemove}
      className="p-2 bg-red-800 hover:bg-red-700 text-white rounded transition-colors"
    >
      <Trash2 size={16} />
    </button>
  </div>
</div>

  );
};

// Main Education component
const Education = ({ userId, education: initialEducation }) => {
  const [education, setEducation] = useState(initialEducation);
  const [showModal, setShowModal] = useState(false);
  const [currentEducation, setCurrentEducation] = useState(null);

  const handleAddOrEdit = async (newEducation, action) => {
    try {
      // Validate required fields
      if (!newEducation.degree || !newEducation.institution) {
        alert('Degree and Institution are required');
        return;
      }
  
      // Prepare data for backend
      const payload = {
        education: newEducation,
        action
      };
  
      // Make API call
      const response = await api.put(`/users/users/${userId}/education`, payload);
  
      // Update local state
      if (response.data && response.data.data) {
        setEducation(response.data.data);
        setShowModal(false);
        setCurrentEducation(null);
      } else {
        console.error('Unexpected response structure', response);
        alert('Failed to update education');
      }
    } catch (error) {
      console.error(`Error ${action}ing education:`, error.response?.data || error.message);
      
      // User-friendly error handling
      const errorMessage = error.response?.data?.message || 'Failed to update education';
      alert(errorMessage);
    }
  };
  

  const handleRemove = async (educationItem) => {
    try {
      const response = await api.put(`/users/users/${userId}/education`, {
        education: educationItem,
        action: 'remove',
      });
      setEducation(response.data.data);
    } catch (error) {
      console.error('Error removing education:', error.response?.data || error.message);
    }
  };

  return (
    <section className="p-4 bg-black rounded-2xl" aria-labelledby="education-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="education-heading" className="text-xl font-semibold text-white mb-4">
          Education
        </h2>
        <button
          onClick={() => {
            setCurrentEducation(null);
            setShowModal(true);
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none"
          aria-label="Add new skill"
        >
          <Plus size={20} />
        </button>
        </div>
      <div className="space-y-6" role="list" aria-label="List of education qualifications">
        {education.map((edu, index) => (
          <EducationItem
            key={index}
            degree={edu.degree}
            institution={edu.institution}
            timeline={edu.timeline}
            location={edu.location}
            onEdit={() => {
              setCurrentEducation(edu);
              setShowModal(true);
            }}
            onRemove={() => handleRemove(edu)}
          />
        ))}
      </div>
      
      {showModal && (
        <Modal
          userId={userId}
          education={currentEducation}
          onClose={() => setShowModal(false)}
          onSave={(data) =>
            handleAddOrEdit(data, currentEducation ? 'update' : 'add')
          }
        />
      )}

    </section>
  );
};

const Modal = ({ userId, education, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    education || { degree: '', institution: '', timeline: {}, location: '' }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('timeline')) {
      const key = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        timeline: { ...prev.timeline, [key]: value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return ""; // Handle empty values safely
  return dateString.split("T")[0]; // Extract YYYY-MM-DD
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96">
        <h3 className="text-white text-lg mb-4">
          {education ? 'Edit Education' : 'Add Education'}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            name="degree"
            placeholder="Degree"
            value={formData.degree}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          />
          <input
            type="text"
            name="institution"
            placeholder="Institution"
            value={formData.institution}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          />
          <input
            type="text"
            name="location"
            placeholder="Location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          />
          <input
            type="date"
            name="timeline.start_date"
            value={formatDateForInput(formData.timeline.start_date || '')}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          />
          <input
            type="date"
            name="timeline.end_date"
            value={formatDateForInput(formData.timeline.end_date || '')}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="bg-gray-600 px-4 py-2 rounded text-white">
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="bg-blue-500 px-4 py-2 rounded text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default Education;
