import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Ticket,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import * as adminApi from '../../api/admin';

interface OverviewStats {
  totalUsers: number;
  totalCompanies: number;
  totalActiveJobs: number;
  totalApplications: number;
  recentApplications: RecentApplication[];
}

interface RecentApplication {
  _id?: string;
  status?: string;
  applied_at?: string;
  job_id?: { title?: string } | string;
}

interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  entity: string;
  time: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const quickActions = [
  { label: 'Add New Admin', icon: Plus, path: '/admin/admins', color: 'from-orange-500 to-orange-600' },
  { label: 'Review Tickets', icon: AlertCircle, path: '/admin/tickets?filter=open', color: 'from-blue-500 to-blue-600' },
  { label: 'View Analytics', icon: TrendingUp, path: '/admin/analytics', color: 'from-purple-500 to-purple-600' },
];

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function initials(text: string): string {
  const parts = text.split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'SY';
}

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [overviewRes, auditRes, pendingRes, ticketsRes] = await Promise.allSettled([
          adminApi.getAdminStats(),
          adminApi.getRecentActivity(6),
          adminApi.getCompanies({ status: 'pending', limit: 1, page: 1 }),
          adminApi.getTickets({ status: 'open', limit: 1, page: 1 }),
        ]);

        if (cancelled) return;

        if (overviewRes.status === 'fulfilled') {
          const d: any = (overviewRes.value as any)?.data ?? overviewRes.value ?? {};
          setStats({
            totalUsers: d.totalUsers ?? d.total_users ?? 0,
            totalCompanies: d.totalCompanies ?? d.total_companies ?? 0,
            totalActiveJobs: d.totalActiveJobs ?? d.total_active_jobs ?? d.totalJobs ?? d.total_jobs ?? 0,
            totalApplications: d.totalApplications ?? d.total_applications ?? 0,
            recentApplications: Array.isArray(d.recentApplications)
              ? d.recentApplications
              : Array.isArray(d.recent_applications)
                ? d.recent_applications
                : [],
          });
        }

        if (auditRes.status === 'fulfilled') {
          const raw: any[] = (auditRes.value as any)?.data ?? auditRes.value ?? [];
          setRecentActivity(
            raw.map((log: any, i: number) => {
              const actor =
                log.actor_id?.email ??
                log.user_id?.email ??
                log.actor ??
                'System';
              return {
                id: log._id ?? String(i),
                actor,
                action: String(log.action ?? '').replace(/_/g, ' '),
                entity: log.entity_type ?? '',
                time: formatTime(log.created_at ?? log.createdAt),
              };
            })
          );
        }

        if (pendingRes.status === 'fulfilled') {
          const p: any = pendingRes.value as any;
          setPendingApprovals(p?.data?.pagination?.total ?? p?.pagination?.total ?? 0);
        }

        if (ticketsRes.status === 'fulfilled') {
          const t: any = ticketsRes.value as any;
          setOpenTickets(t?.data?.pagination?.total ?? t?.pagination?.total ?? 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statsCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      accent: 'bg-blue-500/10 text-blue-500',
    },
    {
      label: 'Companies',
      value: stats?.totalCompanies ?? 0,
      icon: Building2,
      accent: 'bg-purple-500/10 text-purple-500',
    },
    {
      label: 'Active Jobs',
      value: stats?.totalActiveJobs ?? 0,
      icon: Briefcase,
      accent: 'bg-[#ff6b00]/10 text-[#a04100]',
    },
    {
      label: 'Applications',
      value: stats?.totalApplications ?? 0,
      icon: FileText,
      accent: 'bg-emerald-500/10 text-emerald-600',
    },
  ];

  const recentApps = stats?.recentApplications ?? [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl lg:text-[32px] font-semibold text-[#1b1b1e] tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-[#5d5e60] mt-1 text-base">
          Monitor platform activity and manage operations
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="glass-card-deep p-6 rounded-3xl group"
            >
              <span className="specular-edge" />
              <div className="flex justify-between items-start mb-4">
                <p className="text-[12px] font-semibold text-[#5d5e60] uppercase tracking-wider">
                  {stat.label}
                </p>
                <span className={`p-2 rounded-lg ${stat.accent}`}>
                  <Icon className="w-5 h-5" />
                </span>
              </div>
              <h3 className="text-4xl font-bold text-[#1b1b1e]">
                {loading ? '—' : stat.value.toLocaleString()}
              </h3>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Pending Approvals Alert (only if there are any) */}
      {!loading && pendingApprovals > 0 && (
        <motion.div variants={itemVariants}>
          <Link
            to="/admin/companies?status=pending"
            className="glass-card-deep block p-6 rounded-3xl group"
          >
            <span className="specular-edge" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#ff6b00]/10 rounded-2xl flex items-center justify-center text-[#a04100]">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1b1b1e]">
                    {pendingApprovals} pending {pendingApprovals === 1 ? 'approval' : 'approvals'}
                  </h3>
                  <p className="text-sm text-[#5d5e60]">
                    Companies waiting for verification
                  </p>
                </div>
              </div>
              <span className="px-4 py-2 bg-[#ff6b00] text-white rounded-xl font-medium active-glow-strong group-hover:scale-105 transition-transform">
                Review
              </span>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 glass-card-deep rounded-3xl overflow-hidden"
        >
          <span className="specular-edge" />
          <div className="p-6 border-b border-white/40 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#1b1b1e]">Recent Activity</h2>
            <Link
              to="/admin/audit-logs"
              className="text-sm text-[#a04100] hover:text-[#ff6b00] font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-white/40">
            {loading ? (
              <p className="p-6 text-sm text-[#5d5e60]">Loading...</p>
            ) : recentActivity.length === 0 ? (
              <p className="p-6 text-sm text-[#5d5e60]">No activity recorded yet.</p>
            ) : (
              recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#ff6b00]/20 to-[#ff6b00]/5 rounded-full flex items-center justify-center border border-white/40">
                      <span className="text-[#a04100] font-semibold text-xs">
                        {initials(activity.actor)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1b1b1e]">
                        <span className="font-semibold">{activity.actor}</span>{' '}
                        <span className="text-[#5d5e60]">{activity.action}</span>{' '}
                        {activity.entity && (
                          <span className="font-medium">{activity.entity}</span>
                        )}
                      </p>
                      {activity.time && (
                        <p className="text-xs text-[#8b8c8e] mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {activity.time}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Side column */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Quick Actions */}
          <div className="glass-card-deep p-6 rounded-3xl">
            <span className="specular-edge" />
            <h2 className="text-xl font-semibold text-[#1b1b1e] mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    to={action.path}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/30 hover:bg-white/50 border border-white/40 transition-all group"
                  >
                    <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-[#1b1b1e] text-sm">{action.label}</span>
                    <ArrowUpRight className="w-5 h-5 text-[#8b8c8e] ml-auto group-hover:translate-x-0.5 group-hover:text-[#ff6b00] transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Operational counters (real data only) */}
          <div className="glass-card-deep p-6 rounded-3xl">
            <span className="specular-edge" />
            <h2 className="text-xl font-semibold text-[#1b1b1e] mb-4">Operational</h2>
            <div className="space-y-3">
              <Link
                to="/admin/companies?status=pending"
                className="flex items-center gap-3 p-3 bg-white/30 hover:bg-white/50 border border-white/40 rounded-2xl transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center text-[#a04100]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1b1b1e]">Pending Approvals</p>
                  <p className="text-xs text-[#5d5e60]">Companies awaiting review</p>
                </div>
                <span className="text-lg font-bold text-[#1b1b1e]">
                  {loading ? '—' : pendingApprovals}
                </span>
              </Link>

              <Link
                to="/admin/tickets?status=open"
                className="flex items-center gap-3 p-3 bg-white/30 hover:bg-white/50 border border-white/40 rounded-2xl transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Ticket className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1b1b1e]">Open Tickets</p>
                  <p className="text-xs text-[#5d5e60]">Support tickets in queue</p>
                </div>
                <span className="text-lg font-bold text-[#1b1b1e]">
                  {loading ? '—' : openTickets}
                </span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Applications (real data from overview) */}
      <motion.div variants={itemVariants} className="glass-card-deep p-6 rounded-3xl">
        <span className="specular-edge" />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1b1b1e]">Recent Applications</h2>
          <Link
            to="/admin/jobs"
            className="text-sm text-[#a04100] hover:text-[#ff6b00] font-medium"
          >
            View jobs
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-[#5d5e60]">Loading...</p>
        ) : recentApps.length === 0 ? (
          <p className="text-sm text-[#5d5e60]">No applications in this period.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentApps.slice(0, 6).map((app, i) => {
              const title =
                typeof app.job_id === 'object' && app.job_id
                  ? app.job_id.title ?? 'Untitled role'
                  : 'Untitled role';
              const status = (app.status ?? 'applied').replace(/_/g, ' ');
              return (
                <div
                  key={app._id ?? i}
                  className="p-4 rounded-2xl bg-white/30 border border-white/40 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1b1b1e] truncate">{title}</p>
                    <p className="text-xs text-[#5d5e60] truncate capitalize">{status}</p>
                  </div>
                  <p className="text-xs text-[#8b8c8e] shrink-0">
                    {formatTime(app.applied_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
