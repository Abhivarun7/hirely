import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as seekerApi from '../../api/seeker';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Clock,
  Building2,
  Bookmark,
  Share2,
  FileText,
  Send,
  Check,
  ChevronRight,
  Globe,
  Users,
  Calendar,
  TrendingUp,
} from 'lucide-react';

const formatJobType = (t: string) =>
  t ? t.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '';

const formatSalary = (min?: number, max?: number, currency?: string, disclosed?: boolean) => {
  if (disclosed === false) return 'Not Disclosed';
  if (!min && !max) return 'Competitive';
  const sym = currency === 'INR' ? '₹' : '$';
  const fmt = (n: number) => {
    if (currency === 'INR') {
      if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toString();
    }
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toString();
  };
  if (min && max) return `${sym}${fmt(min)} - ${sym}${fmt(max)}`;
  if (min) return `${sym}${fmt(min)}+`;
  return `Up to ${sym}${fmt(max!)}`;
};

const parseList = (val: unknown): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.split(/\n|(?=•)/).map((s) => s.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
  }
  return [];
};

const formatDeadline = (d: unknown) => {
  if (!d) return null;
  const date = new Date(d as string);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const emptyJob = {
  id: '',
  title: '',
  company: '',
  companySlug: '',
  companyLogo: '',
  companyWebsite: '',
  companyIndustry: '',
  location: '',
  salary: '',
  type: '',
  workMode: '',
  experience: '',
  experienceLevel: '',
  openings: 0,
  tags: [] as string[],
  skills: [] as { name: string; is_required: boolean }[],
  postedDays: 0,
  applicationDeadline: null as string | null,
  status: '',
  category: '',
  description: '',
  responsibilities: [] as string[],
  requirements: [] as string[],
  locations: [] as { label: string; city: string; country: string; address: string; openings: number }[],
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState(emptyJob);
  const [resumes, setResumes] = useState<{ id: string; name: string; default: boolean }[]>([]);
  const [activeTab, setActiveTab] = useState<'description' | 'skills' | 'requirements' | 'responsibilities' | 'locations'>('description');
  const [selectedResume, setSelectedResume] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;

    seekerApi.getJobById(id).then((jobRes) => {
      const j = jobRes.data?.data ?? jobRes.data ?? {};
      const deadline = formatDeadline(j.application_deadline);
      setJob({
        id: j._id ?? j.id ?? id,
        title: j.title ?? '',
        company: j.company_id?.name ?? '',
        companySlug: j.company_id?.slug ?? '',
        companyLogo: j.company_id?.logo_url ?? '',
        companyWebsite: j.company_id?.website_url ?? '',
        companyIndustry: j.company_id?.industry ?? '',
        location: (j.locations ?? []).map((l: any) => l.city ?? l.label ?? '').filter(Boolean).join(', '),
        salary: formatSalary(j.salary_min, j.salary_max, j.salary_currency, j.salary_disclosed),
        type: formatJobType(j.job_type),
        workMode: formatJobType(j.work_mode),
        experience:
          j.experience_min_years != null && j.experience_max_years != null
            ? `${j.experience_min_years} - ${j.experience_max_years} years`
            : j.experience_min_years != null
              ? `${j.experience_min_years}+ years`
              : '',
        experienceLevel: formatJobType(j.experience_level),
        openings: j.openings ?? 0,
        tags: (j.skills ?? []).map((s: any) => s.name ?? '').slice(0, 6),
        skills: (j.skills ?? []).map((s: any) => ({ name: s.name ?? '', is_required: s.is_required ?? true })),
        postedDays: Math.floor((Date.now() - new Date(j.created_at ?? j.createdAt ?? Date.now()).getTime()) / 86400000),
        applicationDeadline: deadline,
        status: formatJobType(j.status),
        category: j.category_id?.name ?? '',
        description: j.description ?? '',
        responsibilities: parseList(j.responsibilities),
        requirements: parseList(j.requirements),
        locations: (j.locations ?? []).map((l: any) => ({
          label: l.label ?? l.branch_id?.name ?? '',
          city: l.city ?? l.branch_id?.city ?? '',
          country: l.country ?? l.branch_id?.country ?? '',
          address: l.address ?? l.branch_id?.address ?? '',
          openings: l.openings ?? 0,
        })),
      });
      setSaved(Boolean(j.is_saved));
    }).catch((err) => {
      console.error('[JobDetail] API error:', err);
    });

    seekerApi.getProfile().then((profileRes) => {
      const profile = profileRes.data?.data ?? profileRes.data ?? {};
      const r: any[] = profile.resumes ?? [];
      const mapped = r.map((res: any) => ({
        id: res._id ?? res.id,
        name:
          res.original_name ??
          res.filename ??
          res.label ??
          res.file_url?.split('/').pop() ??
          res.url?.split('/').pop() ??
          'Resume',
        default: res.is_default ?? false,
      }));
      setResumes(mapped);
      setSelectedResume(mapped.find((r: any) => r.default)?.id ?? mapped[0]?.id ?? '');
    }).catch(() => {});
  }, [id]);

  const handleApply = async () => {
    if (!id || hasApplied) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      await seekerApi.applyToJob(id, {
        resume_id: selectedResume || undefined,
        cover_letter: coverLetter || undefined,
      });
      setHasApplied(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.data?.message ??
        'Could not submit your application. Please try again.';
      setApplyError(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      if (saved) {
        await seekerApi.unsaveJob(id);
        setSaved(false);
      } else {
        await seekerApi.saveJob(id);
        setSaved(true);
      }
    } catch {}
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/seeker/jobs/${job.id}`;
    const text = `${job.title} at ${job.company}`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };

  return (
    <div className="glass-canvas relative min-h-[calc(100vh-4rem)] -mt-4 pt-4 pb-20 overflow-hidden">
      <span className="organic-shape bg-[#ff6b00] w-[500px] h-[500px] -top-24 -left-24" />
      <span className="organic-shape bg-[#c6c6c7] w-[400px] h-[400px] top-1/2 right-0" />

      <motion.div
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-6xl mx-auto px-4 md:px-10 py-8 space-y-6"
      >
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[#5d5e60] hover:text-[#a04100] transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </button>

        {/* Job Header */}
        <div className="glass-card rounded-3xl p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 flex items-center justify-center text-[#a04100] font-bold text-2xl flex-shrink-0 shadow-sm overflow-hidden">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
              ) : (
                job.company.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#1b1b1e]">{job.title}</h1>
                  <Link
                    to={`/seeker/companies/${job.companySlug || job.company}`}
                    className="text-base text-[#5d5e60] mt-1 hover:text-[#a04100] transition-colors block"
                  >
                    {job.company}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-sm text-[#5d5e60]">
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#8e7164]" />
                        {job.location}
                      </span>
                    )}
                    {job.salary && (
                      <span className="inline-flex items-center gap-1.5 text-[#a04100] font-semibold">
                        {job.salary}
                      </span>
                    )}
                    {job.type && (
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-[#8e7164]" />
                        {job.type}
                      </span>
                    )}
                    {job.workMode && (
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#8e7164]" />
                        {job.workMode}
                      </span>
                    )}
                    {job.experience && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#8e7164]" />
                        {job.experience}
                      </span>
                    )}
                    {job.experienceLevel && (
                      <span className="inline-flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-[#8e7164]" />
                        {job.experienceLevel}
                      </span>
                    )}
                    {job.openings > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#8e7164]" />
                        {job.openings} {job.openings === 1 ? 'Opening' : 'Openings'}
                      </span>
                    )}
                    {job.applicationDeadline && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#8e7164]" />
                        Apply by {job.applicationDeadline}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#8e7164]" />
                      Posted {job.postedDays === 0 ? 'today' : `${job.postedDays}d ago`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSave}
                    className={`p-3 rounded-xl border transition-all ${
                      saved
                        ? 'bg-[#ff6b00]/15 border-[#ff6b00]/40 text-[#ff6b00] orange-glow'
                        : 'bg-white/40 border-white/60 text-[#5d5e60] hover:bg-white/60 hover:text-[#a04100]'
                    }`}
                    aria-label={saved ? 'Unsave job' : 'Save job'}
                  >
                    <Bookmark
                      className="w-5 h-5"
                      fill={saved ? 'currentColor' : 'none'}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-3 rounded-xl border bg-white/40 border-white/60 text-[#5d5e60] hover:bg-white/60 hover:text-[#a04100] transition-all"
                    aria-label="Share job"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-[#ff6b00]/10 text-[#a04100] border border-[#ff6b00]/20 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
                {job.status && (
                  <span className="px-3 py-1.5 bg-white/40 text-[#5d5e60] border border-white/60 rounded-full text-sm font-medium">
                    {job.status}
                  </span>
                )}
                {job.category && (
                  <span className="px-3 py-1.5 bg-white/40 text-[#5d5e60] border border-white/60 rounded-full text-sm font-medium">
                    {job.category}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="flex border-b border-white/30 overflow-x-auto no-scrollbar">
                {(['description', 'skills', 'requirements', 'responsibilities', 'locations'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 min-w-fit px-4 py-4 text-sm font-medium transition-colors capitalize whitespace-nowrap ${
                      activeTab === tab
                        ? 'text-[#a04100] border-b-2 border-[#ff6b00]'
                        : 'text-[#5d5e60] hover:text-[#1b1b1e]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {activeTab === 'description' && (
                  job.description ? (
                    <div className="whitespace-pre-line text-[#5d5e60] leading-relaxed">
                      {job.description}
                    </div>
                  ) : (
                    <p className="text-[#8e7164] italic">No description provided.</p>
                  )
                )}
                {activeTab === 'requirements' && (
                  job.requirements.length > 0 ? (
                    <ul className="space-y-3">
                      {job.requirements.map((req, index) => (
                        <li key={`req-${req}-${index}`} className="flex items-start gap-3 text-[#5d5e60]">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[#8e7164] italic">No requirements listed.</p>
                  )
                )}
                {activeTab === 'skills' && (
                  job.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill) => (
                        <span
                          key={`skill-${skill.name}`}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                            skill.is_required
                              ? 'bg-[#ff6b00]/10 text-[#a04100] border-[#ff6b00]/20'
                              : 'bg-white/40 text-[#5d5e60] border-white/60'
                          }`}
                        >
                          {skill.name}
                          {skill.is_required && <span className="ml-1 text-xs opacity-75">(Required)</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#8e7164] italic">No skills listed.</p>
                  )
                )}
                {activeTab === 'responsibilities' && (
                  job.responsibilities.length > 0 ? (
                    <ul className="space-y-3">
                      {job.responsibilities.map((r, index) => (
                        <li key={`resp-${r}-${index}`} className="flex items-start gap-3 text-[#5d5e60]">
                          <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[#8e7164] italic">No responsibilities listed.</p>
                  )
                )}
                {activeTab === 'locations' && (
                  job.locations.length > 0 ? (
                    <div className="space-y-3">
                      {job.locations.map((loc, index) => (
                        <div key={`loc-${loc.label || loc.city}-${index}`} className="p-4 bg-white/40 border border-white/50 rounded-2xl space-y-1">
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-[#ff6b00]" />
                            <span className="text-[#1b1b1e] font-semibold">{loc.label || loc.city}</span>
                          </div>
                          {loc.address && <p className="text-sm text-[#5d5e60] ml-8">{loc.address}</p>}
                          <p className="text-sm text-[#5d5e60] ml-8">
                            {[loc.city, loc.country].filter(Boolean).join(', ')}
                            {loc.openings > 0 && ` · ${loc.openings} opening${loc.openings > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#8e7164] italic">No locations listed.</p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Apply Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="glass-card rounded-3xl p-6 sticky top-8">
              {hasApplied ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-500/15 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1b1b1e] mb-2">Application Submitted!</h3>
                  <p className="text-sm text-[#5d5e60] mb-4">
                    Your application has been sent to {job.company}. They will review your profile and get back to you soon.
                  </p>
                  <Link
                    to="/seeker/applications"
                    className="inline-flex items-center gap-2 text-[#a04100] hover:text-[#ff6b00] font-semibold text-sm"
                  >
                    View all applications
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-[#1b1b1e] mb-4">Apply for this position</h3>

                  {/* Resume Selection */}
                  <div className="mb-4">
                    <label className="text-sm font-semibold text-[#5d5e60] mb-2 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Select Resume
                    </label>
                    {resumes.length === 0 ? (
                      <p className="text-sm text-[#8e7164] italic">
                        No resumes uploaded.{' '}
                        <Link to="/seeker/profile" className="text-[#a04100] hover:underline font-medium">
                          Upload one
                        </Link>{' '}
                        to apply.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {resumes.map((resume) => (
                          <label
                            key={resume.id}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                              selectedResume === resume.id
                                ? 'bg-white/60 border-[#ff6b00]/40'
                                : 'bg-white/30 border-white/50 hover:bg-white/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="resume"
                              value={resume.id}
                              checked={selectedResume === resume.id}
                              onChange={(e) => setSelectedResume(e.target.value)}
                              className="w-4 h-4 text-[#ff6b00] border-gray-300 focus:ring-[#ff6b00]"
                            />
                            <span className="text-sm text-[#1b1b1e] truncate">{resume.name}</span>
                            {resume.default && (
                              <span className="ml-auto text-[10px] uppercase tracking-wider text-[#a04100] font-bold">
                                Default
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cover Letter */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-[#5d5e60] mb-2">
                      Cover Letter (Optional)
                    </label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell the company why you're a great fit for this role..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/60 focus:ring-2 focus:ring-[#ff6b00]/40 focus:border-[#ff6b00] outline-none resize-none text-sm text-[#1b1b1e] placeholder:text-[#8e7164]"
                    />
                  </div>

                  {applyError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-700">
                      {applyError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={isApplying || hasApplied || resumes.length === 0}
                    className="w-full py-3.5 bg-[#ff6b00] text-white font-semibold rounded-2xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg orange-glow active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isApplying ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Apply Now
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Company Card */}
            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8e7164] mb-3">About the Company</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 flex items-center justify-center text-[#a04100] font-bold overflow-hidden shadow-sm">
                  {job.companyLogo ? (
                    <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
                  ) : (
                    job.company.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#1b1b1e] truncate">{job.company}</p>
                  {job.companyIndustry && <p className="text-sm text-[#5d5e60] truncate">{job.companyIndustry}</p>}
                </div>
              </div>
              <div className="space-y-3 text-sm text-[#5d5e60]">
                {job.companyWebsite && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#8e7164]" />
                    <a
                      href={job.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#a04100] hover:underline truncate"
                    >
                      {job.companyWebsite.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
