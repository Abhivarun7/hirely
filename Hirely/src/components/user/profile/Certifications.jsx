import React, { useState, useCallback } from 'react';
import { Award, ExternalLink, Edit2, Trash2, Plus } from 'lucide-react';
import axios from 'axios';

const CertificationsForm = ({
  isVisible,
  formData,
  setFormData,
  onSubmit,
  onCancel,
  error,
  isEditing,
}) => {
  const formatDateForInput = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`bg-gray-900 rounded-xl p-6 mb-6 transition-all ${isVisible ? 'block' : 'hidden'}`}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            Certification Title*
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="AWS Certified Solutions Architect"
          />
        </div>

        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-gray-300 mb-1">
            Organization*
          </label>
          <input
            type="text"
            id="organization"
            value={formData.organization}
            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="Amazon"
          />
        </div>

        <div>
          <label htmlFor="date_issued" className="block text-sm font-medium text-gray-300 mb-1">
            Date Issued
          </label>
          <input
            type="date"
            id="date_issued"
            value={formatDateForInput(formData.date_issued)}
            onChange={(e) =>
              setFormData({ ...formData, date_issued: e.target.value })
            }
            className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label htmlFor="link" className="block text-sm font-medium text-gray-300 mb-1">
            Certification Link
          </label>
          <input
            type="url"
            id="link"
            value={formData.link}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            className="w-full bg-gray-800 rounded-lg border border-gray-700 text-white px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="https://example.com"
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
            {isEditing !== null ? 'Update' : 'Add'} Certification
          </button>
        </div>
      </div>
    </form>
  );
};

const Certifications = ({ certifications, setCertifications, userId }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    organization: '',
    date_issued: '',
    link: '',
  });
  const [error, setError] = useState('');

  const handleCancel = useCallback(() => {
    setIsFormVisible(false);
    setError('');
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
  
      if (!formData.title || !formData.organization) {
        setError("Title and Organization are required.");
        return;
      }
  
      try {
        const action = isEditing !== null ? "edit" : "add";
        const payload = isEditing !== null
          ? { oldCertification: certifications[isEditing], newCertification: formData }
          : { title: formData.title, organization: formData.organization, date_issued: formData.date_issued, link: formData.link };
  
        const response = await axios.put(`http://localhost:3000/api/users/users/${userId}/certification`, {
          certification: payload,
          action,
        });
     
  
        if (response.status === 200) {
          const updatedCertifications = isEditing !== null
            ? certifications.map((cert, index) => (index === isEditing ? formData : cert))
            : [...certifications, formData];
  
          setCertifications(updatedCertifications);
        }
  
        setIsFormVisible(false);
        setIsEditing(false);
        setError("");
        setFormData({ title: "", organization: "", date_issued: "", link: "" });
      } catch (error) {
        console.error("Error saving certification:", error);
      }
    },
    [userId, formData, isEditing, certifications,setIsFormVisible, setCertifications]
  );
  
  const handleDelete = useCallback(
    async (index) => {
      try {
        const certification = certifications[index];
  
        const response = await axios.put(`http://localhost:3000/api/users/users/${userId}/certification`, {
          certification: certification,
          action: 'remove',
        });
        
        if (response.status === 200) {
          // Directly use the certifications returned from backend
          const updatedCertifications = response.data.certifications;
          setCertifications(updatedCertifications);
        }
      } catch (error) {
        console.error("Error deleting certification:", error.response?.data || error);
        alert(error.response?.data?.message || "Failed to delete certification");
      }
    },
    [userId, certifications, setCertifications]
);
  

  return (
    <div className="bg-black rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Certifications</h2>
        <button
          className="rounded-full p-2 hover:bg-purple-800 text-white transition-colors"
          onClick={() => {
            setIsFormVisible(!isFormVisible);
            setIsEditing(null);
            setFormData({
              title: '',
              organization: '',
              date_issued: '',
              link: '',
            });
          }}
        >
          <Plus size={20} />
        </button>
      </div>

      <CertificationsForm
        isVisible={isFormVisible}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        error={error}
        isEditing={isEditing}
      />

      <div className="space-y-8 mt-6">
      {certifications.map((cert, index) => (
          cert ? (
            <div key={index} className="border-b border-gray-800 last:border-0 pb-8 last:pb-0">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-purple-900 rounded-xl flex items-center justify-center">
                  <Award size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-semibold">{cert.title}</h3>
                      <p className="text-purple-400">{cert.organization}</p>
                      <p className="text-gray-400 text-sm">
                        Issued: {new Date(cert.date_issued).toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
                        onClick={() => {
                          setIsEditing(index);
                          setFormData(cert);
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
                  {cert.link && (
                    <a
                      href={cert.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 mt-2 block"
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : null
        ))}

      </div>
    </div>
  );
};

export default Certifications;
