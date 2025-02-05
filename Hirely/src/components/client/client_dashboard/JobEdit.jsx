import { useState, useEffect } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import axios from 'axios';

const JobEdit = ({ job, onBack, onSave }) => {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newSkill, setNewSkill] = useState('');

  const [shakeError, setShakeError] = useState(false);

  const handleChange = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  };

  // Add to your component's styles
  const shakeStyle = `@keyframes shake {0%, 100% { transform: translateX(0); }25% { transform: translateX(-10px); }75% { transform: translateX(10px); }}.shake { animation: shake 0.3s ease-in-out;}`;
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const employeeId = userDetails?.employeeId || null;

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const response = await axios.get(`https://hirely-2.onrender.com/api/jobs/getJobsByEmployeeId/${employeeId}`);
        const jobData = response.data.data.find(j => j._id === job._id);
        setFormData(jobData);
      } catch (error) {
        setError("Failed to fetch job details");
      } finally {
        setLoading(false);
      }
    };
    fetchJobDetails();
  }, [job._id, employeeId]);

  const handleSkillAdd = (e) => {
    e.preventDefault();
    if (newSkill.trim()) {
      setFormData({
        ...formData,
        skills_required: [...(formData.skills_required || []), newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const handleSkillRemove = (skillToRemove) => {
    setFormData({
      ...formData,
      skills_required: formData.skills_required.filter(skill => skill !== skillToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`https://hirely-2.onrender.com/api/jobs/edit/${formData.job_id}`, formData);
      if (response.data.success) {
        onSave();
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update job");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!formData) return null;

  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-purple-500 hover:text-purple-400 mb-6">
        <ArrowLeft size={20} />Back
      </button>
      <form onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl border border-purple-500/20 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={e => setFormData({...formData, job_title: e.target.value})}
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
              />
            </div>
            <style>{shakeStyle}</style>
            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Company Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={handleChange}
                className={`w-full bg-gray-800 text-gray-200 rounded-lg p-2 border ${
                  shakeError ? 'border-red-500 shake' : 'border-red-500'
                }`}
              />
            </div>

            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
              />
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Job Type</label>
              <input
                type="text"
                value={formData.job_type}
                onChange={e => setFormData({...formData, job_type: e.target.value})}
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
              />
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Salary Range</label>
              <input
                type="text"
                value={formData.salary_range}
                onChange={e => setFormData({...formData, salary_range: e.target.value})}
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
              />
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Experience Required</label>
              <input
                type="text"
                value={formData.experience_required}
                onChange={e => setFormData({...formData, experience_required: e.target.value})}
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
              />
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Education Required</label>
              <input
                type="text"
                value={formData.education_required}
                onChange={e => setFormData({...formData, education_required: e.target.value})}
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
              />
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Job Category</label>
              <input
                type="text"
                value={formData.job_category}
                onChange={e => setFormData({...formData, job_category: e.target.value})}
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
              />
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Status</label>
              <select
                value={formData.job_status}
                onChange={e => setFormData({...formData, job_status: e.target.value})}
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
              >
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-200 mb-2 block">Application Deadline</label>
              <input
                type="date"
                value={formData.application_deadline?.split('T')[0]}
                onChange={e => setFormData({...formData, application_deadline: e.target.value})}
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <label className="text-lg font-semibold text-gray-200 mb-2 block">Job Description</label>
            <textarea
              value={formData.job_description}
              onChange={e => setFormData({...formData, job_description: e.target.value})}
              className="w-full bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700 h-32"
            />
          </div>
          
          <div>
            <label className="text-lg font-semibold text-gray-200 mb-2 block">Required Skills</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.skills_required?.map((skill, index) => (
                <span key={index} className="bg-gray-800 text-gray-200 px-3 py-1 rounded-full flex items-center gap-2">
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleSkillRemove(skill)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                className="flex-1 bg-gray-800 text-gray-200 rounded-lg p-2 border border-gray-700"
                placeholder="Add a new skill"
              />
              <button
                type="button"
                onClick={handleSkillAdd}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2">
            <Save size={16} />Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobEdit;