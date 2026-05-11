import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyEndpoints } from '../../api/company';
import { getPublicCategories } from '../../api/public';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Tags,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  AlertCircle,
  Building2,
  Sparkles,
  Loader2,
  Star,
} from 'lucide-react';
import { Button, Input, Card, LocationPicker } from '../../components/ui';
import type { PickedLocation, BranchOption } from '../../components/ui';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface SkillTag { id: string; name: string; is_required?: boolean; }
interface JobLocation extends PickedLocation { openings: number; is_primary: boolean; }
interface CategoryOption { id: string; name: string; }

export default function JobCreate() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    description: '',
    responsibilities: '',
    requirements: '',
    job_type: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance',
    work_mode: 'onsite' as 'onsite' | 'remote' | 'hybrid',
    experience_level: '' as '' | 'entry' | 'mid' | 'senior' | 'lead' | 'executive',
    experience_min_years: '' as string | number,
    experience_max_years: '' as string | number,
    salary_min: 0,
    salary_max: 0,
    salary_currency: 'USD',
    salary_disclosed: true,
    openings: 1,
    application_deadline: '',
  });
  const [locations, setLocations] = useState<JobLocation[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillTag[]>([]);
  const [skills, setSkills] = useState<SkillTag[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillError, setSkillError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    companyEndpoints.getSkillTags().then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setAvailableSkills(list.map((s: any) => ({ id: s._id ?? s.id, name: s.name ?? '' })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getPublicCategories().then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setCategories(list.map((c: any) => ({ id: c._id ?? c.id, name: c.name ?? '' })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    companyEndpoints.getBranches().then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setBranches(
        list
          .filter((b: any) => b.latitude && b.longitude)
          .map((b: any) => ({
            id: b._id ?? b.id,
            name: b.name ?? b.city ?? '',
            city: b.city ?? '',
            state: b.state,
            country: b.country ?? '',
            address: b.address ?? '',
            latitude: b.latitude,
            longitude: b.longitude,
          }))
      );
    }).catch(() => {});
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateWithAI = async () => {
    if (!formData.title.trim()) return;
    setAiGenerating(true);
    setError(null);
    try {
      const res = await companyEndpoints.generateJobWithAI({
        title: formData.title,
        job_type: formData.job_type,
        work_mode: formData.work_mode,
        experience_min_years: formData.experience_min_years !== '' ? Number(formData.experience_min_years) : undefined,
        experience_max_years: formData.experience_max_years !== '' ? Number(formData.experience_max_years) : undefined,
      });
      const data = (res.data as any)?.data ?? res.data;
      setFormData((prev) => ({
        ...prev,
        description: data.description || prev.description,
        requirements: data.requirements || prev.requirements,
      }));
      if (data.skills?.length) {
        const matched = (data.skills as string[])
          .map((name: string) =>
            availableSkills.find((t) => t.name.toLowerCase() === name.toLowerCase())
          )
          .filter(Boolean) as SkillTag[];
        if (matched.length) setSkills(matched);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'AI generation failed. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const addLocation = (loc: PickedLocation) => {
    setLocations((prev) => [
      ...prev,
      { ...loc, openings: 1, is_primary: prev.length === 0 },
    ]);
    setShowPicker(false);
  };

  const removeLocation = (index: number) => {
    setLocations((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Ensure exactly one primary remains when entries exist.
      if (next.length && !next.some((l) => l.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
  };

  const updateLocation = (index: number, field: keyof PickedLocation, value: string) => {
    setLocations((prev) =>
      prev.map((loc, i) => (i === index ? { ...loc, [field]: value } : loc))
    );
  };

  const updateLocationOpenings = (index: number, value: string) => {
    const num = value === '' ? 0 : Math.max(0, Number(value));
    setLocations((prev) =>
      prev.map((loc, i) => (i === index ? { ...loc, openings: num } : loc))
    );
  };

  const setPrimaryLocation = (index: number) => {
    setLocations((prev) =>
      prev.map((loc, i) => ({ ...loc, is_primary: i === index }))
    );
  };

  const toggleSkill = (tag: SkillTag) => {
    setSkills((prev) =>
      prev.some((s) => s.id === tag.id)
        ? prev.filter((s) => s.id !== tag.id)
        : [...prev, { ...tag, is_required: tag.is_required ?? true }]
    );
  };

  const toggleSkillRequired = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_required: !(s.is_required ?? true) } : s))
    );
  };

  const addCustomSkill = async () => {
    const query = skillInput.trim();
    if (!query) return;
    setSkillError(null);
    const match = availableSkills.find((t) => t.name.toLowerCase() === query.toLowerCase());
    if (match) {
      if (!skills.some((s) => s.id === match.id))
        setSkills((prev) => [...prev, { ...match, is_required: true }]);
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
      if (!skills.some((s) => s.id === id))
        setSkills((prev) => [...prev, { ...newTag, is_required: true }]);
      setSkillInput('');
    } catch {
      setSkillError(`Failed to add "${query}". Please try again.`);
    }
  };

  const handleSubmit = async (publish: boolean) => {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        category_id: formData.category_id || undefined,
        description: formData.description,
        responsibilities: formData.responsibilities || undefined,
        requirements: formData.requirements || undefined,
        job_type: formData.job_type,
        work_mode: formData.work_mode,
        experience_level: formData.experience_level || undefined,
        experience_min_years: formData.experience_min_years !== '' ? Number(formData.experience_min_years) : undefined,
        experience_max_years: formData.experience_max_years !== '' ? Number(formData.experience_max_years) : undefined,
        salary_min: formData.salary_min || undefined,
        salary_max: formData.salary_max || undefined,
        salary_currency: formData.salary_currency || undefined,
        salary_disclosed: formData.salary_disclosed,
        openings: Number(formData.openings) > 0 ? Number(formData.openings) : 1,
        application_deadline: formData.application_deadline
          ? new Date(formData.application_deadline).toISOString()
          : undefined,
        skills: skills.map((s) => ({
          skill_tag_id: s.id,
          is_required: s.is_required ?? true,
        })),
        locations: locations.map((loc) => ({
          label: loc.label,
          city: loc.city,
          state: loc.state,
          country: loc.country,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          google_place_id: loc.google_place_id,
          branch_id: loc.branch_id,
          openings: loc.openings,
          is_primary: loc.is_primary,
        })),
      };

      const res = await companyEndpoints.createJob(payload as any);
      const jobId = (res.data as any)?.data?._id ?? (res.data as any)?._id;

      if (publish && jobId) {
        try {
          await companyEndpoints.publishJob(jobId);
        } catch {
          // job created as draft even if publish fails
        }
      }

      navigate('/company/jobs');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.data?.message ||
        'Failed to create job. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.title.trim() !== '' && formData.description.trim() !== '';
      case 2: return locations.length > 0;
      case 3: return true;
      case 4: return true;
      default: return true;
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
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <button
          onClick={() => navigate('/company/jobs')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Job</h1>
          <p className="text-gray-600 mt-1">Fill in the job details to post a new listing</p>
        </div>
      </motion.div>

      {/* Progress Steps */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-center gap-2">
          {[
            { step: 1, label: 'Details' },
            { step: 2, label: 'Location' },
            { step: 3, label: 'Skills' },
            { step: 4, label: 'Salary' },
          ].map(({ step, label }, index) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    currentStep >= step ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step}
                </div>
                <span className={`text-sm mt-1 ${currentStep >= step ? 'text-orange-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {index < 3 && (
                <div className={`w-16 h-0.5 mx-2 ${currentStep > step ? 'bg-orange-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </motion.div>
      )}

      {/* Form Card */}
      <motion.div variants={itemVariants}>
        <Card>
          {/* Step 1: Job Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <Input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Senior React Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                >
                  <option value="">— Select a category (optional) —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Type *</label>
                  <select
                    name="job_type"
                    value={formData.job_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode *</label>
                  <select
                    name="work_mode"
                    value={formData.work_mode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                  >
                    <option value="onsite">On-site</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                  <select
                    name="experience_level"
                    value={formData.experience_level}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                  >
                    <option value="">—</option>
                    <option value="entry">Entry</option>
                    <option value="mid">Mid</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Experience (years)</label>
                  <Input
                    type="number"
                    name="experience_min_years"
                    value={formData.experience_min_years}
                    onChange={handleInputChange}
                    placeholder="e.g. 2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Experience (years)</label>
                  <Input
                    type="number"
                    name="experience_max_years"
                    value={formData.experience_max_years}
                    onChange={handleInputChange}
                    placeholder="e.g. 5"
                    min="0"
                  />
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Job Description *</label>
                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={aiGenerating || !formData.title.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {aiGenerating ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> Generate with AI</>
                    )}
                  </button>
                </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
                <textarea
                  name="responsibilities"
                  value={formData.responsibilities}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                  placeholder="What the candidate will own and deliver day-to-day..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                  placeholder="List qualifications, experience, and skills required..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Job Locations *</label>
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

              {locations.length > 0 && (
                <div className="space-y-4">
                  {locations.map((loc, i) => (
                    <div key={i} className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                      {/* Card header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {loc.branch_id ? (
                            <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          ) : (
                            <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-orange-700 truncate">{loc.label}</span>
                          {loc.branch_id && (
                            <span className="text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded-full">
                              Branch
                            </span>
                          )}
                          {loc.is_primary && (
                            <span className="inline-flex items-center gap-1 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                              <Star className="w-3 h-3" /> Primary
                            </span>
                          )}
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

                      <div className="flex items-end gap-3">
                        <div className="w-32">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Openings</label>
                          <Input
                            type="number"
                            value={loc.openings}
                            onChange={(e) => updateLocationOpenings(i, e.target.value)}
                            placeholder="1"
                            min="0"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setPrimaryLocation(i)}
                          disabled={loc.is_primary}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            loc.is_primary
                              ? 'bg-orange-500 text-white cursor-default'
                              : 'bg-white text-orange-600 border border-orange-300 hover:bg-orange-100'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" />
                          {loc.is_primary ? 'Primary location' : 'Mark as primary'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Skills (optional) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">Skills are optional — you can add them later when editing the job.</p>

              {/* Search + select from catalog */}
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

              {/* Filtered catalog pills */}
              {skillInput.trim() && (() => {
                const filtered = availableSkills.filter((t) =>
                  t.name.toLowerCase().includes(skillInput.toLowerCase()) &&
                  !skills.some((s) => s.id === t.id)
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

              {/* Popular skills (when not searching) */}
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
                          skills.some((s) => s.id === tag.id)
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

              {/* Selected skills */}
              {skills.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected ({skills.length})
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Click the badge to toggle between <strong>Required</strong> and <strong>Nice-to-have</strong>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((tag) => {
                      const required = tag.is_required ?? true;
                      return (
                        <span
                          key={tag.id}
                          className={`inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-sm ${
                            required ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          <Tags className="w-3.5 h-3.5" />
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => toggleSkillRequired(tag.id)}
                            className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                              required
                                ? 'bg-white/20 hover:bg-white/30'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {required ? 'Required' : 'Nice-to-have'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSkill(tag)}
                            className={`ml-1 p-1 rounded-full ${
                              required ? 'hover:bg-white/20' : 'hover:bg-gray-300'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Salary */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">Salary information is optional.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Salary</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="number"
                      name="salary_min"
                      value={formData.salary_min || ''}
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
                      name="salary_max"
                      value={formData.salary_max || ''}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    name="salary_currency"
                    value={formData.salary_currency}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label>
                  <Input
                    type="date"
                    name="application_deadline"
                    value={formData.application_deadline}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.salary_disclosed}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, salary_disclosed: e.target.checked }))
                  }
                  className="mt-0.5 w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Show salary range to candidates</span>
                  <br />
                  <span className="text-xs text-gray-500">
                    Uncheck to keep the range private — it will still help our match algorithm but won't be displayed publicly.
                  </span>
                </span>
              </label>

              {(formData.salary_min > 0 || formData.salary_max > 0) && (
                <div className="p-4 bg-orange-50 rounded-xl">
                  <p className="text-sm text-orange-600">
                    <strong>Salary Range:</strong>{' '}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: formData.salary_currency,
                      maximumFractionDigits: 0,
                    }).format(formData.salary_min)}{' '}
                    -{' '}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: formData.salary_currency,
                      maximumFractionDigits: 0,
                    }).format(formData.salary_max)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : 'Save as Draft'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                >
                  {submitting ? 'Publishing…' : 'Publish Job'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Location Picker Modal */}
      {showPicker && (
        <LocationPicker
          onSelect={addLocation}
          onClose={() => setShowPicker(false)}
          branches={branches}
        />
      )}
    </motion.div>
  );
}
