import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companyEndpoints, type DashboardStats } from '@/api/company';

type Period = '7d' | '30d' | '90d';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('7d');
  const [companyName, setCompanyName] = useState('');
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [statsRes, profileRes] = await Promise.all([
          companyEndpoints.getDashboardStats(period),
          companyEndpoints.getProfile(),
        ]);
        if (cancelled) return;
        const stats = ((statsRes.data as any)?.data ?? statsRes.data) as DashboardStats;
        setData(stats);
        const p = (profileRes.data as any)?.data ?? profileRes.data ?? {};
        setCompanyName(p.name ?? '');
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 pb-24"
    >
      {/* Page header + range selector */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6"
      >
        <div>
          <h2 className="text-3xl lg:text-[32px] font-semibold text-[#1b1b1e] tracking-tight">
            Company Dashboard
          </h2>
          <p className="text-[#5d5e60] mt-1 text-base">
            Welcome back{companyName ? `, ${companyName}` : ''}. Here's what's happening today.
          </p>
        </div>
        <div className="relative flex bg-white/40 backdrop-blur-xl p-1.5 rounded-xl border border-white/50 shadow-lg self-start lg:self-auto">
          <span className="specular-edge" />
          {(['7d', '30d', '90d'] as Period[]).map((p) => {
            const active = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                  active
                    ? 'bg-white/90 text-[#a04100] shadow-sm orange-glow-bleed'
                    : 'text-[#5d5e60] hover:text-[#1b1b1e]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* KPI cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <KpiTotalApplicants
          value={data?.totalApplicants ?? 0}
          delta={data?.applicantsDelta ?? 0}
          trend={data?.applicantsTrend ?? []}
          loading={loading}
        />
        <KpiActiveJobs
          value={data?.activeJobs ?? 0}
          closingThisWeek={data?.closingThisWeek ?? 0}
          loading={loading}
        />
        <KpiMonthlyViews value={data?.monthlyViews ?? 0} loading={loading} />
        <KpiTimeToHire
          value={data?.avgTimeToHire ?? 0}
          delta={data?.timeToHireDelta ?? 0}
          loading={loading}
        />
      </motion.div>

      {/* Pipeline + Donut */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PipelineFunnel pipeline={data?.pipeline} loading={loading} />
        <CandidateDonut breakdown={data?.statusBreakdown ?? {}} loading={loading} />
      </motion.div>

      {/* Top jobs / Today's interviews / AI Insights teaser */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopPerformingJobs jobs={data?.topJobs ?? []} loading={loading} />
        <TodayInterviews interviews={data?.todayInterviews ?? []} loading={loading} />
        <AIInsightsTeaser onExplore={() => navigate('/company/insights')} />
      </motion.div>

      {/* Attention + Branch distribution */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NeedingAttention items={data?.needingAttention ?? []} loading={loading} />
        <BranchDistribution branches={data?.branchDistribution ?? []} loading={loading} />
      </motion.div>

      {/* Floating new-job button */}
      <Link
        to="/company/jobs/create"
        className="fixed bottom-10 right-10 w-16 h-16 bg-[#ff6b00] text-white rounded-full shadow-2xl active-glow-strong flex items-center justify-center transition-all hover:scale-110 active:scale-95 group z-40"
        aria-label="New job posting"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
        <span className="absolute right-full mr-4 px-4 py-2 bg-[#303033]/90 backdrop-blur-md text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/20">
          New Job Posting
        </span>
      </Link>
    </motion.div>
  );
}

// ───────────────────────────── KPI cards ─────────────────────────────

function KpiCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card-deep p-6 rounded-3xl group">
      <span className="specular-edge" />
      {children}
    </div>
  );
}

function KpiTotalApplicants({
  value,
  delta,
  trend,
  loading,
}: {
  value: number;
  delta: number;
  trend: number[];
  loading: boolean;
}) {
  const max = Math.max(1, ...trend);
  return (
    <KpiCard>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[12px] font-semibold text-[#5d5e60] uppercase tracking-wider">
          Total Applicants
        </p>
        <span className="p-2 bg-[#ff6b00]/10 rounded-lg text-[#a04100] material-symbols-outlined orange-glow-bleed">
          trending_up
        </span>
      </div>
      <div className="flex items-baseline gap-3 mb-4">
        <h3 className="text-4xl font-bold text-[#1b1b1e]">{loading ? '—' : value.toLocaleString()}</h3>
        {!loading && delta !== 0 && (
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm ${
              delta >= 0
                ? 'text-emerald-600 bg-emerald-50/50 border-emerald-500/20'
                : 'text-red-600 bg-red-50/50 border-red-500/20'
            }`}
          >
            {delta >= 0 ? '+' : ''}
            {delta}%
          </span>
        )}
      </div>
      <div className="w-full h-12 flex items-end gap-1">
        {trend.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 bg-[#ff6b00]/10 rounded-t" style={{ height: '20%' }} />
            ))
          : trend.map((v, i) => {
              const last = i === trend.length - 1;
              const h = Math.max(8, Math.round((v / max) * 100));
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${
                    last ? 'bg-[#ff6b00] active-glow-strong' : 'bg-[#ff6b00]/10 group-hover:bg-[#ff6b00]/20'
                  }`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
      </div>
    </KpiCard>
  );
}

function KpiActiveJobs({
  value,
  closingThisWeek,
  loading,
}: {
  value: number;
  closingThisWeek: number;
  loading: boolean;
}) {
  return (
    <KpiCard>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[12px] font-semibold text-[#5d5e60] uppercase tracking-wider">Active Jobs</p>
        <span className="p-2 bg-blue-500/10 rounded-lg text-blue-500 material-symbols-outlined">work</span>
      </div>
      <h3 className="text-4xl font-bold text-[#1b1b1e] mb-2">{loading ? '—' : value}</h3>
      <p className="text-xs text-[#5d5e60]">
        {closingThisWeek > 0
          ? `${closingThisWeek} closing this week`
          : 'No jobs closing this week'}
      </p>
      <div className="mt-4 h-2 w-full bg-black/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${Math.min(100, value > 0 ? Math.max(10, (value / Math.max(value, 50)) * 100) : 0)}%` }}
        />
      </div>
    </KpiCard>
  );
}

function KpiMonthlyViews({ value, loading }: { value: number; loading: boolean }) {
  return (
    <KpiCard>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[12px] font-semibold text-[#5d5e60] uppercase tracking-wider">Total Views</p>
        <span className="p-2 bg-purple-500/10 rounded-lg text-purple-500 material-symbols-outlined">
          visibility
        </span>
      </div>
      <h3 className="text-4xl font-bold text-[#1b1b1e] mb-2">{loading ? '—' : formatCount(value)}</h3>
      <p className="text-xs text-[#5d5e60]">Across all job postings</p>
      <div className="mt-4 flex -space-x-2">
        <div className="w-8 h-8 rounded-full border-2 border-white/50 bg-[#dfdfe1] backdrop-blur-sm" />
        <div className="w-8 h-8 rounded-full border-2 border-white/50 bg-[#e2e2e4] backdrop-blur-sm" />
        <div className="w-8 h-8 rounded-full border-2 border-white/50 bg-[#e2e2e2] backdrop-blur-sm" />
        <div className="w-8 h-8 rounded-full border-2 border-white/50 bg-[#ff6b00] flex items-center justify-center text-[10px] text-white font-bold active-glow-strong">
          {value > 1000 ? `${Math.round(value / 100) / 10}k` : value || 0}
        </div>
      </div>
    </KpiCard>
  );
}

function KpiTimeToHire({
  value,
  delta,
  loading,
}: {
  value: number;
  delta: number;
  loading: boolean;
}) {
  const message = delta > 0
    ? `Reduced by ${delta} ${delta === 1 ? 'day' : 'days'} vs prior period`
    : delta < 0
      ? `Up ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'day' : 'days'} vs prior period`
      : 'No change vs prior period';
  return (
    <KpiCard>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[12px] font-semibold text-[#5d5e60] uppercase tracking-wider">
          Avg Time-to-Hire
        </p>
        <span className="p-2 bg-orange-500/10 rounded-lg text-orange-500 material-symbols-outlined">
          timer
        </span>
      </div>
      <h3 className="text-4xl font-bold text-[#1b1b1e] mb-2">
        {loading ? '—' : value > 0 ? `${value}d` : '—'}
      </h3>
      <p className="text-xs text-[#5d5e60]">{value > 0 ? message : 'Need more hired candidates to compute'}</p>
      <div className="mt-4 h-2 w-full bg-black/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
          style={{ width: `${Math.min(100, Math.max(8, value * 2))}%` }}
        />
      </div>
    </KpiCard>
  );
}

// ───────────────────────────── Pipeline / Donut ─────────────────────────────

function PipelineFunnel({
  pipeline,
  loading,
}: {
  pipeline?: DashboardStats['pipeline'];
  loading: boolean;
}) {
  const tiers = useMemo(() => {
    const p = pipeline ?? { applied: 0, shortlisted: 0, interview: 0, offer: 0, hired: 0 };
    const max = Math.max(p.applied, 1);
    return [
      { label: 'Applied', count: p.applied, width: 100, fill: 'bg-[#ff6b00]/20', textColor: 'text-[#a04100]' },
      { label: 'Shortlisted', count: p.shortlisted, width: Math.max(8, (p.shortlisted / max) * 100), fill: 'bg-[#ff6b00]/40', textColor: 'text-white' },
      { label: 'Interview', count: p.interview, width: Math.max(6, (p.interview / max) * 100), fill: 'bg-[#ff6b00]/70', textColor: 'text-white' },
      { label: 'Offer', count: p.offer, width: Math.max(4, (p.offer / max) * 100), fill: 'bg-[#ff6b00] active-glow-strong', textColor: 'text-white' },
      { label: 'Hired', count: p.hired, width: Math.max(4, (p.hired / max) * 100), fill: 'bg-[#a04100] active-glow-strong', textColor: 'text-white' },
    ];
  }, [pipeline]);

  return (
    <div className="lg:col-span-2 glass-card-deep p-6 rounded-3xl">
      <span className="specular-edge" />
      <div className="flex justify-between items-center mb-8">
        <h4 className="text-xl font-semibold text-[#1b1b1e]">Application Pipeline</h4>
        <Link
          to="/company/applicants"
          className="text-[#5d5e60] hover:text-[#a04100] material-symbols-outlined transition-colors"
        >
          arrow_forward
        </Link>
      </div>
      <div className="space-y-4">
        {tiers.map((t) => (
          <div key={t.label} className="flex items-center gap-4">
            <div className="w-24 text-right text-sm font-medium text-[#5d5e60]">{t.label}</div>
            <div className="flex-1 h-12 bg-white/20 rounded-xl relative overflow-hidden border border-white/10">
              <div
                className={`absolute inset-y-0 left-0 ${t.fill} rounded-xl transition-all`}
                style={{ width: `${t.width}%` }}
              />
              <span
                className={`absolute top-1/2 -translate-y-1/2 font-bold ${t.textColor} drop-shadow-md`}
                style={{ left: `calc(${t.width}% - 60px)` }}
              >
                {loading ? '—' : t.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_PALETTE: Array<{ key: string; label: string; color: string; ring: string }> = [
  { key: 'applied', label: 'Applied', color: '#ff6b00', ring: 'shadow-[0_0_8px_rgba(255,107,0,0.4)]' },
  { key: 'shortlisted', label: 'Shortlisted', color: '#3b82f6', ring: 'shadow-[0_0_8px_rgba(59,130,246,0.4)]' },
  { key: 'interview_scheduled', label: 'Interview', color: '#10b981', ring: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]' },
  { key: 'offer_extended', label: 'Offer', color: '#a855f7', ring: 'shadow-[0_0_8px_rgba(168,85,247,0.4)]' },
  { key: 'hired', label: 'Hired', color: '#a04100', ring: 'shadow-[0_0_8px_rgba(160,65,0,0.4)]' },
  { key: 'rejected', label: 'Rejected', color: '#94a3b8', ring: '' },
];

function CandidateDonut({
  breakdown,
  loading,
}: {
  breakdown: Record<string, number>;
  loading: boolean;
}) {
  const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = STATUS_PALETTE.map((p) => {
    const value = breakdown[p.key] ?? 0;
    const portion = total > 0 ? value / total : 0;
    const length = circumference * portion;
    const segOffset = offset;
    offset += length;
    return { ...p, value, portion, length, segOffset };
  }).filter((s) => s.value > 0);

  return (
    <div className="glass-card-deep p-6 rounded-3xl flex flex-col">
      <span className="specular-edge" />
      <h4 className="text-xl font-semibold text-[#1b1b1e] mb-6">Candidate Distribution</h4>
      <div className="relative w-44 h-44 mx-auto mb-6">
        <svg viewBox="0 0 192 192" className="w-full h-full -rotate-90">
          <circle cx={96} cy={96} r={radius} fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth={20} />
          {segments.map((s, i) => (
            <circle
              key={s.key}
              cx={96}
              cy={96}
              r={radius}
              fill="transparent"
              stroke={s.color}
              strokeWidth={20}
              strokeDasharray={`${s.length} ${circumference - s.length}`}
              strokeDashoffset={-s.segOffset}
              className={i === 0 ? 'active-glow-strong' : ''}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-[#1b1b1e]">
            {loading ? '—' : formatCount(total)}
          </span>
          <span className="text-[10px] font-bold text-[#5d5e60] uppercase tracking-widest">Total</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        {segments.length === 0 ? (
          <p className="col-span-2 text-center text-sm text-[#5d5e60]">No applications yet</p>
        ) : (
          segments.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${s.ring}`}
                style={{ background: s.color }}
              />
              <span className="text-xs text-[#5d5e60]">
                {s.label} ({Math.round(s.portion * 100)}%)
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Top jobs / Interviews / AI ─────────────────────────────

function TopPerformingJobs({
  jobs,
  loading,
}: {
  jobs: DashboardStats['topJobs'];
  loading: boolean;
}) {
  return (
    <div className="glass-card-deep p-6 rounded-3xl flex flex-col">
      <span className="specular-edge" />
      <h4 className="text-xl font-semibold text-[#1b1b1e] mb-6">Top Performing Jobs</h4>
      <div className="space-y-4 flex-1">
        {loading ? (
          <p className="text-sm text-[#5d5e60]">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-[#5d5e60]">No jobs posted yet.</p>
        ) : (
          jobs.map((job) => (
            <Link
              key={job.id}
              to={`/company/jobs/${job.id}/applicants`}
              className="block p-4 rounded-2xl bg-white/20 border border-white/30 transition-all hover:bg-white/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#1b1b1e] truncate">{job.title}</p>
                  <p className="text-xs text-[#5d5e60] truncate">{job.location || 'Remote'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[#a04100]">{job.viewsCount} views</p>
                  <p className="text-xs text-[#5d5e60]">{job.applicantsCount} applicants</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
      <Link
        to="/company/jobs"
        className="block w-full mt-6 py-3 border border-[#ff6b00]/30 rounded-xl text-[#a04100] font-bold text-sm hover:bg-[#ff6b00]/10 transition-all text-center"
      >
        View All Jobs
      </Link>
    </div>
  );
}

function TodayInterviews({
  interviews,
  loading,
}: {
  interviews: DashboardStats['todayInterviews'];
  loading: boolean;
}) {
  const next = interviews[0];

  return (
    <div className="glass-card-deep p-6 rounded-3xl">
      <span className="specular-edge" />
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-xl font-semibold text-[#1b1b1e]">Today's Interviews</h4>
        <span className="text-xs font-bold text-[#a04100] bg-[#ff6b00]/10 px-2 py-1 rounded orange-glow-bleed">
          {interviews.length} Scheduled
        </span>
      </div>
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-[#5d5e60]">Loading...</p>
        ) : interviews.length === 0 ? (
          <p className="text-sm text-[#5d5e60]">No interviews scheduled today.</p>
        ) : (
          interviews.slice(0, 3).map((iv) => {
            const isNext = iv.id === next?.id;
            return (
              <div key={iv.id} className="flex gap-4">
                <div className="flex flex-col items-center pt-0.5">
                  <span className="text-sm font-bold text-[#1b1b1e]">
                    {formatTime(iv.interviewDate)}
                  </span>
                  <div className="w-px flex-1 bg-[#ff6b00]/20 my-1" />
                </div>
                <div
                  className={`flex-1 p-3 rounded-2xl backdrop-blur-md transition-all ${
                    isNext
                      ? 'bg-[#ff6b00]/5 border border-[#ff6b00]/20'
                      : 'bg-white/20 border border-white/30 hover:bg-white/40'
                  }`}
                >
                  <p className="font-bold text-[#1b1b1e] text-sm truncate">{iv.candidateName}</p>
                  <p className="text-xs text-[#5d5e60] truncate mb-2">{iv.jobTitle}</p>
                  {isNext && iv.locationOrLink && (
                    <a
                      href={iv.locationOrLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#ff6b00] text-white text-[11px] font-bold px-4 py-2 rounded-lg inline-flex items-center gap-2 active-glow-strong transition-all hover:brightness-110"
                    >
                      <span className="material-symbols-outlined text-sm">video_call</span>
                      Join Meeting
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AIInsightsTeaser({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="relative group h-full">
      <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
      <div className="relative glass-card-deep p-6 rounded-3xl h-full flex flex-col border-[#ff6b00]/30">
        <span className="specular-edge" />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#ff6b00] rounded-xl flex items-center justify-center active-glow-strong">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
          </div>
          <h4 className="text-xl font-semibold text-[#1b1b1e]">AI Insights</h4>
        </div>
        <div className="bg-[#ff6b00]/5 backdrop-blur-lg p-4 rounded-2xl border border-[#ff6b00]/20 mb-6 flex-1 shadow-inner">
          <p className="font-bold text-[#a04100] text-sm mb-2 orange-glow-bleed">
            Candidate match recommendations
          </p>
          <p className="text-sm text-[#1b1b1e] italic leading-relaxed">
            See AI-suggested seekers, nearby talent, and growing skills tailored to your open
            roles.
          </p>
        </div>
        <button
          onClick={onExplore}
          className="w-full py-4 bg-[#ff6b00] text-white font-bold rounded-2xl active-glow-strong hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          Explore Insights <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── Attention / Branches ─────────────────────────────

function NeedingAttention({
  items,
  loading,
}: {
  items: DashboardStats['needingAttention'];
  loading: boolean;
}) {
  return (
    <div className="glass-card-deep p-6 rounded-3xl">
      <span className="specular-edge" />
      <h4 className="text-xl font-semibold text-[#1b1b1e] mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-red-500">priority_high</span>
        Needing Attention
      </h4>
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-[#5d5e60]">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[#5d5e60]">All jobs are tracking well.</p>
        ) : (
          items.map((item) => {
            const isRed = item.type === 'no_applicants';
            return (
              <Link
                key={item.id}
                to={`/company/jobs/${item.id}/applicants`}
                className={`flex items-center justify-between p-3 rounded-xl border backdrop-blur-md transition-all ${
                  isRed
                    ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                    : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1b1b1e] truncate">{item.title}</p>
                  {item.location && <p className="text-xs text-[#5d5e60] truncate">{item.location}</p>}
                </div>
                <span
                  className={`text-xs font-bold shrink-0 ml-3 ${
                    isRed ? 'text-red-600' : 'text-amber-600'
                  }`}
                >
                  {isRed ? `0 Applicants (${item.days}d)` : `Stalled (${item.days}d)`}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function BranchDistribution({
  branches,
  loading,
}: {
  branches: DashboardStats['branchDistribution'];
  loading: boolean;
}) {
  return (
    <div className="glass-card-deep p-6 rounded-3xl relative overflow-hidden">
      <span className="specular-edge" />
      <h4 className="text-xl font-semibold text-[#1b1b1e] mb-6 relative z-10">
        Branch Distribution
      </h4>
      <div className="relative z-10 space-y-4">
        {loading ? (
          <p className="text-sm text-[#5d5e60]">Loading...</p>
        ) : branches.length === 0 ? (
          <p className="text-sm text-[#5d5e60]">
            No branch-level applications yet. Add branches and link them to jobs to track.
          </p>
        ) : (
          branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-[#5d5e60] truncate w-32 shrink-0">
                {b.name}
              </span>
              <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#a04100] orange-glow-bleed shadow-[0_0_10px_rgba(160,65,0,0.4)]"
                  style={{ width: `${b.percentage}%` }}
                />
              </div>
              <span className="text-sm font-extrabold text-[#1b1b1e] w-10 text-right shrink-0">
                {b.percentage}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
