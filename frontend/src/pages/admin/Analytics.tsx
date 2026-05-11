import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  FileText,
  Building2,
  Download,
} from 'lucide-react';
import * as adminApi from '../../api/admin';

type Period = '7d' | '30d' | '90d' | '365d';

interface SeriesPoint {
  date: string;
  value: number;
}

interface OverviewState {
  totalUsers: number;
  totalCompanies: number;
  totalActiveJobs: number;
  totalApplications: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const STATUS_PALETTE: Record<string, { label: string; color: string }> = {
  applied: { label: 'Applied', color: '#ff6b00' },
  shortlisted: { label: 'Shortlisted', color: '#3b82f6' },
  interview_scheduled: { label: 'Interview', color: '#10b981' },
  offer_extended: { label: 'Offer', color: '#a855f7' },
  hired: { label: 'Hired', color: '#a04100' },
  rejected: { label: 'Rejected', color: '#94a3b8' },
  withdrawn: { label: 'Withdrawn', color: '#64748b' },
};

const APPROVAL_PALETTE: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: '#10b981' },
  pending: { label: 'Pending', color: '#ff6b00' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  suspended: { label: 'Suspended', color: '#a855f7' },
  banned: { label: 'Banned', color: '#1f2937' },
};

function toSeries(raw: any[]): SeriesPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d) => ({
    date: String(d._id ?? d.date ?? ''),
    value: Number(d.count ?? d.value ?? 0),
  }));
}

function shortDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('30d');
  const [overview, setOverview] = useState<OverviewState | null>(null);
  const [userGrowth, setUserGrowth] = useState<SeriesPoint[]>([]);
  const [jobPostings, setJobPostings] = useState<SeriesPoint[]>([]);
  const [applications, setApplications] = useState<SeriesPoint[]>([]);
  const [appsByStatus, setAppsByStatus] = useState<Array<{ key: string; count: number }>>([]);
  const [companiesByStatus, setCompaniesByStatus] = useState<Array<{ key: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [overviewRes, usersRes, jobsRes, appsRes, companiesRes] = await Promise.allSettled([
        adminApi.getOverviewAnalytics({ period }),
        adminApi.getUserAnalytics({ period }),
        adminApi.getJobAnalytics({ period }),
        adminApi.getApplicationAnalytics({ period }),
        adminApi.getCompanyAnalytics(),
      ]);
      if (cancelled) return;

      if (overviewRes.status === 'fulfilled') {
        const d: any = (overviewRes.value as any)?.data?.data ?? (overviewRes.value as any)?.data ?? {};
        setOverview({
          totalUsers: d.totalUsers ?? d.total_users ?? 0,
          totalCompanies: d.totalCompanies ?? d.total_companies ?? 0,
          totalActiveJobs: d.totalActiveJobs ?? d.total_active_jobs ?? d.totalJobs ?? d.total_jobs ?? 0,
          totalApplications: d.totalApplications ?? d.total_applications ?? 0,
        });
      }

      if (usersRes.status === 'fulfilled') {
        const list: any = (usersRes.value as any)?.data?.data ?? (usersRes.value as any)?.data ?? [];
        setUserGrowth(toSeries(list));
      }

      if (jobsRes.status === 'fulfilled') {
        const list: any = (jobsRes.value as any)?.data?.data ?? (jobsRes.value as any)?.data ?? [];
        setJobPostings(toSeries(list));
      }

      if (appsRes.status === 'fulfilled') {
        const payload: any = (appsRes.value as any)?.data?.data ?? (appsRes.value as any)?.data ?? {};
        setApplications(toSeries(payload.byDate ?? []));
        const byStatus: any[] = Array.isArray(payload.byStatus) ? payload.byStatus : [];
        setAppsByStatus(
          byStatus.map((s) => ({ key: String(s._id ?? 'unknown'), count: Number(s.count ?? 0) }))
        );
      }

      if (companiesRes.status === 'fulfilled') {
        const list: any = (companiesRes.value as any)?.data?.data ?? (companiesRes.value as any)?.data ?? [];
        setCompaniesByStatus(
          (Array.isArray(list) ? list : []).map((s: any) => ({
            key: String(s._id ?? 'unknown'),
            count: Number(s.count ?? 0),
          }))
        );
      }

      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const metrics = useMemo(
    () => [
      {
        label: 'Total Users',
        value: overview?.totalUsers ?? 0,
        icon: Users,
        accent: 'bg-blue-500/10 text-blue-500',
      },
      {
        label: 'Companies',
        value: overview?.totalCompanies ?? 0,
        icon: Building2,
        accent: 'bg-purple-500/10 text-purple-500',
      },
      {
        label: 'Active Jobs',
        value: overview?.totalActiveJobs ?? 0,
        icon: Briefcase,
        accent: 'bg-[#ff6b00]/10 text-[#a04100]',
      },
      {
        label: 'Applications',
        value: overview?.totalApplications ?? 0,
        icon: FileText,
        accent: 'bg-emerald-500/10 text-emerald-600',
      },
    ],
    [overview]
  );

  const appsTotal = useMemo(
    () => appsByStatus.reduce((s, e) => s + e.count, 0),
    [appsByStatus]
  );

  const handleExport = () => {
    const rows: Array<Record<string, string | number>> = [];
    userGrowth.forEach((p) => rows.push({ metric: 'new_users', date: p.date, value: p.value }));
    jobPostings.forEach((p) => rows.push({ metric: 'new_jobs', date: p.date, value: p.value }));
    applications.forEach((p) => rows.push({ metric: 'new_applications', date: p.date, value: p.value }));
    appsByStatus.forEach((s) => rows.push({ metric: 'applications_by_status', date: s.key, value: s.count }));
    companiesByStatus.forEach((s) => rows.push({ metric: 'companies_by_status', date: s.key, value: s.count }));
    if (overview) {
      rows.push({ metric: 'overview', date: 'total_users', value: overview.totalUsers });
      rows.push({ metric: 'overview', date: 'total_companies', value: overview.totalCompanies });
      rows.push({ metric: 'overview', date: 'total_active_jobs', value: overview.totalActiveJobs });
      rows.push({ metric: 'overview', date: 'total_applications', value: overview.totalApplications });
    }
    downloadCsv(`hirely-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl lg:text-[32px] font-semibold text-[#1b1b1e] tracking-tight">
            Platform Analytics
          </h1>
          <p className="text-[#5d5e60] mt-1 text-base">
            Monitor platform growth and user activity
          </p>
        </div>
        <div className="flex gap-3 self-start lg:self-auto">
          <div className="relative flex bg-white/40 backdrop-blur-xl p-1.5 rounded-xl border border-white/50 shadow-lg">
            <span className="specular-edge" />
            {(['7d', '30d', '90d', '365d'] as Period[]).map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    active
                      ? 'bg-white/90 text-[#a04100] shadow-sm orange-glow-bleed'
                      : 'text-[#5d5e60] hover:text-[#1b1b1e]'
                  }`}
                >
                  {p === '365d' ? '1y' : p}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-xl border border-white/50 rounded-xl hover:bg-white/60 transition-colors font-medium text-[#1b1b1e] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="glass-card-deep p-6 rounded-3xl group"
            >
              <span className="specular-edge" />
              <div className="flex justify-between items-start mb-4">
                <p className="text-[12px] font-semibold text-[#5d5e60] uppercase tracking-wider">
                  {metric.label}
                </p>
                <span className={`p-2 rounded-lg ${metric.accent}`}>
                  <Icon className="w-5 h-5" />
                </span>
              </div>
              <h3 className="text-4xl font-bold text-[#1b1b1e]">
                {loading ? '—' : metric.value.toLocaleString()}
              </h3>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          title="User Growth"
          subtitle="New users over time"
          data={userGrowth}
          color="#ff6b00"
          loading={loading}
        />
        <BarChart
          title="Job Postings"
          subtitle="New jobs over time"
          data={jobPostings}
          color="#3b82f6"
          loading={loading}
        />
        <BarChart
          title="Applications"
          subtitle="Submitted applications over time"
          data={applications}
          color="#10b981"
          loading={loading}
          className="lg:col-span-2"
        />
      </div>

      {/* Bottom row — real distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionPanel
          title="Applications by Status"
          subtitle="Pipeline breakdown in selected period"
          items={appsByStatus}
          palette={STATUS_PALETTE}
          total={appsTotal}
          loading={loading}
        />
        <DistributionPanel
          title="Companies by Approval Status"
          subtitle="Account status distribution"
          items={companiesByStatus}
          palette={APPROVAL_PALETTE}
          total={companiesByStatus.reduce((s, e) => s + e.count, 0)}
          loading={loading}
        />
      </div>
    </motion.div>
  );
}

// ──────────────────────────── Components ────────────────────────────

function BarChart({
  title,
  subtitle,
  data,
  color,
  loading,
  className,
}: {
  title: string;
  subtitle: string;
  data: SeriesPoint[];
  color: string;
  loading: boolean;
  className?: string;
}) {
  const max = data.length ? Math.max(...data.map((d) => d.value), 1) : 1;
  const labelEvery = Math.max(1, Math.ceil(data.length / 10));

  return (
    <motion.div
      variants={itemVariants}
      className={`glass-card-deep p-6 rounded-3xl ${className ?? ''}`}
    >
      <span className="specular-edge" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-[#1b1b1e]">{title}</h3>
          <p className="text-sm text-[#5d5e60]">{subtitle}</p>
        </div>
      </div>
      <div className="h-64 flex items-end gap-1">
        {loading ? (
          <p className="m-auto text-sm text-[#5d5e60]">Loading...</p>
        ) : data.length === 0 ? (
          <p className="m-auto text-sm text-[#5d5e60]">No data in this period.</p>
        ) : (
          data.map((point, index) => {
            const heightPercent = Math.max(2, (point.value / max) * 100);
            const showLabel = index % labelEvery === 0 || index === data.length - 1;
            return (
              <div
                key={`${point.date}-${index}`}
                className="flex-1 flex flex-col items-center gap-2 min-w-0 group"
                title={`${point.date}: ${point.value}`}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ delay: index * 0.02, duration: 0.5 }}
                  className="w-full rounded-t-md min-h-[4px] transition-opacity group-hover:opacity-80"
                  style={{
                    background: `linear-gradient(to top, ${color}, ${color}AA)`,
                    boxShadow: `0 0 12px ${color}40`,
                  }}
                />
                <span className="text-[10px] text-[#8b8c8e] truncate w-full text-center">
                  {showLabel ? shortDate(point.date) : ''}
                </span>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

function DistributionPanel({
  title,
  subtitle,
  items,
  palette,
  total,
  loading,
}: {
  title: string;
  subtitle: string;
  items: Array<{ key: string; count: number }>;
  palette: Record<string, { label: string; color: string }>;
  total: number;
  loading: boolean;
}) {
  const sorted = [...items].sort((a, b) => b.count - a.count);

  return (
    <motion.div variants={itemVariants} className="glass-card-deep p-6 rounded-3xl">
      <span className="specular-edge" />
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[#1b1b1e]">{title}</h3>
        <p className="text-sm text-[#5d5e60]">{subtitle}</p>
      </div>
      {loading ? (
        <p className="text-sm text-[#5d5e60]">Loading...</p>
      ) : sorted.length === 0 || total === 0 ? (
        <p className="text-sm text-[#5d5e60]">No data in this period.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((entry) => {
            const meta = palette[entry.key] ?? { label: entry.key, color: '#94a3b8' };
            const percent = total > 0 ? (entry.count / total) * 100 : 0;
            return (
              <div key={entry.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}80` }}
                    />
                    <span className="text-sm font-medium text-[#1b1b1e] capitalize">
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-sm text-[#5d5e60]">
                    <span className="font-semibold text-[#1b1b1e]">{entry.count.toLocaleString()}</span>{' '}
                    · {percent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden border border-white/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}60` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
