import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as seekerApi from '../../api/seeker';
import { formatSalary } from '../../lib/formatters';

interface SavedJob {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  salary: string;
  type: string;
  tags: string[];
  postedDays: number;
  savedDate: string;
}

export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [removedId, setRemovedId] = useState<string | null>(null);

  useEffect(() => {
    seekerApi.getSavedJobs().then((res) => {
      const jobs: any[] = res.data?.data ?? res.data ?? [];
      setSavedJobs(jobs.map((j: any) => ({
        id: j._id ?? j.id,
        title: j.title ?? '',
        company: j.company_id?.name ?? '',
        logo: (j.company_id?.name ?? 'C').substring(0, 2).toUpperCase(),
        location: (j.locations ?? []).map((l: any) => l.label ?? l.city ?? '').join(', '),
        salary: formatSalary(j.salary_min, j.salary_max, j.salary_currency, j.salary_disclosed),
        type: j.job_type ?? 'Full-time',
        tags: (j.skills ?? []).map((s: any) => s.name ?? '').slice(0, 3),
        postedDays: Math.floor((Date.now() - new Date(j.created_at ?? j.createdAt ?? Date.now()).getTime()) / 86400000),
        savedDate: j.saved_at ?? j.createdAt ?? new Date().toISOString(),
      })));
    }).catch(() => {});
  }, []);

  const removeFromSaved = async (jobId: string) => {
    setRemovedId(jobId);
    try {
      await seekerApi.unsaveJob(jobId);
    } catch {}
    setTimeout(() => {
      setSavedJobs((prev) => prev.filter((job) => job.id !== jobId));
      setRemovedId(null);
    }, 300);
  };

  return (
    <div className="glass-canvas relative min-h-[calc(100vh-4rem)] -mt-4 pt-4 pb-20 overflow-hidden">
      <span className="organic-shape bg-[#ff6b00] w-[500px] h-[500px] -top-24 -left-24" />
      <span className="organic-shape bg-[#c6c6c7] w-[400px] h-[400px] top-1/2 right-0" />

      <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-10 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1b1b1e] flex items-center gap-3">
              <span
                className="material-symbols-outlined text-[#a04100] text-[36px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bookmark
              </span>
              Saved Jobs
            </h1>
            <p className="text-base text-[#5d5e60] mt-1">Jobs you've bookmarked for later</p>
          </div>
          <div className="glass-card rounded-2xl px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold text-[#1b1b1e]">
            <span
              className="material-symbols-outlined text-[#ff6b00]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bookmark
            </span>
            {savedJobs.length} {savedJobs.length === 1 ? 'job' : 'jobs'} saved
          </div>
        </div>

        {/* Grid */}
        {savedJobs.length === 0 ? (
          <div className="glass-card rounded-3xl text-center py-16">
            <span className="material-symbols-outlined text-6xl text-[#8e7164] opacity-60">bookmark_border</span>
            <h3 className="text-lg font-semibold text-[#1b1b1e] mt-4">No saved jobs yet</h3>
            <p className="text-sm text-[#5d5e60] mt-2">Start saving jobs that interest you to view them later.</p>
            <Link
              to="/seeker/jobs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-semibold text-sm rounded-2xl mt-6 hover:brightness-110 active:scale-95 orange-glow transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {savedJobs.map((job) => (
              <div
                key={job.id}
                className={`glass-card-floating rounded-3xl p-6 transition-all ${
                  removedId === String(job.id) ? 'opacity-0 scale-95' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 flex items-center justify-center text-[#a04100] font-bold text-lg shrink-0 shadow-sm">
                      {job.logo}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#1b1b1e] truncate">{job.title || 'Untitled Role'}</h3>
                      <p className="text-sm text-[#5d5e60] truncate">{job.company || '—'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromSaved(job.id)}
                    className="p-2 text-[#5d5e60] hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                    title="Remove from saved"
                    aria-label="Remove from saved"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#5d5e60] mb-4">
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#8e7164]">location_on</span>
                      {job.location}
                    </span>
                  )}
                  {job.salary && (
                    <span className="inline-flex items-center gap-1 text-[#a04100] font-semibold">
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                      {job.salary}
                    </span>
                  )}
                  {job.type && (
                    <span className="inline-flex items-center gap-1 capitalize">
                      <span className="material-symbols-outlined text-[16px] text-[#8e7164]">schedule</span>
                      {job.type.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {job.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 bg-[#ff6b00]/10 text-[#a04100] border border-[#ff6b00]/20 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/30">
                  <span className="text-xs text-[#8e7164] inline-flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      bookmark
                    </span>
                    Saved {new Date(job.savedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {job.postedDays > 0 && (
                      <span className="ml-2 text-[#5d5e60]">
                        · Posted {job.postedDays === 1 ? '1d' : `${job.postedDays}d`} ago
                      </span>
                    )}
                  </span>
                  <Link
                    to={`/seeker/jobs/${job.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white text-sm font-semibold rounded-2xl hover:brightness-110 active:scale-95 orange-glow transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    Apply Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
