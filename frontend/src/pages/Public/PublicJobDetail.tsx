import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPublicJob } from '../../api/public';
import { useAuthStore } from '../../store/authStore';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Clock,
  Building2,
  Bookmark,
  Share2,
  Send,
  Check,
  ChevronRight,
  Globe,
  Users,
  Calendar,
  TrendingUp,
  LogIn,
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

export default function PublicJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [job, setJob] = useState(emptyJob);
  const [activeTab, setActiveTab] = useState<'description' | 'skills' | 'requirements' | 'responsibilities' | 'locations'>('description');

  // Determine user role for button logic
  const isSeeker = isAuthenticated && user?.role === 'job_seeker';
  const isCompanyUser = isAuthenticated && ['company_owner', 'hr_manager', 'recruiter', 'viewer'].includes(user?.role ?? '');

  useEffect(() => {
    if (!id) return;

    getPublicJob(id).then((jobRes) => {
      const j = jobRes.data?.data ?? jobRes.data ?? {};
      const deadline = formatDeadline(j.application_deadline);
      setJob({
        id: j._id ?? j.id ?? id,
        title: j.title ?? '',
        company: j.company_id?.name ?? j.company?.name ?? '',
        companySlug: j.company_id?.slug ?? j.company?.slug ?? '',
        companyLogo: j.company_id?.logo_url ?? j.company?.logo_url ?? '',
        companyWebsite: j.company_id?.website_url ?? j.company?.website_url ?? '',
        companyIndustry: j.company_id?.industry ?? j.company?.industry ?? '',
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
    }).catch((err) => {
      console.error('[PublicJobDetail] API error:', err);
    });
  }, [id]);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.03)] fixed top-0 w-full z-50">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-black tracking-tighter text-orange-600">Hirely</span>
          </Link>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <Link
                to={isSeeker ? '/seeker/dashboard' : isCompanyUser ? '/company/dashboard' : '/'}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors font-medium text-sm"
              >
                <span className="material-symbols-outlined text-lg">dashboard</span>
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-zinc-600 hover:text-orange-600 font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <motion.div
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto space-y-6 pt-24 px-6 pb-12"
      >
        {/* Back Button */}
        <motion.button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </motion.button>

        {/* Job Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center text-orange-600 font-bold text-2xl flex-shrink-0">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain rounded-2xl" />
              ) : (
                job.company.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                  <p className="text-lg text-gray-600 mt-1">{job.company}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                    {job.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {job.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                      {job.salary}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      {job.type}
                    </span>
                    {job.workMode && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {job.workMode}
                      </span>
                    )}
                    {job.experience && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {job.experience}
                      </span>
                    )}
                    {job.experienceLevel && (
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        {job.experienceLevel}
                      </span>
                    )}
                    {job.openings > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-gray-400" />
                        {job.openings} {job.openings === 1 ? 'Opening' : 'Openings'}
                      </span>
                    )}
                    {job.applicationDeadline && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        Apply by {job.applicationDeadline}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Posted {job.postedDays} days ago
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="p-3 border border-gray-200 rounded-xl text-gray-500 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                    <Bookmark className="w-5 h-5" />
                  </button>
                  <button className="p-3 border border-gray-200 rounded-xl text-gray-500 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {job.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium">
                    {tag}
                  </span>
                ))}
                {job.status && (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                    {job.status}
                  </span>
                )}
                {job.category && (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                {(['description', 'skills', 'requirements', 'responsibilities', 'locations'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-4 text-sm font-medium transition-colors capitalize ${
                      activeTab === tab
                        ? 'text-orange-600 border-b-2 border-orange-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {activeTab === 'description' && (
                  <div className="prose prose-gray max-w-none">
                    {job.description ? (
                      <div className="whitespace-pre-line text-gray-600 leading-relaxed">
                        {job.description}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">No description provided.</p>
                    )}
                  </div>
                )}
                {activeTab === 'requirements' && (
                  job.requirements.length > 0 ? (
                    <ul className="space-y-3">
                      {job.requirements.map((req, index) => (
                        <li key={`req-${req}-${index}`} className="flex items-start gap-3 text-gray-600">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No requirements listed.</p>
                  )
                )}
                {activeTab === 'skills' && (
                  job.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill) => (
                        <span
                          key={`skill-${skill.name}`}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            skill.is_required
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-blue-50 text-blue-600 border border-blue-200'
                          }`}
                        >
                          {skill.name}
                          {skill.is_required && <span className="ml-1 text-xs opacity-75">(Required)</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No skills listed.</p>
                  )
                )}
                {activeTab === 'responsibilities' && (
                  job.responsibilities.length > 0 ? (
                    <ul className="space-y-3">
                      {job.responsibilities.map((r, index) => (
                        <li key={`resp-${r}-${index}`} className="flex items-start gap-3 text-gray-600">
                          <Check className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No responsibilities listed.</p>
                  )
                )}
                {activeTab === 'locations' && (
                  job.locations.length > 0 ? (
                    <div className="space-y-3">
                      {job.locations.map((loc, index) => (
                        <div key={`loc-${loc.label || loc.city}-${index}`} className="p-4 bg-gray-50 rounded-xl space-y-1">
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-orange-500" />
                            <span className="text-gray-900 font-medium">{loc.label || loc.city}</span>
                          </div>
                          {loc.address && <p className="text-sm text-gray-500 ml-8">{loc.address}</p>}
                          <p className="text-sm text-gray-500 ml-8">
                            {[loc.city, loc.country].filter(Boolean).join(', ')}
                            {loc.openings > 0 && ` · ${loc.openings} opening${loc.openings > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No locations listed.</p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply / Login Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              {isSeeker ? (
                // Logged-in seeker: redirect to authenticated job detail to apply
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Apply for this position</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    View full details and apply through your seeker portal.
                  </p>
                  <Link
                    to={`/seeker/jobs/${job.id}`}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Apply Now
                  </Link>
                </>
              ) : (
                // Not logged in or company user: show login prompt
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {isCompanyUser ? 'Switch Account' : 'Interested in this role?'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {isCompanyUser
                      ? 'You are logged in as a company. Sign in with a job seeker account to apply.'
                      : 'Sign in or create an account to apply for this position.'}
                  </p>
                  <Link
                    to="/login"
                    className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-5 h-5" />
                    {isCompanyUser ? 'Login' : 'Login to Apply'}
                  </Link>
                  {!isAuthenticated && (
                    <Link
                      to="/register"
                      className="w-full mt-3 py-3 border-2 border-orange-200 text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                    >
                      Create Free Account
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Company Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">About the Company</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-bold overflow-hidden">
                  {job.companyLogo ? (
                    <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
                  ) : (
                    job.company.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{job.company}</p>
                  {job.companyIndustry && <p className="text-sm text-gray-500">{job.companyIndustry}</p>}
                </div>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                {job.companyWebsite && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline truncate">
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