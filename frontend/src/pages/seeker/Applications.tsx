import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as seekerApi from '../../api/seeker';

type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offer_extended'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  logo: string;
  location: string;
  status: ApplicationStatus;
  appliedDate: string;
  updatedDate: string;
  resume: string;
}

const statusConfig: Record<ApplicationStatus, { label: string; pill: string; icon: string }> = {
  applied: {
    label: 'Applied',
    pill: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    icon: 'hourglass_empty',
  },
  reviewed: {
    label: 'Reviewed',
    pill: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
    icon: 'pending',
  },
  shortlisted: {
    label: 'Shortlisted',
    pill: 'bg-green-500/10 text-green-700 border-green-500/20',
    icon: 'check_circle',
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    pill: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    icon: 'event',
  },
  offer_extended: {
    label: 'Offer Extended',
    pill: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    icon: 'workspace_premium',
  },
  hired: {
    label: 'Hired',
    pill: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    icon: 'celebration',
  },
  rejected: {
    label: 'Not Selected',
    pill: 'bg-red-500/10 text-red-700 border-red-500/20',
    icon: 'cancel',
  },
  withdrawn: {
    label: 'Withdrawn',
    pill: 'bg-white/40 text-[#5d5e60] border-white/60',
    icon: 'undo',
  },
};

const FALLBACK_STATUS_CONFIG = {
  label: 'Unknown',
  pill: 'bg-white/40 text-[#5d5e60] border-white/60',
  icon: 'help',
};

const statusFilters: { value: ApplicationStatus | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'list' },
  { value: 'applied', label: 'Applied', icon: 'hourglass_empty' },
  { value: 'reviewed', label: 'Reviewed', icon: 'pending' },
  { value: 'shortlisted', label: 'Shortlisted', icon: 'check_circle' },
  { value: 'interview_scheduled', label: 'Interview', icon: 'event' },
  { value: 'offer_extended', label: 'Offer', icon: 'workspace_premium' },
  { value: 'hired', label: 'Hired', icon: 'celebration' },
  { value: 'rejected', label: 'Not Selected', icon: 'cancel' },
  { value: 'withdrawn', label: 'Withdrawn', icon: 'undo' },
];

