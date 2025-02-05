import React, { useState, useCallback } from "react";
import { Briefcase, Plus, Edit2, Trash2 } from "lucide-react";
import axios from "axios";

const ExperienceForm = ({
  isVisible,
  formData,
  setFormData,
  onSubmit,
  onCancel,
  error,
  isEditing,
}) => {
  const formatDateForInput = (dateString) => {
    if (!dateString) return ""; // Handle empty values safely
  return dateString.split("T")[0]; // Extract YYYY-MM-DD
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`bg-gray-900 rounded-xl p-6 mb-6 transition-all ${
        isVisible ? "block" : "hidden"
      }`}
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Role*
          </label>
          <input
            type="text"
            id="role"
            value={formData.role}
            onChange={(e) =>
              setFormData({ ...formData, role: e.target.value })
            }
            className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="Software Engineer"
          />
        </div>

        <div>
          <label
            htmlFor="company"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Company*
          </label>
          <input
            type="text"
            id="company"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="Tech Corp"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              value={formatDateForInput(formData.timeline.start_date)}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  timeline: {
                    ...formData.timeline,
                    start_date: e.target.value,
                  },
                })
              }
              className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label
              htmlFor="end_date"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              End Date
            </label>
            <input
              type="date"
              id="end_date"
              value={formatDateForInput(formData.timeline.end_date)}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  timeline: {
                    ...formData.timeline,
                    end_date: e.target.value,
                  },
                })
              }
              className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={4}
            className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="Describe your responsibilities and achievements..."
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {isEditing !== null ? "Update" : "Add"} Experience
          </button>
        </div>
      </div>
    </form>
  );
};

const Experience = ({ experience, setExperience, userId, handleExperienceUpdate }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({
    role: "",
    company: "",
    timeline: {
      start_date: "",
      end_date: "",
    },
    description: "",
  });
  const [error, setError] = useState("");

  const handleCancel = useCallback(() => {
    setIsFormVisible(false);
    setError("");
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!formData.role || !formData.company) {
        setError("Role and Company are required.");
        return;
      }

      try {
        const action = isEditing !== null ? "update" : "add";
        const payload = isEditing !== null
          ? { oldExperience: experience[isEditing], newExperience: formData }
          : formData;

        await axios.put(`https://hirely-2.onrender.com/api/users/users/${userId}/experience`, {
          user_id: userId,
          experience: payload,
          action,
        });

        const updatedExperience = isEditing !== null
          ? experience.map((exp, index) => (index === isEditing ? formData : exp))
          : [...experience, formData];

        setExperience(updatedExperience);
        handleExperienceUpdate(updatedExperience);

        setIsFormVisible(false);
        setIsEditing(null);
        setError("");
        setFormData({
          role: "",
          company: "",
          timeline: {
            start_date: "",
            end_date: "",
          },
          description: "",
        });
      } catch (error) {
        console.error("Error saving experience:", error);
      }
      setIsFormVisible(false);
    },
    [userId, formData, isEditing, experience, setExperience, handleExperienceUpdate]
  );

  const handleDelete = useCallback(
  async (index) => {
    try {
      const experienceToDelete = experience[index];

      if (!experienceToDelete || !experienceToDelete._id) {
        console.error("Error: Experience ID is missing.");
        return;
      }

      await axios.put(`https://hirely-2.onrender.com/api/users/users/${userId}/experience`, {
        user_id: userId,
        experience: { _id: experienceToDelete._id }, // Send only `_id` for deletion
        action: "remove",
      });

      const updatedExperience = experience.filter((_, i) => i !== index);
      setExperience(updatedExperience);
      handleExperienceUpdate(updatedExperience);
    } catch (error) {
      console.error("Error deleting experience:", error);
    }
  },
  [userId, experience, setExperience, handleExperienceUpdate]
);


  return (
    <div className="bg-black rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Experience</h2>
        <button
          className="rounded-full p-2 hover:bg-purple-800 text-white transition-colors"
          onClick={() => {
            setIsFormVisible(!isFormVisible);
            setIsEditing(null);
            setFormData({
              role: "",
              company: "",
              timeline: {
                start_date: "",
                end_date: "",
              },
              description: "",
            });
          }}
        >
          <Plus size={20} />
        </button>
      </div>

      <ExperienceForm
        isVisible={isFormVisible}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        error={error}
        isEditing={isEditing}
      />

      <div className="space-y-8 mt-6">
        {experience.map((exp, index) => (
          <div
            key={index}
            className="border-b border-gray-800 last:border-0 pb-8 last:pb-0"
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Briefcase size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-semibold">{exp.role}</h3>
                    <p className="text-purple-400">{exp.company}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(exp.timeline.start_date).toLocaleString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      -{" "}
                      {exp.timeline.end_date
                        ? new Date(exp.timeline.end_date).toLocaleString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : "Present"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
                      onClick={() => {
                        setIsEditing(index);
                        setFormData(exp);
                        setIsFormVisible(true);
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="p-2 bg-red-800 hover:bg-red-700 text-white rounded transition-colors"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-300 mt-2">{exp.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Experience;
