import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Users,
  MapPin,
  Briefcase,
  TrendingUp,
  Loader2,
  Wand2,
  AlertCircle,
  Mail,
  Send,
  X,
  CheckCircle2,
  Eye,
  MousePointerClick,
  ListChecks,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  companyEndpoints,
  type Job,
  type SuggestedSeeker,
  type NearbySeeker,
} from '../../api/company';
import { useToast } from '@/context/ToastContext';

interface InsightsSummary {
  active_jobs: number;
  total_matches: number;
  strong_matches: number;
  nearby_seekers: number;
  insights: string[];
  top_growing_skills: { name: string; seeker_count: number }[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
};

function unwrap<T>(res: any, fallback: T): T {
  return (res?.data?.data ?? res?.data ?? fallback) as T;
}

function fullName(s: { first_name?: string; last_name?: string }): string {
  return [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Anonymous Seeker';
}

function initials(s: { first_name?: string; last_name?: string }): string {
  const a = s.first_name?.[0] ?? '';
  const b = s.last_name?.[0] ?? '';
  const j = (a + b).toUpperCase();
  return j || 'AS';
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-green-50 text-green-700 border-green-200';
  if (score >= 40) return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

interface InviteTarget {
  seekerId: string;
  seekerName: string;
  jobId: string;
  jobTitle: string;
  matchScore: number;
}

function renderInviteStatusBadge(
  status: 'sent' | 'opened' | 'clicked' | 'applied' | null,
  sentAt?: string
): JSX.Element | null {
  if (!status) return null;
  const meta: Record<
    'sent' | 'opened' | 'clicked' | 'applied',
    { label: string; classes: string; Icon: typeof Mail }
  > = {
    sent: {
      label: 'Sent',
      classes: 'bg-gray-50 text-gray-600 border-gray-200',
      Icon: Mail,
    },
    opened: {
      label: 'Opened',
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
      Icon: Eye,
    },
    clicked: {
      label: 'Clicked',
      classes: 'bg-purple-50 text-purple-700 border-purple-200',
      Icon: MousePointerClick,
    },
    applied: {
      label: 'Applied',
      classes: 'bg-green-50 text-green-700 border-green-200',
      Icon: CheckCircle2,
    },
  };
  const cfg = meta[status];
  const { Icon } = cfg;
  const ago = sentAt ? formatAgo(sentAt) : '';
  return (
    <span
      title={sentAt ? `Invite sent ${new Date(sentAt).toLocaleString()}` : undefined}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.classes}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
      {ago && <span className="text-[10px] opacity-75 ml-1">· {ago}</span>}
    </span>
  );
}

function formatAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Insights() {
  const { push: pushToast } = useToast();
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [suggested, setSuggested] = useState<SuggestedSeeker[]>([]);
  const [nearby, setNearby] = useState<NearbySeeker[]>([]);
  const [jobFilter, setJobFilter] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explainingFor, setExplainingFor] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<InviteTarget | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [invitedKeys, setInvitedKeys] = useState<Set<string>>(new Set());
  // Server-side invite status per (jobId:seekerId) so we can show "Opened",
  // "Clicked", "Applied" badges without requiring a refresh.
  const [inviteStatuses, setInviteStatuses] = useState<
    Record<string, { status: 'sent' | 'opened' | 'clicked' | 'applied'; sent_at: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, jobsRes, suggestedRes, nearbyRes] = await Promise.all([
          companyEndpoints.getInsightsSummary(),
          companyEndpoints.getJobs({ status: 'active', limit: 100 }),
          companyEndpoints.getSuggestedSeekers({ limit: 20 }),
          companyEndpoints.getNearbySeekers({ limit: 20, radiusKm: 50 }),
        ]);
        if (cancelled) return;
        setSummary(unwrap<InsightsSummary>(summaryRes, {
          active_jobs: 0,
          total_matches: 0,
          strong_matches: 0,
          nearby_seekers: 0,
          insights: [],
          top_growing_skills: [],
        }));
        const jobsData = unwrap<{ data: Job[] }>(jobsRes, { data: [] });
        setJobs(jobsData.data ?? []);
        setSuggested(unwrap<{ items: SuggestedSeeker[] }>(suggestedRes, { items: [] }).items ?? []);
        setNearby(unwrap<{ items: NearbySeeker[] }>(nearbyRes, { items: [] }).items ?? []);
      } catch (err) {
        if (!cancelled) setError('Failed to load insights. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-fetch suggested seekers when the job filter changes (skip the initial empty filter)
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    async function loadSuggested() {
      setRefreshing(true);
      try {
        const res = await companyEndpoints.getSuggestedSeekers({
          limit: 20,
          jobId: jobFilter || undefined,
        });
        if (cancelled) return;
        setSuggested(unwrap<{ items: SuggestedSeeker[] }>(res, { items: [] }).items ?? []);
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }
    loadSuggested();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobFilter]);

  // Re-fetch nearby seekers when radius changes
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await companyEndpoints.getNearbySeekers({ limit: 20, radiusKm });
        if (cancelled) return;
        setNearby(unwrap<{ items: NearbySeeker[] }>(res, { items: [] }).items ?? []);
      } catch {
        // keep prior list
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm]);

  function openInvite(s: SuggestedSeeker) {
    setInviteTarget({
      seekerId: s.seeker_id,
      seekerName: fullName(s),
      jobId: s.best_job.id,
      jobTitle: s.best_job.title,
      matchScore: s.score,
    });
    setInviteMessage(
      `Hi ${s.first_name ?? 'there'},\n\n` +
        `Your profile stood out as a strong match for our ${s.best_job.title} role. ` +
        `If it sounds interesting, we'd love for you to apply.\n\n` +
        `Looking forward to hearing from you.`
    );
  }

  function closeInvite() {
    if (sendingInvite) return;
    setInviteTarget(null);
    setInviteMessage('');
  }

  async function sendInvite() {
    if (!inviteTarget) return;
    setSendingInvite(true);
    try {
      await companyEndpoints.inviteSeekerToApply({
        seekerId: inviteTarget.seekerId,
        jobId: inviteTarget.jobId,
        message: inviteMessage.trim() || undefined,
      });
      const key = `${inviteTarget.jobId}:${inviteTarget.seekerId}`;
      setInvitedKeys((prev) => new Set(prev).add(key));
      setInviteStatuses((prev) => ({
        ...prev,
        [key]: { status: 'sent', sent_at: new Date().toISOString() },
      }));
      pushToast(`Invite sent to ${inviteTarget.seekerName}.`, 'success');
      setInviteTarget(null);
      setInviteMessage('');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Could not send the invite. Please try again.';
      pushToast(msg, 'error');
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleExplain(seekerId: string, jobId: string) {
    const key = `${jobId}:${seekerId}`;
    if (explanations[key] || explainingFor === key) return;
    setExplainingFor(key);
    try {
      const res = await companyEndpoints.explainSeekerMatch({ seekerId, jobId });
      const data = unwrap<{ summary: string }>(res, { summary: '' });
      setExplanations((prev) => ({ ...prev, [key]: data.summary }));
    } catch {
      setExplanations((prev) => ({
        ...prev,
        [key]: 'Could not generate an explanation right now.',
      }));
    } finally {
      setExplainingFor(null);
    }
  }

  const strongSuggested = useMemo(
    () => suggested.filter((s) => s.score >= 70),
    [suggested]
  );

  // Pull invite status for the visible Suggested Seekers so each row knows
  // whether it has a pending invite (and what state it's in).
  useEffect(() => {
    if (strongSuggested.length === 0) {
      setInviteStatuses({});
      return;
    }
    const pairs = strongSuggested.map((s) => ({
      seekerId: s.seeker_id,
      jobId: s.best_job.id,
    }));
    let cancelled = false;
    companyEndpoints
      .lookupInvites(pairs)
      .then((res) => {
        if (cancelled) return;
        const rows = (res.data as any)?.data ?? [];
        const next: Record<string, { status: any; sent_at: string }> = {};
        for (const r of rows) {
          next[`${r.job_id}:${r.seeker_id}`] = { status: r.status, sent_at: r.sent_at };
        }
        setInviteStatuses(next);
      })
      .catch(() => {
        /* tracking is best-effort UI sugar — never block the page */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strongSuggested.map((s) => `${s.best_job.id}:${s.seeker_id}`).join('|')]);

  const summaryCards = useMemo(() => {
    if (!summary) return null;
    return (
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{summary.active_jobs}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_matches}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Strong Matches</p>
              <p className="text-2xl font-bold text-gray-900">{summary.strong_matches}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Nearby Seekers</p>
              <p className="text-2xl font-bold text-gray-900">{summary.nearby_seekers}</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }, [summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3 text-red-700">
        <AlertCircle className="w-5 h-5" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
              <p className="text-gray-600 text-sm">
                Suggested candidates and seekers near your branches.
              </p>
            </div>
          </div>
          <Link
            to="/company/insights/invites"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
          >
            <ListChecks className="w-4 h-4 text-orange-500" />
            Invites sent
          </Link>
        </div>
      </motion.div>

      {/* Summary cards */}
      {summaryCards}

      {/* Insight bullets + growing skills */}
      {summary && (summary.insights.length > 0 || summary.top_growing_skills.length > 0) && (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {summary.insights.length > 0 && (
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                Highlights
              </h2>
              <ul className="space-y-3">
                {summary.insights.map((line, i) => (
                  <li
                    key={i}
                    className="flex gap-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100"
                  >
                    <span className="w-1.5 h-1.5 mt-2 rounded-full bg-orange-500 shrink-0" />
                    <span className="text-sm text-gray-700">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.top_growing_skills.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Trending skills
              </h2>
              <div className="space-y-2">
                {summary.top_growing_skills.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                    <span className="text-xs text-gray-500">{s.seeker_count} seekers</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Suggested Seekers */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100"
      >
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Suggested Seekers
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Ranked by skill overlap and experience fit. Click "Explain match" for an AI summary.
            </p>
          </div>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All active jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
        <div className="divide-y divide-gray-50 relative">
          {refreshing && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          )}
          {strongSuggested.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No strong matches (70+) yet. Add skills to your active jobs to surface candidates.
            </div>
          ) : (
            strongSuggested.map((s) => {
              const key = `${s.best_job.id}:${s.seeker_id}`;
              const explanation = explanations[key];
              const explaining = explainingFor === key;
              return (
                <div key={s.seeker_id} className="p-5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-bold shrink-0">
                      {s.avatar_url ? (
                        <img
                          src={s.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        initials(s)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{fullName(s)}</h3>
                        {explanation && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${scoreColor(
                              s.score
                            )}`}
                          >
                            {s.score}/100
                          </span>
                        )}
                        {s.has_applied_already && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                            Already applied
                          </span>
                        )}
                      </div>
                      {s.headline && (
                        <p className="text-sm text-gray-500 truncate mt-0.5">{s.headline}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          Best fit: {s.best_job.title}
                        </span>
                        {s.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {s.city}
                          </span>
                        )}
                        {s.total_experience_years != null && (
                          <span>{s.total_experience_years} yrs experience</span>
                        )}
                        <span>
                          {s.score_breakdown.required_overlap} required skill
                          {s.score_breakdown.required_overlap === 1 ? '' : 's'} matched
                        </span>
                      </div>
                      {s.matched_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.matched_skills.slice(0, 6).map((m) => (
                            <span
                              key={m}
                              className="px-2 py-0.5 rounded-md text-xs bg-green-50 text-green-700 border border-green-100"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                      {explanation && (
                        <div className="mt-3 p-3 rounded-lg bg-orange-50/60 border border-orange-100 text-sm text-gray-700 flex gap-2">
                          <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                          <span>{explanation}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => handleExplain(s.seeker_id, s.best_job.id)}
                        disabled={explaining || !!explanation}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {explaining ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5" />
                        )}
                        {explanation ? 'Explained' : explaining ? 'Thinking…' : 'Explain match'}
                      </button>
                      {(() => {
                        const key = `${s.best_job.id}:${s.seeker_id}`;
                        const justInvited = invitedKeys.has(key);
                        const tracked = inviteStatuses[key];
                        // Show tracked status if persisted, otherwise reflect
                        // a fresh in-session send.
                        const status = tracked?.status ?? (justInvited ? 'sent' : null);
                        const sentAt = tracked?.sent_at;
                        const disabled = s.has_applied_already || !!status;
                        const statusBadge = renderInviteStatusBadge(status, sentAt);
                        return (
                          <>
                            {statusBadge}
                            <button
                              onClick={() => openInvite(s)}
                              disabled={disabled}
                              title={
                                s.has_applied_already
                                  ? 'This seeker already applied for this job'
                                  : status
                                  ? `Already invited (${status})`
                                  : `Email ${fullName(s)} about ${s.best_job.title}`
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {status ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              {status ? 'Invited' : 'Invite to apply'}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Invite-to-apply modal */}
      {inviteTarget && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeInvite}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-orange-500" />
                  Invite {inviteTarget.seekerName} to apply
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  We'll email them a link to <strong>{inviteTarget.jobTitle}</strong> with your
                  message. They can apply with one click.
                </p>
              </div>
              <button
                onClick={closeInvite}
                disabled={sendingInvite}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                  <Briefcase className="w-3.5 h-3.5" />
                  {inviteTarget.jobTitle}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${scoreColor(
                    inviteTarget.matchScore
                  )}`}
                >
                  Match {inviteTarget.matchScore}/100
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal message
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value.slice(0, 1000))}
                  rows={6}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Add a short personal note (optional)…"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {inviteMessage.length}/1000
                </p>
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeInvite}
                disabled={sendingInvite}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendInvite}
                disabled={sendingInvite}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {sendingInvite ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sendingInvite ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Nearby Seekers */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100"
      >
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-500" />
              Nearby Seekers
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Active seekers within {radiusKm} km of any active branch.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Radius</span>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-32 accent-orange-500"
            />
            <span className="text-sm font-medium text-gray-700 min-w-[3rem]">{radiusKm} km</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {nearby.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No seekers found in this radius. Try expanding the search or adding branches.
            </div>
          ) : (
            nearby.map((s) => (
              <div key={s.seeker_id} className="p-5 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center text-purple-600 font-bold shrink-0">
                    {s.avatar_url ? (
                      <img
                        src={s.avatar_url}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      initials(s)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{fullName(s)}</h3>
                    {s.headline && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">{s.headline}</p>
                    )}
                    {s.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {s.skills.slice(0, 5).map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-gray-900">
                      {s.distance_km} km
                    </div>
                    <div className="text-xs text-gray-500">from {s.nearest_branch.name}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
