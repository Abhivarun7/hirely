import React, { useState, useCallback, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

// Reusable Skill component for better modularity
const Skill = ({ skill, onRemove }) => (
  <div 
    className="inline-flex items-center bg-gradient-to-r from-blue-500 to-purple-500 backdrop-blur-md border border-gray-700  shadow-lg rounded-full px-3 py-1 m-1 animate-fadeIn"
    role="listitem"
  >
    <span className="bg-grey-800/50 mr-2">{skill}</span>
    <button
      onClick={onRemove}
      className="hover:bg-gray-200 rounded-full p-1 transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none"
      aria-label={`Remove ${skill}`}
    >
      <X size={14} />
    </button>
  </div>
);

const SkillsSection = ({ user }) => {
  const [skills, setSkills] = useState(user.skills);
  const [isAdding, setIsAdding] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [error, setError] = useState('');

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle skill addition or removal with error handling
  const modifySkill = useCallback(async (skill, action) => {
    try {
      const response = await fetch(`https://hirely-2.onrender.com/api/users/users/${user.user_id}/skills`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skill, action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} skill`);
      }

      const data = await response.json();
      setSkills(data.data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
  }, [user.user_id]);

  const handleAddSkill = useCallback(() => {
    if (newSkill.trim() === '') return;
    modifySkill(newSkill.trim(), 'add');
    setNewSkill('');
    setIsAdding(false);
  }, [newSkill, modifySkill]);

  const handleRemoveSkill = useCallback((skill) => {
    modifySkill(skill, 'remove');
  }, [modifySkill]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleAddSkill();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewSkill('');
    }
  }, [handleAddSkill]);

  return (
    <section className="bg-black rounded-2xl p-6" aria-labelledby="skills-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="skills-heading" className="text-xl font-semibold">Skills</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none"
          aria-label="Add new skill"
        >
          <Plus size={20} />
        </button>
      </div>

      <div 
        className="flex flex-wrap gap-2" 
        role="list"
        aria-label="List of skills"
      >
        {skills.map((skill) => (
          <Skill
            key={skill}
            skill={skill}
            onRemove={() => handleRemoveSkill(skill)}
          />
        ))}
      </div>

      {isAdding && (
        <div className="mt-4 flex items-center animate-slideDown">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border rounded-lg bg-black px-3 py-2 mr-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="Enter skill"
            aria-label="New skill input"
            autoFocus
          />
          <button
            onClick={() => setIsAdding(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none"
            aria-label="Cancel adding skill"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {error && (
        <div 
          role="alert"
          className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg animate-slideDown"
        >
          {error}
        </div>
      )}
    </section>
  );
};

export default SkillsSection;
