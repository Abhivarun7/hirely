import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Briefcase,
  Users as UsersIcon,
  Search,
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
} from 'lucide-react';
import * as adminApi from '../../api/admin';

interface JobLite {
  id: string;
  title: string;
  company: string;
  status: string;
}

interface SeekerLite {
  user_id: string;
  email: string;
  name?: string;
  headline?: string;
  city?: string;
  applications_count: number;
  profile_complete_pct: number;
  current_company?: string | null;
  current_role?: string | null;
  is_current_job?: boolean;
}

interface CandidateSuggestion {
  user_id: string;
  seeker_id: string;
  name: string;
  email: string;
  headline?: string;
  match_score: number;
  reason: string;
  strengths: string[];
  gaps: string[];
}

interface SeekerInsights {
  user_id: string;
  best_fit_roles: { title: string; reason: string; confidence: number }[];
  current_strengths: string[];
  things_to_improve: { area: string; why: string; how: string }[];
  applied_targets_summary: string;
  overall_assessment: string;
}

type Tab = 'jobs' | 'seekers';

export default function AIInsights() {
  const [tab, setTab] = useState<Tab>('jobs');

  // Jobs side
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [jobSearch, setJobSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobLite | null>(null);
  const [candidates, setCandidates] = useState<CandidateSuggestion[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);

  // Seekers side
  const [seekers, setSeekers] = useState<SeekerLite[]>([]);
  const [seekerSearch, setSeekerSearch] = useState('');
  const [selectedSeeker, setSelectedSeeker] = useState<SeekerLite | null>(null);
  const [insights, setInsights] = useState<SeekerInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getAdminJobs({ page: 1, limit: 100 })
      .then((res) => {
        const list: any[] = res.data?.data ?? res.data ?? [];
        setJobs(
          list.map((j: any) => ({
            id: j._id ?? j.id,
            title: j.title ?? '',
            company: j.company_id?.name ?? '',
            status: j.status ?? 'active',
          }))
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    adminApi
      .getSeekerDirectory({ page: 1, limit: 100 })
      .then((res) => {
        const list: any[] = res.data?.data ?? res.data ?? [];
        setSeekers(list);
      })
      .catch(() => {});
  }, []);

  const filteredJobs = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      j.company.toLowerCase().includes(jobSearch.toLowerCase())
  );

  const filteredSeekers = seekers.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(seekerSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(seekerSearch.toLowerCase()) ||
      (s.headline || '').toLowerCase().includes(seekerSearch.toLowerCase())
  );

  const runCandidateSuggestion = async (job: JobLite) => {
    setSelectedJob(job);
    setCandidates([]);
    setCandidatesError(null);
    setCandidatesLoading(true);
    try {
      const res = await adminApi.suggestCandidatesForJob(job.id, 10);
      const list: CandidateSuggestion[] = res.data?.data ?? [];
      setCandidates(list);
    } catch (err: any) {
      setCandidatesError(
        err?.response?.data?.message || 'Failed to get AI candidate suggestions'
      );
    } finally {
      setCandidatesLoading(false);
    }
  };

  const runSeekerInsights = async (seeker: SeekerLite) => {
    setSelectedSeeker(seeker);
    setInsights(null);
    setInsightsError(null);
    setInsightsLoading(true);
    try {
      const res = await adminApi.getSeekerInsights(seeker.user_id);
      setInsights(res.data?.data ?? null);
    } catch (err: any) {
      setInsightsError(
        err?.response?.data?.message || 'Failed to get AI insights for seeker'
      );
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden gap-6"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-orange-500" />
            AI Insights
          </h1>
          <p className="text-gray-600 mt-1">
            Suggest candidates for jobs and analyze seeker fit using OpenAI.
          </p>
        </div>
        <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1">
          <button
            onClick={() => setTab('jobs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === 'jobs'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Suggest Candidates for Job
          </button>
          <button
            onClick={() => setTab('seekers')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === 'seekers'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            Analyze a Seeker
          </button>
        </div>
      </div>

      {tab === 'jobs' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
          {/* Job list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-0">
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredJobs.length === 0 && (
                <p className="p-6 text-sm text-gray-500">No jobs found.</p>
              )}
              {filteredJobs.map((j) => (
                <button
                  key={j.id}
                  onClick={() => runCandidateSuggestion(j)}
                  className={`w-full text-left p-4 border-b border-gray-50 hover:bg-orange-50 transition-colors ${
                    selectedJob?.id === j.id ? 'bg-orange-50' : ''
                  }`}
                >
                  <p className="font-medium text-gray-900">{j.title || 'Untitled'}</p>
                  <p className="text-sm text-gray-500">{j.company || 'Unknown company'}</p>
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium border ${
                      j.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {j.status}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions panel */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-y-auto min-h-0">
            {!selectedJob && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-20">
                <Target className="w-10 h-10 text-gray-300 mb-3" />
                <p className="font-medium">Pick a job to see AI candidate suggestions</p>
                <p className="text-sm mt-1">
                  We score seekers against the job's required skills, experience and description.
                </p>
              </div>
            )}

            {selectedJob && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedJob.title}</h2>
                    <p className="text-gray-500">{selectedJob.company}</p>
                  </div>
                  <button
                    onClick={() => runCandidateSuggestion(selectedJob)}
                    disabled={candidatesLoading}
                    className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {candidatesLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Re-run
                  </button>
                </div>

                {candidatesError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {candidatesError}
                  </div>
                )}

                {candidatesLoading && (
                  <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    Asking the AI to rank candidates...
                  </div>
                )}

                {!candidatesLoading && candidates.length === 0 && !candidatesError && (
                  <p className="py-6 text-sm text-gray-500">
                    No suggestions yet. Click "Re-run" to generate.
                  </p>
                )}

                <div className="space-y-3">
                  {candidates.map((c) => (
                    <div
                      key={c.seeker_id}
                      className="p-4 border border-gray-100 rounded-xl hover:border-orange-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">
                              {c.name || c.email}
                            </p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              <TrendingUp className="w-3 h-3" />
                              {c.match_score}% match
                            </span>
                          </div>
                          {c.headline && (
                            <p className="text-sm text-gray-500">{c.headline}</p>
                          )}
                          <p className="text-sm text-gray-500">{c.email}</p>
                          <p className="mt-2 text-sm text-gray-700">{c.reason}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                              <p className="text-xs font-semibold text-green-700 uppercase mb-1">
                                Strengths
                              </p>
                              <ul className="space-y-1">
                                {c.strengths.map((s, i) => (
                                  <li
                                    key={i}
                                    className="text-sm text-green-900 flex items-start gap-2"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                    {s}
                                  </li>
                                ))}
                                {c.strengths.length === 0 && (
                                  <li className="text-xs text-green-700/70">None listed</li>
                                )}
                              </ul>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                              <p className="text-xs font-semibold text-amber-700 uppercase mb-1">
                                Gaps
                              </p>
                              <ul className="space-y-1">
                                {c.gaps.map((g, i) => (
                                  <li
                                    key={i}
                                    className="text-sm text-amber-900 flex items-start gap-2"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                    {g}
                                  </li>
                                ))}
                                {c.gaps.length === 0 && (
                                  <li className="text-xs text-amber-700/70">None listed</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'seekers' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
          {/* Seeker list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-h-0">
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search seekers..."
                  value={seekerSearch}
                  onChange={(e) => setSeekerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredSeekers.length === 0 && (
                <p className="p-6 text-sm text-gray-500">No seekers found.</p>
              )}
              {filteredSeekers.map((s) => (
                <button
                  key={s.user_id}
                  onClick={() => runSeekerInsights(s)}
                  className={`w-full text-left p-4 border-b border-gray-50 hover:bg-orange-50 transition-colors ${
                    selectedSeeker?.user_id === s.user_id ? 'bg-orange-50' : ''
                  }`}
                >
                  <p className="font-medium text-gray-900">{s.name || s.email}</p>
                  {s.headline && (
                    <p className="text-sm text-gray-500 truncate">{s.headline}</p>
                  )}
                  {(s.current_role || s.current_company) && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {s.is_current_job ? 'Currently' : 'Most recent'}:{' '}
                      <span className="font-medium">
                        {[s.current_role, s.current_company].filter(Boolean).join(' @ ')}
                      </span>
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                      {s.applications_count} apps
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                      {s.profile_complete_pct}% profile
                    </span>
                    {s.city && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full">{s.city}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Insights panel */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-y-auto min-h-0">
            {!selectedSeeker && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-20">
                <UsersIcon className="w-10 h-10 text-gray-300 mb-3" />
                <p className="font-medium">Pick a seeker to see AI insights</p>
                <p className="text-sm mt-1">
                  We analyze their skills, experience and what they apply to.
                </p>
              </div>
            )}

            {selectedSeeker && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedSeeker.name || selectedSeeker.email}
                    </h2>
                    {selectedSeeker.headline && (
                      <p className="text-gray-500">{selectedSeeker.headline}</p>
                    )}
                    {(selectedSeeker.current_role || selectedSeeker.current_company) && (
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedSeeker.is_current_job ? 'Currently' : 'Most recent'}:{' '}
                        <span className="font-medium text-gray-800">
                          {[selectedSeeker.current_role, selectedSeeker.current_company]
                            .filter(Boolean)
                            .join(' @ ')}
                        </span>
                      </p>
                    )}
                    <p className="text-sm text-gray-400">{selectedSeeker.email}</p>
                  </div>
                  <button
                    onClick={() => runSeekerInsights(selectedSeeker)}
                    disabled={insightsLoading}
                    className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {insightsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Re-run
                  </button>
                </div>

                {insightsError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {insightsError}
                  </div>
                )}

                {insightsLoading && (
                  <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    Asking the AI to analyze this seeker...
                  </div>
                )}

                {!insightsLoading && insights && (
                  <div className="space-y-4">
                    {insights.overall_assessment && (
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl">
                        <p className="text-xs font-semibold text-orange-700 uppercase mb-1">
                          Overall
                        </p>
                        <p className="text-sm text-gray-800">{insights.overall_assessment}</p>
                      </div>
                    )}

                    {insights.applied_targets_summary && (
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                        <p className="text-xs font-semibold text-gray-700 uppercase mb-1">
                          What they're trying to be
                        </p>
                        <p className="text-sm text-gray-800">
                          {insights.applied_targets_summary}
                        </p>
                      </div>
                    )}

                    {insights.best_fit_roles.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4 text-green-600" />
                          Best fit roles
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {insights.best_fit_roles.map((r, i) => (
                            <div
                              key={i}
                              className="p-3 bg-green-50 border border-green-100 rounded-xl"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-gray-900">{r.title}</p>
                                <span className="text-xs font-semibold text-green-700">
                                  {r.confidence}%
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{r.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.current_strengths.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          Current strengths
                        </h3>
                        <ul className="space-y-1">
                          {insights.current_strengths.map((s, i) => (
                            <li
                              key={i}
                              className="text-sm text-gray-700 flex items-start gap-2"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insights.things_to_improve.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-600" />
                          Things to improve
                        </h3>
                        <div className="space-y-2">
                          {insights.things_to_improve.map((t, i) => (
                            <div
                              key={i}
                              className="p-3 bg-amber-50 border border-amber-100 rounded-xl"
                            >
                              <p className="font-medium text-gray-900">{t.area}</p>
                              <p className="text-sm text-gray-700 mt-0.5">
                                <span className="font-medium">Why:</span> {t.why}
                              </p>
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">How:</span> {t.how}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
