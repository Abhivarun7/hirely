import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Users, Calendar, Globe, Linkedin, MapPin, Briefcase,
  ChevronLeft, Loader2, Bookmark,
} from 'lucide-react';
import { getPublicCompany, getPublicCompanyJobs } from '../../api/public';
import { API_BASE_URL } from '../../api/client';
import { formatSalary } from '../../lib/formatters';

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
const resolveAsset = (url?: string) =>
  !url ? '' : /^https?:\/\//i.test(url) ? url : `${ASSET_BASE_URL}${url}`;

interface CompanyProfile {
  _id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  description?: string;
  industry?: string;
  company_size?: string;
  founding_year?: number;
  website_url?: string;
  linkedin_url?: string;
}

interface CompanyJob {
  _id: string;
  title: string;
  job_type?: string;
  work_mode?: string;
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_disclosed?: boolean;
  locations?: { label?: string; city?: string }[];
  createdAt?: string;
  created_at?: string;
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setJobsLoading(true);
    setError(null);

    getPublicCompany(id)
      .then((res) => setCompany(res.data?.data ?? null))
      .catch(() => setError('Could not load this company.'))
      .finally(() => setLoading(false));

    getPublicCompanyJobs(id, { limit: 50 })
      .then((res) => setJobs(res.data?.data ?? []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false));
  }, [id]);

  return (
    <div className="glass-canvas relative min-h-[calc(100vh-4rem)] -mt-4 pt-4 pb-20 overflow-hidden">
      <span className="organic-shape bg-[#ff6b00] w-[500px] h-[500px] -top-24 -left-24" />
      <span className="organic-shape bg-[#c6c6c7] w-[400px] h-[400px] top-1/2 right-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-10 py-8">
        {loading ? (
          <>
            <div className="h-4 w-32 bg-white/40 rounded animate-pulse mb-4" />
            <div className="glass-card rounded-3xl h-56 animate-pulse" />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card rounded-3xl h-32 animate-pulse" />
              ))}
            </div>
          </>
        ) : error || !company ? (
          <div className="glass-card rounded-3xl p-12 text-center">
            <Building2 className="w-12 h-12 text-[#8e7164] mx-auto mb-3 opacity-60" />
            <h2 className="text-lg font-semibold text-[#1b1b1e]">Company not found</h2>
            <p className="text-sm text-[#5d5e60] mt-1">{error ?? 'This company may no longer be available.'}</p>
            <Link
              to="/seeker/companies"
              className="mt-4 inline-flex items-center gap-1 text-[#a04100] hover:underline font-semibold text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Back to companies
            </Link>
          </div>
        ) : (
          <>
            {/* Back link */}
            <Link
              to="/seeker/companies"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#5d5e60] hover:text-[#a04100] transition-colors mb-4"
            >
              <ChevronLeft className="w-4 h-4" /> All companies
            </Link>

            {/* Header card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-6 md:p-8"
            >
              <div className="flex items-start gap-5 flex-wrap">
                {company.logo_url ? (
                  <img
                    src={resolveAsset(company.logo_url)}
                    alt=""
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-contain bg-white/60 backdrop-blur-md border border-white/40 p-2 shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-[#ff6b00]/20 border border-white/40 flex items-center justify-center text-[#a04100] font-bold text-2xl flex-shrink-0">
                    {company.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#1b1b1e]">{company.name}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-[#5d5e60]">
                    {company.industry && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#8e7164]" /> {company.industry}
                      </span>
                    )}
                    {company.company_size && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#8e7164]" /> {company.company_size} employees
                      </span>
                    )}
                    {company.founding_year && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#8e7164]" /> Founded {company.founding_year}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-[#a04100] font-semibold">
                      <Briefcase className="w-4 h-4" />
                      {jobs.length} open {jobs.length === 1 ? 'role' : 'roles'}
                    </span>
                  </div>

                  {(company.website_url || company.linkedin_url) && (
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      {company.website_url && (
                        <a
                          href={company.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/40 border border-white/60 rounded-full text-sm text-[#1b1b1e] hover:bg-white/60 transition-all"
                        >
                          <Globe className="w-4 h-4 text-[#a04100]" /> Website
                        </a>
                      )}
                      {company.linkedin_url && (
                        <a
                          href={company.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/40 border border-white/60 rounded-full text-sm text-[#1b1b1e] hover:bg-white/60 transition-all"
                        >
                          <Linkedin className="w-4 h-4 text-[#a04100]" /> LinkedIn
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {company.description && (
                <div className="mt-6 pt-6 border-t border-white/30">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8e7164] mb-2">About</h2>
                  <p className="text-sm text-[#5d5e60] whitespace-pre-line leading-relaxed">
                    {company.description}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Jobs */}
            <section className="mt-8">
              <div className="flex items-end justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-[#1b1b1e]">Open roles at {company.name}</h2>
                <Link
                  to={`/seeker/jobs?company=${company._id}`}
                  className="text-sm font-semibold text-[#a04100] hover:underline"
                >
                  See in job search
                </Link>
              </div>

              {jobsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-card rounded-3xl h-36 animate-pulse" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="glass-card rounded-3xl p-10 text-center">
                  <Briefcase className="w-10 h-10 text-[#8e7164] mx-auto mb-3 opacity-60" />
                  <p className="text-sm text-[#5d5e60]">No open roles right now. Check back soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.map((job, idx) => {
                    const loc = (job.locations ?? [])
                      .map((l) => l.label ?? l.city ?? '')
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(', ');
                    const posted = job.createdAt ?? job.created_at;
                    const days = posted
                      ? Math.floor((Date.now() - new Date(posted).getTime()) / 86400000)
                      : null;
                    return (
                      <motion.div
                        key={job._id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                      >
                        <Link
                          to={`/seeker/jobs/${job._id}`}
                          className="block glass-card-floating p-5 rounded-3xl"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-[#1b1b1e] truncate">{job.title}</h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#5d5e60]">
                                {loc && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {loc}
                                  </span>
                                )}
                                {job.job_type && <span className="capitalize">{job.job_type.replace('_', ' ')}</span>}
                                {job.work_mode && <span className="capitalize">{job.work_mode}</span>}
                                {job.experience_level && <span className="capitalize">{job.experience_level}</span>}
                              </div>
                              <p className="text-sm text-[#a04100] font-semibold mt-2">
                                {formatSalary(
                                  job.salary_min,
                                  job.salary_max,
                                  job.salary_currency ?? 'INR',
                                  job.salary_disclosed
                                )}
                              </p>
                            </div>
                            <Bookmark className="w-4 h-4 text-[#8e7164] flex-shrink-0" />
                          </div>
                          {days !== null && (
                            <p className="text-xs text-[#5d5e60] mt-3 border-t border-white/30 pt-2">
                              {days <= 0 ? 'Just posted' : days === 1 ? '1 day ago' : `${days} days ago`}
                            </p>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {jobsLoading && jobs.length > 0 && (
                <div className="fixed bottom-4 right-4 glass-card rounded-full px-3 py-1.5 text-xs text-[#5d5e60] inline-flex items-center gap-1.5 z-30">
                  <Loader2 className="w-3 h-3 animate-spin" /> Updating…
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
