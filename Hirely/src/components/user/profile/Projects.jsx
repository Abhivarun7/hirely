import React, { useState, useCallback } from "react";
import { Edit2, Plus,ExternalLink, Trash2, FolderGit2 } from "lucide-react";
import axios from "axios";

const ProjectForm = ({
  isVisible,
  formData,
  setFormData,
  onSubmit,
  onCancel,
  error,
  isEditing,
}) => {
  const formatDateForInput = (date) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
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
            htmlFor="title"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Project Title*
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="Project Title"
          />
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
            placeholder="Describe your project..."
          />
        </div>

        <div>
          <label
            htmlFor="link"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Project Link
          </label>
          <input
            type="url"
            id="link"
            value={formData.link}
            onChange={(e) =>
              setFormData({ ...formData, link: e.target.value })
            }
            className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="https://github.com/username/project-link"
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
            {isEditing !== null ? "Update" : "Add"} Project
          </button>
        </div>
      </div>
    </form>
  );
};

const Projects = ({ projects, setProjects, userId, handleProjectsUpdate }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    link: "",
  });
  const [error, setError] = useState("");

  const handleCancel = useCallback(() => {
    setIsFormVisible(false);
    setError("");
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!formData.title) {
        setError("Title is required.");
        return;
      }

      try {
        const action = isEditing !== null ? "edit" : "add";
        const payload = isEditing !== null
          ? { oldProject: projects[isEditing], newProject: formData }
          : formData;

        await axios.put(`https://hirely-2.onrender.com/api/users/users/${userId}/project`, {
          user_id: userId,
          project: payload,
          action,
        });

        const updatedProjects = isEditing !== null
          ? projects.map((proj, index) => (index === isEditing ? formData : proj))
          : [...projects, formData];

        setProjects(updatedProjects);
        handleProjectsUpdate(updatedProjects);

        setIsFormVisible(false);
        setIsEditing(null);
        setError("");
        setFormData({
          title: "",
          description: "",
          link: "",
          _id: "",
        });
      } catch (error) {
        console.error("Error saving project:", error);
      }
      setIsFormVisible(false);
    },
    [userId, formData, isEditing, projects, setProjects, handleProjectsUpdate]
  );

  const handleDelete = useCallback(
    async (index) => {
      try {
        await axios.put(`https://hirely-2.onrender.com/api/users/users/${userId}/project`, {
          user_id: userId,
          project: projects[index],
          action: "remove",
        });

        const updatedProjects = projects.filter((_, i) => i !== index);
        setProjects(updatedProjects);
        handleProjectsUpdate(updatedProjects);
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    },
    [userId, projects, setProjects, handleProjectsUpdate]
  );

  return (
    <div className="bg-black rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Projects</h2>
        <button
          className="rounded-full p-2 hover:bg-purple-800 text-white transition-colors"
          onClick={() => {
            setIsFormVisible(!isFormVisible);
            setIsEditing(null);
            setFormData({
              title: "",
              description: "",
              link: "",
            });
          }}
        >
          <Plus size={20} />
        </button>
      </div>

      <ProjectForm
        isVisible={isFormVisible}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        error={error}
        isEditing={isEditing}
      />

      <div className="space-y-8 mt-6">
        {projects.map((proj, index) => (
          <div
            key={index}
            className="border-b border-gray-800 last:border-0 pb-8 last:pb-0"
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <FolderGit2  size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-semibold">{proj.title}</h3>
                    <p className="text-purple-400">{proj.link}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
                      onClick={() => {
                        setIsEditing(index);
                        setFormData(proj);
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
                <p className="text-gray-300 mt-2">{proj.description}</p>
                <a
                      href={proj.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 mt-2 block"
                    >
                      <ExternalLink size={20} />
                    </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Projects;
