import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Eye,
  MousePointerClick,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  ListChecks,
  Search,
} from 'lucide-react';
import { companyEndpoints, type InviteRecord, type Job } from '../../api/company';

type InviteStatus = 'sent' | 'opened' | 'clicked' | 'applied';

const STATUS_META: Record<
  InviteStatus,
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

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function fullName(s: { first_name?: string; last_name?: string; email: string }) {
  return [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email;
}

function StatusPill({ status }: { status: InviteStatus }) {
  const cfg = STATUS_META[status];
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.classes}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function InvitesSent() {
  const [items, setItems] = useState<InviteRecord[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    sent: number;
    opened: number;
    clicked: number;
    applied: number;
  } | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNext: false,
  });
  const [statusFilter, setStatusFilter] = useState<'' | InviteStatus>('');
  const [jobFilter, setJobFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Load active jobs once for the filter dropdown.
  useEffect(() => {
    let cancelled = false;
    companyEndpoints
      .getJobs({ status: 'active', limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const list = (res.data as any)?.data ?? [];
        setJobs(Array.isArray(list) ? list : []);
      })
      .catch(() => setJobs([]));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    companyEndpoints
      .listInvites({
        status: statusFilter || undefined,
        jobId: jobFilter || undefined,
        page,
        limit: 20,
      })
      .then((res) => {
        if (cancelled) return;
        const data = (res.data as any)?.data;
        if (!data) {
          setItems([]);
          return;
        }
        setItems(data.items ?? []);
        setSummary(data.summary ?? null);
        setPagination(
          data.pagination ?? {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNext: false,
          }
        );
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, jobFilter, page]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        fullName(i.seeker).toLowerCase().includes(q) ||
        i.seeker.email.toLowerCase().includes(q) ||
        i.job.title.toLowerCase().includes(q)
    );
  }, [items, search]);

  const conversionRate = summary && summary.total > 0
    ? Math.round((summary.applied / summary.total) * 100)
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/company/insights"
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
          aria-label="Back to AI Insights"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <ListChecks className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invites sent</h1>
            <p className="text-gray-600 text-sm">
              Every match invite from AI Insights, with delivery + apply tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => {
            setStatusFilter('');
            setPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === ''
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-2xl font-bold text-gray-900">{summary?.total ?? 0}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total</p>
        </button>
        {(['sent', 'opened', 'clicked', 'applied'] as InviteStatus[]).map((st) => {
          const cfg = STATUS_META[st];
          const Icon = cfg.Icon;
          const count = summary ? summary[st] : 0;
          return (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                statusFilter === st
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">{cfg.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </button>
          );
        })}
      </div>

      {summary && summary.total > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            <span className="font-semibold text-gray-900">{conversionRate}%</span> of invites
            converted to an application.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by candidate or job…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={jobFilter}
          onChange={(e) => {
            setJobFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as '' | InviteStatus);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="applied">Applied</option>
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            {summary && summary.total === 0
              ? 'No invites sent yet. Use AI Insights to invite a matched candidate.'
              : 'No invites match the current filters.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredItems.map((row) => (
              <div key={row.id} className="p-5 hover:bg-gray-50/60">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-bold shrink-0 overflow-hidden">
                    {row.seeker.avatar_url ? (
                      <img
                        src={row.seeker.avatar_url}
                        alt=""
                        className="w-12 h-12 object-cover"
                      />
                    ) : (
                      (row.seeker.first_name?.[0] ?? row.seeker.email[0] ?? '?').toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {fullName(row.seeker)}
                      </h3>
                      <StatusPill status={row.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{row.seeker.email}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {row.job.title}
                      </span>
                      {row.inviter_email && (
                        <span>
                          Sent by <span className="text-gray-700">{row.inviter_email}</span>
                        </span>
                      )}
                    </div>
                    {row.message && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                        {row.message}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-gray-500 mt-3">
                      <span title="When the email left our server">
                        <span className="opacity-60">Sent:</span> {formatDate(row.sent_at)}
                      </span>
                      {row.opened_at && (
                        <span title={`Opened ${row.open_count}× total`}>
                          <span className="opacity-60">Opened:</span> {formatDate(row.opened_at)}
                          {row.open_count > 1 && ` (${row.open_count}×)`}
                        </span>
                      )}
                      {row.clicked_at && (
                        <span title={`Clicked ${row.click_count}× total`}>
                          <span className="opacity-60">Clicked:</span>{' '}
                          {formatDate(row.clicked_at)}
                          {row.click_count > 1 && ` (${row.click_count}×)`}
                        </span>
                      )}
                      {row.applied_at && (
                        <span className="text-green-600 font-medium">
                          Applied {formatDate(row.applied_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && !loading && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