export default function Applications() {
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const [withdrawModal, setWithdrawModal] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    seekerApi.getApplications().then((res) => {
      const apps: any[] = res.data?.data ?? res.data ?? [];
      setApplications(apps.map((a: any) => ({
        id: a._id ?? a.id,
        jobId: a.job_id?._id ?? a.job_id ?? '',
        jobTitle: a.job_id?.title ?? '',
        company: a.job_id?.company_id?.name ?? '',
        logo: (a.job_id?.company_id?.name ?? 'C').substring(0, 2).toUpperCase(),
        location: (a.job_id?.locations ?? []).map((l: any) => l.label ?? l.city ?? '').join(', '),
        status: a.status ?? 'applied',
        appliedDate: a.applied_at ?? a.createdAt ?? new Date().toISOString(),
        updatedDate: a.updated_at ?? a.applied_at ?? new Date().toISOString(),
        resume:
          a.resume_id?.original_name ??
          a.resume_id?.filename ??
          a.resume_id?.label ??
          a.resume_id?.file_url?.split('/').pop() ??
          '',
      })));
    }).catch(() => {});
  }, []);

  const filteredApplications = applications.filter(
    (app) => filter === 'all' || app.status === filter
  );

  const handleWithdraw = async (id: string) => {
    try {
      await seekerApi.withdrawApplication(id);
      setApplications(applications.map((app) =>
        app.id === id ? { ...app, status: 'withdrawn' as ApplicationStatus, updatedDate: new Date().toISOString() } : app
      ));
    } catch {}
    setWithdrawModal(null);
  };

  const countBy = (s: ApplicationStatus) => applications.filter((a) => a.status === s).length;
  const statusCounts: Record<ApplicationStatus | 'all', number> = {
    all: applications.length,
    applied: countBy('applied'),
    reviewed: countBy('reviewed'),
    shortlisted: countBy('shortlisted'),
    interview_scheduled: countBy('interview_scheduled'),
    offer_extended: countBy('offer_extended'),
    hired: countBy('hired'),
    rejected: countBy('rejected'),
    withdrawn: countBy('withdrawn'),
  };

  return (
    <div className="glass-canvas relative min-h-[calc(100vh-4rem)] -mt-4 pt-4 pb-20 overflow-hidden">
      <span className="organic-shape bg-[#ff6b00] w-[500px] h-[500px] -top-24 -left-24" />
      <span className="organic-shape bg-[#c6c6c7] w-[400px] h-[400px] top-1/2 right-0" />

      <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-10 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#1b1b1e] flex items-center gap-3">
            <span className="material-symbols-outlined text-[#a04100] text-[36px]">description</span>
            My Applications
          </h1>
          <p className="text-base text-[#5d5e60] mt-1">Track the progress of your job applications</p>
        </div>

        {/* Filter tabs */}
        <div className="glass-card rounded-3xl p-2 flex flex-wrap gap-2">
          {statusFilters.map(({ value, label, icon }) => {
            const isActive = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`px-3.5 py-2 rounded-2xl text-sm font-semibold transition-all inline-flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#ff6b00] text-white border-[#ff6b00] orange-glow'
                    : 'bg-white/40 text-[#5d5e60] border-white/60 hover:bg-white/60 hover:text-[#a04100]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                {label}
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-white/60 text-[#1b1b1e]'
                  }`}
                >
                  {statusCounts[value]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Applications list */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="glass-card rounded-3xl text-center py-16">
              <span className="material-symbols-outlined text-6xl text-[#8e7164] opacity-60">inbox</span>
              <h3 className="text-lg font-semibold text-[#1b1b1e] mt-4">No applications found</h3>
              <p className="text-sm text-[#5d5e60] mt-2">
                You haven't applied to any jobs matching this filter yet.
              </p>
              <Link
                to="/seeker/jobs"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white font-semibold text-sm rounded-2xl mt-6 hover:brightness-110 active:scale-95 orange-glow transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
                Browse Jobs
              </Link>
            </div>
          ) : (
            filteredApplications.map((application) => {
              const config = statusConfig[application.status] ?? FALLBACK_STATUS_CONFIG;
              const canWithdraw = !['withdrawn', 'rejected', 'hired'].includes(application.status);

              return (
                <div
                  key={application.id}
                  className="glass-card-floating rounded-3xl p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 flex items-center justify-center text-[#a04100] font-bold text-xl flex-shrink-0 shadow-sm">
                      {application.logo}
                    </div>

                    {/* Main */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-[#1b1b1e]">{application.jobTitle || 'Untitled Role'}</h3>
                          <p className="text-sm text-[#5d5e60]">{application.company || '—'}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-[#5d5e60]">
                            {application.location && (
                              <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-[#8e7164]">location_on</span>
                                {application.location}
                              </span>
                            )}
                            {application.resume && (
                              <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-[#8e7164]">attach_file</span>
                                {application.resume}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${config.pill}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{config.icon}</span>
                          {config.label}
                        </span>
                      </div>

                      {/* Timeline */}
                      {application.status !== 'withdrawn' && application.status !== 'rejected' && (() => {
                        const stages: { key: ApplicationStatus; label: string }[] = [
                          { key: 'applied', label: 'Applied' },
                          { key: 'reviewed', label: 'Reviewed' },
                          { key: 'shortlisted', label: 'Shortlisted' },
                          { key: 'interview_scheduled', label: 'Interview' },
                          { key: 'offer_extended', label: 'Offer' },
                          { key: 'hired', label: 'Hired' },
                        ];
                        const currentIdx = stages.findIndex((s) => s.key === application.status);
                        return (
                          <div className="mt-6 flex items-center gap-1">
                            {stages.map((stage, idx) => {
                              const reached = currentIdx >= idx;
                              const isCurrent = idx === currentIdx;
                              const isLast = idx === stages.length - 1;
                              return (
                                <div key={stage.key} className="flex items-center flex-1">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                      reached
                                        ? `bg-[#ff6b00] text-white ${isCurrent ? 'orange-glow ring-2 ring-[#ff6b00]/30' : ''}`
                                        : 'bg-white/60 border border-white/60 text-[#8e7164]'
                                    }`}
                                    title={stage.label}
                                  >
                                    {reached ? (
                                      <span
                                        className="material-symbols-outlined text-[16px]"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                      >
                                        check
                                      </span>
                                    ) : (
                                      <span className="text-xs font-semibold">{idx + 1}</span>
                                    )}
                                  </div>
                                  {!isLast && (
                                    <div
                                      className={`h-1 flex-1 rounded-full ${
                                        currentIdx > idx ? 'bg-[#ff6b00]' : 'bg-white/60'
                                      }`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Dates */}
                      <div className="flex items-center flex-wrap gap-4 mt-4 text-xs text-[#8e7164]">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          Applied{' '}
                          {new Date(application.appliedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        {application.updatedDate !== application.appliedDate && (
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">update</span>
                            Updated{' '}
                            {new Date(application.updatedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/30">
                    <Link
                      to={`/seeker/jobs/${application.jobId}`}
                      className="text-sm text-[#a04100] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      View Job Details
                    </Link>
                    {canWithdraw && (
                      <button
                        type="button"
                        onClick={() => setWithdrawModal(String(application.id))}
                        className="text-sm text-[#5d5e60] hover:text-red-600 font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">undo</span>
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Withdraw modal */}
      {withdrawModal !== null && (
        <>
          <div
            onClick={() => setWithdrawModal(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl border border-[#e2bfb0]/40 z-50 p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1b1b1e]">Withdraw Application?</h3>
                <p className="text-sm text-[#8e7164]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-[#5d5e60] mb-6">
              Are you sure you want to withdraw your application for this position? You can always apply again
              if the job is still available.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWithdrawModal(null)}
                className="flex-1 px-4 py-2.5 border border-[#e2bfb0] text-[#1b1b1e] font-semibold rounded-xl hover:bg-[#fbf9fc] transition-colors inline-flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleWithdraw(withdrawModal)}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors inline-flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">undo</span>
                Withdraw
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
