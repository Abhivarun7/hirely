import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyEndpoints } from '../../api/company';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Tags,
  ArrowLeft,
  Plus,
  X,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Button, Input, Card, LocationPicker } from '../../components/ui';
import type { PickedLocation } from '../../components/ui';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface SkillTag { id: string; name: string; }

export default function JobEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [availableSkills, setAvailableSkills] = useState<SkillTag[]>([]);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    requirements: '',
    skills: [] as SkillTag[],
    salaryMin: 0,
    salaryMax: 0,
    currency: 'USD',
    openings: 1,
    status: 'draft' as 'active' | 'draft' | 'closed',
  });
  const [locations, setLocations] = useState<PickedLocation[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    companyEndpoints.getSkillTags().then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setAvailableSkills(list.map((s: any) => ({ id: s._id ?? s.id, name: s.name ?? '' })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    companyEndpoints.getJob(id).then((res) => {
      console.log('[JobEdit] API response:', JSON.stringify(res.data, null, 2));
      const j = res.data?.data ?? res.data ?? {};
      console.log('[JobEdit] mapped job data:', j);
      setFormData({
        id: j._id ?? j.id ?? id,
        title: j.title ?? '',
        description: j.description ?? '',
        requirements: j.requirements ?? '',
        skills: (j.skills ?? []).map((s: any) => ({
          id: s.skill_tag_id?._id ?? s.skill_tag_id ?? s._id ?? s.id ?? '',
          name: s.skill_tag_id?.name ?? s.name ?? '',
        })).filter((s: SkillTag) => s.id),
        salaryMin: j.salary_min ?? 0,
        salaryMax: j.salary_max ?? 0,
        currency: j.salary_currency ?? 'USD',
        openings: typeof j.openings === 'number' && j.openings > 0 ? j.openings : 1,
        status: j.status ?? 'draft',
      });
      setLocations(
        (j.locations ?? []).map((l: any) => ({
          label: l.label ?? l.city ?? '',
          city: l.city ?? '',
          state: l.state,
          country: l.country ?? '',
          address: l.address,
          latitude: l.latitude ?? 0,
          longitude: l.longitude ?? 0,
          google_place_id: l.google_place_id,
        }))
      );
    }).catch((err) => {
      console.error('[JobEdit] API error:', err);
    });
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addLocation = (loc: PickedLocation) => {
    setLocations((prev) => [...prev, loc]);
    setShowPicker(false);
  };

  const removeLocation = (index: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof PickedLocation, value: string) => {
    setLocations((prev) =>
      prev.map((loc, i) => (i === index ? { ...loc, [field]: value } : loc))
    );
  };

  const toggleSkill = (tag: SkillTag) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.some((s) => s.id === tag.id)
        ? prev.skills.filter((s) => s.id !== tag.id)
        : [...prev.skills, tag],
    }));
  };

  const addCustomSkill = async () => {
    const query = skillInput.trim();
    if (!query) return;
    setSkillError(null);
    const match = availableSkills.find((t) => t.name.toLowerCase() === query.toLowerCase());
    if (match) {
      if (!formData.skills.some((s) => s.id === match.id)) {
        setFormData((prev) => ({ ...prev, skills: [...prev.skills, match] }));
      }
      setSkillInput('');
      return;
    }
    try {
      const res = await companyEndpoints.createSkillTag(query);
      const tag = (res.data as any)?.data ?? res.data;
      const id = tag._id ?? tag.id ?? '';
      const name = tag.name ?? query;
      const newTag: SkillTag = { id, name };
      setAvailableSkills((prev) => prev.some((t) => t.id === id) ? prev : [...prev, newTag]);
      if (!formData.skills.some((s) => s.id === id)) {
        setFormData((prev) => ({ ...prev, skills: [...prev.skills, newTag] }));
      }
      setSkillInput('');
    } catch {
      setSkillError(`Failed to add "${query}". Please try again.`);
    }
  };

  const handleSave = async (status?: 'active' | 'draft') => {
    if (!id) return;
    setSubmitting(true);
    try {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        skills: formData.skills.map((s) => ({ skill_tag_id: s.id })),
        salary_min: formData.salaryMin,
        salary_max: formData.salaryMax,
        salary_currency: formData.currency,
        openings: Number(formData.openings) > 0 ? Number(formData.openings) : 1,
        locations: locations.map((loc) => ({
          label: loc.label,
          city: loc.city,
          state: loc.state,
          country: loc.country,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          google_place_id: loc.google_place_id,
        })),
      };
      if (status) payload.status = status;
      await companyEndpoints.updateJob(id, payload);
      navigate('/company/jobs');
    } catch (err: any) {
      console.error('Error updating job:', err);
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await companyEndpoints.deleteJob(id);
      navigate('/company/jobs');
    } catch {
      setShowDeleteConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/company/jobs')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Job</h1>
            <p className="text-gray-600 mt-1">Update job details for "{formData.title}"</p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-600 hover:bg-red-50 border-red-200"
          disabled={submitting}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </motion.div>

      {/* Status Badge */}
      <motion.div variants={itemVariants}>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${
          formData.status === 'active'
            ? 'bg-green-50 text-green-600'
            : formData.status === 'closed'
            ? 'bg-gray-100 text-gray-600'
            : 'bg-yellow-50 text-yellow-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            formData.status === 'active' ? 'bg-green-500' : formData.status === 'closed' ? 'bg-gray-400' : 'bg-yellow-500'
          }`} />
          {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)} Job
        </div>
      </motion.div>

      {/* Form Card */}
      <motion.div variants={itemVariants}>
        <Card className="space-y-6">
          {/* Job Details Section */}
          <div className="border-b border-gray-100 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-500" />
              Job Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <Input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Senior React Developer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                  placeholder="List the qualifications, experience, and skills required..."
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="border-b border-gray-100 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              Locations
            </h2>

            <div className="space-y-4">
              {locations.map((loc, i) => (
                <div key={i} className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                  {/* Card header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-orange-700 truncate">{loc.label}</span>
                    </div>
                    <button
                      onClick={() => removeLocation(i)}
                      className="p-1 text-orange-400 hover:text-orange-600 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Editable fields auto-filled from picker */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                      <Input
                        type="text"
                        value={loc.city}
                        onChange={(e) => updateLocation(i, 'city', e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                      <Input
                        type="text"
                        value={loc.country}
                        onChange={(e) => updateLocation(i, 'country', e.target.value)}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                    <Input
                      type="text"
                      value={loc.address ?? ''}
                      onChange={(e) => updateLocation(i, 'address', e.target.value)}
                      placeholder="Full address"
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPicker(true)}
                className="w-full border-dashed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Location via Map
              </Button>
            </div>
          </div>

          {/* Skills Section */}
          <div className="border-b border-gray-100 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Tags className="w-5 h-5 text-orange-500" />
              Required Skills
            </h2>

            <div className="space-y-4">
              {/* Search input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search skill catalog</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={skillInput}
                    onChange={(e) => { setSkillInput(e.target.value); setSkillError(null); }}
                    placeholder="Type to search or add a new skill…"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                  />
                  <Button type="button" onClick={addCustomSkill} variant="secondary">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {skillError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {skillError}
                  </p>
                )}
              </div>

              {/* Filtered suggestions */}
              {skillInput.trim() && (() => {
                const filtered = availableSkills.filter((t) =>
                  t.name.toLowerCase().includes(skillInput.toLowerCase()) &&
                  !formData.skills.some((s) => s.id === t.id)
                );
                return (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      {filtered.length > 0 ? 'Matching skills:' : `"${skillInput.trim()}" not in catalog — press Enter or + to add it`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {filtered.slice(0, 20).map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => { toggleSkill(tag); setSkillInput(''); setSkillError(null); }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700 transition-colors"
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Popular catalog (when not searching) */}
              {!skillInput.trim() && availableSkills.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Popular skills</label>
                  <div className="flex flex-wrap gap-2">
                    {availableSkills.slice(0, 24).map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleSkill(tag)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          formData.skills.some((s) => s.id === tag.id)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected */}
              {formData.skills.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Skills ({formData.skills.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-full text-sm"
                      >
                        <Tags className="w-3.5 h-3.5" />
                        {tag.name}
                        <button onClick={() => toggleSkill(tag)} className="ml-1 hover:text-orange-100">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Salary Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-500" />
              Salary Range
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Salary</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    name="salaryMin"
                    value={formData.salaryMin || ''}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Salary</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    name="salaryMax"
                    value={formData.salaryMax || ''}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="INR">INR - Indian Rupee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. of openings *
                </label>
                <Input
                  type="number"
                  name="openings"
                  value={formData.openings}
                  onChange={handleInputChange}
                  placeholder="1"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => navigate('/company/jobs')}>
              Cancel
            </Button>
            {formData.status === 'draft' && (
              <Button type="button" variant="primary" onClick={() => handleSave('active')} disabled={submitting}>
                Publish Job
              </Button>
            )}
            <Button type="button" variant="primary" onClick={() => handleSave()} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Location Picker Modal */}
      {showPicker && (
        <LocationPicker onSelect={addLocation} onClose={() => setShowPicker(false)} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowDeleteConfirm(false)}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900">Delete Job?</h3>
              <p className="mt-2 text-gray-500">
                Are you sure you want to delete "{formData.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={submitting}>
                Delete Job
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
