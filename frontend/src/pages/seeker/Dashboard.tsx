import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import * as seekerApi from '../../api/seeker';
import useGeolocation from '../../hooks/useGeolocation';
import { HomeJob } from '../../components/seeker/HomeJobCard';
import { NearbyCompany } from '../../components/seeker/NearbyCompaniesSection';
import { formatSalary } from '../../lib/formatters';

type StatusKey = 'applied' | 'under_review' | 'shortlisted' | 'rejected' | string;

const STATUS_PILL: Record<string, string> = {
  applied: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  under_review: 'bg-[#e3e2e5]/60 text-[#5d5e60] border-white/40',
  shortlisted: 'bg-green-500/10 text-green-700 border-green-500/20',
  interview: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  applied: 'Applied',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview: 'Interview Scheduled',
  rejected: 'Rejected',
};

interface RecentApp {
  id: string;
  jobTitle: string;
  company: string;
  logoUrl?: string;
  initials: string;
  status: StatusKey;
  matchScore?: number;
  appliedDate: string;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ appliedJobs: 0, savedJobs: 0, profileCompletion: 0 });
  const [recentApplications, setRecentApplications] = useState<RecentApp[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<HomeJob[]>([]);
  const [nearbyCompanies, setNearbyCompanies] = useState<NearbyCompany[]>([]);
  const [hasProfileSignals, setHasProfileSignals] = useState(true);
  const [coordsSource, setCoordsSource] = useState<'browser' | 'profile' | 'geocode' | 'none'>('none');
  const [feedLoading, setFeedLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [firstName, setFirstName] = useState('');
  const [headline, setHeadline] = useState('');

  const { coords, status: geoStatus, request: requestLocation } = useGeolocation({ autoRequest: true });

  const loadFeed = useCallback(async (lat?: number, lng?: number) => {
    setFeedLoading(true);
    try {
      const params: seekerApi.HomeFeedParams = {};
      if (typeof lat === 'number' && typeof lng === 'number') {
        params.lat = lat;
        params.lng = lng;
      }
      const res = await seekerApi.getHomeFeed(params);
      const data = res.data?.data ?? res.data ?? {};
      setRecommendedJobs(Array.isArray(data.recommended_jobs) ? data.recommended_jobs : []);
      setNearbyCompanies(Array.isArray(data.nearby_companies) ? data.nearby_companies : []);
      setHasProfileSignals(Boolean(data.has_profile_signals));
      setCoordsSource(data.used_coords_source ?? 'none');
    } catch {
      setRecommendedJobs([]);
      setNearbyCompanies([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadProfileAndStats() {
      try {
        const [profileRes, appsRes, savedRes] = await Promise.all([
          seekerApi.getProfile(),
          seekerApi.getApplications({ limit: 5 }),
          seekerApi.getSavedJobs(),
        ]);

        const profile = profileRes.data?.data ?? profileRes.data ?? {};
        setFirstName(profile.first_name ?? user?.email?.split('@')[0] ?? '');
        setHeadline(profile.headline ?? '');

        const apps: any[] = appsRes.data?.data ?? appsRes.data ?? [];
        setRecentApplications(
          apps.map((a: any) => {
            const company = a.job_id?.company_id?.name ?? a.company ?? '';
            return {
              id: a._id ?? a.id,
              jobTitle: a.job_id?.title ?? a.jobTitle ?? '',
              company,
              logoUrl: a.job_id?.company_id?.logo_url ?? a.logoUrl,
              initials: (company || 'C').substring(0, 2).toUpperCase(),
              status: (a.status ?? 'applied') as StatusKey,
              matchScore: a.match_score ?? a.score,
              appliedDate: a.applied_at ?? a.createdAt ?? new Date().toISOString(),
            };
          })
        );

        const saved: any[] = savedRes.data?.data ?? savedRes.data ?? [];
        setSavedIds(new Set(saved.map((j: any) => j._id ?? j.id).filter(Boolean)));
        setStats({
          appliedJobs: apps.length,
          savedJobs: saved.length,
          profileCompletion: profile.profile_complete_pct ?? profile.profile_completion ?? 0,
        });
      } catch {}
    }
    loadProfileAndStats();
  }, [user?.email]);

  useEffect(() => {
    loadFeed(coords?.latitude, coords?.longitude);
  }, [loadFeed, coords?.latitude, coords?.longitude]);

  const handleSave = useCallback(async (job: HomeJob) => {
    try {
      const isSaved = savedIds.has(job._id);
      if (isSaved) {
        await seekerApi.unsaveJob(job._id);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(job._id);
          return next;
        });
      } else {
        await seekerApi.saveJob(job._id);
        setSavedIds((prev) => new Set(prev).add(job._id));
        seekerApi
          .trackHomeEvent({ type: 'save', source: 'reco', job_id: job._id, score: job.match_score })
          .catch(() => {});
      }
    } catch {}
  }, [savedIds]);

  const handleRecoCardClick = useCallback((job: HomeJob) => {
    seekerApi
      .trackHomeEvent({ type: 'click', source: 'reco', job_id: job._id, score: job.match_score })
      .catch(() => {});
  }, []);

  const handleNearbyCardClick = useCallback((c: NearbyCompany) => {
    seekerApi
      .trackHomeEvent({ type: 'click', source: 'nearby', company_id: c.company_id })
      .catch(() => {});
  }, []);

  const interviewsCount = useMemo(
    () => recentApplications.filter((a) => a.status === 'shortlisted' || a.status === 'interview').length,
    [recentApplications]
  );

  const hasCoords = coordsSource !== 'none' || Boolean(coords);
  const recoLoading = feedLoading;
  const showcaseJobs = recommendedJobs.slice(0, 4);
  const showcaseApps = recentApplications.slice(0, 5);
  const showcaseCompanies = nearbyCompanies.slice(0, 4);
  const greetingName = firstName || user?.email?.split('@')[0] || 'there';

  return (
    <div className="glass-canvas relative min-h-[calc(100vh-4rem)] -mt-4 pt-4 pb-20 overflow-hidden">
      {/* Organic background blobs */}
      <span className="organic-shape bg-[#ff6b00] w-[500px] h-[500px] -top-24 -left-24" />
      <span className="organic-shape bg-[#c6c6c7] w-[400px] h-[400px] top-1/2 right-0" />

      <main className="relative z-10 px-4 md:px-10 py-8 md:py-10 max-w-7xl mx-auto">
        {/* Welcome + Profile Completion */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-12 items-end">
          <div className="xl:col-span-2">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1b1b1e] mb-2">
              Hello, {greetingName}
            </h2>
            <p className="text-lg text-[#5d5e60]">
              {headline || 'Ready to take the next step in your career journey today?'}
            </p>
          </div>
          <div className="glass-card p-6 rounded-3xl active-glow">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-[#1b1b1e]">Profile Completion</span>
              <span className="text-sm font-medium text-[#a04100]">{stats.profileCompletion}%</span>
            </div>
            <div className="w-full bg-white/30 backdrop-blur-md h-3 rounded-full overflow-hidden border border-white/20">
              <div className="shimmer-bg h-full rounded-full transition-all" style={{ width: `${Math.min(100, stats.profileCompletion)}%` }} />
            </div>
            <p className="mt-4 text-xs font-semibold text-[#5d5e60]">
              {stats.profileCompletion >= 100
                ? 'Your profile is complete — you stand out to recruiters.'
                : (
                  <>
                    Complete your portfolio to unlock VIP applications.{' '}
                    <Link to="/seeker/profile" className="text-[#a04100] underline underline-offset-2">
                      Update now
                    </Link>
                  </>
                )}
            </p>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatTile
            icon="bookmark"
            iconWrapClass="bg-[#ff6b00]/20 text-[#a04100]"
            label="Saved Jobs"
            value={stats.savedJobs}
          />
          <StatTile
            icon="send"
            iconWrapClass="bg-[#989999]/20 text-[#5d5f5f]"
            label="Total Applications"
            value={stats.appliedJobs}
          />
          <StatTile
            icon="auto_awesome"
            iconWrapClass="bg-green-500/20 text-green-700"
            label="Recommended"
            value={recommendedJobs.length}
          />
          <StatTile
            icon="forum"
            iconWrapClass="bg-blue-500/20 text-blue-700"
            label="Interviews"
            value={interviewsCount}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Recommended Jobs + Recent Applications */}
          <section className="xl:col-span-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[#1b1b1e]">For You</h3>
              <Link to="/seeker/jobs" className="text-[#a04100] text-sm font-medium hover:underline">
                View all
              </Link>
            </div>

            {recoLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card p-6 rounded-[2rem] h-64 animate-pulse" />
                ))}
              </div>
            ) : showcaseJobs.length === 0 ? (
              <div className="glass-card p-10 rounded-[2rem] text-center">
                <span className="material-symbols-outlined text-4xl text-[#8e7164]">search_off</span>
                <p className="text-sm text-[#5d5e60] mt-2">
                  {hasProfileSignals
                    ? 'No recommendations right now — check back soon.'
                    : 'Add skills and experience to your profile for stronger matches.'}
                </p>
                <Link to="/seeker/profile" className="inline-block mt-3 text-sm font-semibold text-[#a04100] hover:underline">
                  Update profile
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {showcaseJobs.map((job) => (
                  <JobGlassCard
                    key={job._id}
                    job={job}
                    saved={savedIds.has(job._id)}
                    onSave={handleSave}
                    onCardClick={handleRecoCardClick}
                  />
                ))}
              </div>
            )}

            {/* Recent Applications */}
            <div className="mt-12">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-[#1b1b1e]">Recent Applications</h3>
                <Link to="/seeker/applications" className="text-[#a04100] text-sm font-medium hover:underline">
                  View all
                </Link>
              </div>

              <div className="glass-card rounded-[2rem] overflow-hidden">
                {showcaseApps.length === 0 ? (
                  <div className="p-10 text-center">
                    <span className="material-symbols-outlined text-4xl text-[#8e7164]">inbox</span>
                    <p className="text-sm text-[#5d5e60] mt-2">No applications yet. Start applying to jobs!</p>
                    <Link
                      to="/seeker/jobs"
                      className="inline-block mt-3 text-sm font-semibold text-[#a04100] hover:underline"
                    >
                      Browse Jobs
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-white/20 border-b border-white/40">
                        <tr>
                          <th className="px-6 py-4 text-sm font-medium text-[#5d5e60]">Company</th>
                          <th className="px-6 py-4 text-sm font-medium text-[#5d5e60]">Role</th>
                          <th className="px-6 py-4 text-sm font-medium text-[#5d5e60]">AI Score</th>
                          <th className="px-6 py-4 text-sm font-medium text-[#5d5e60]">Status</th>
                          <th className="px-6 py-4 text-sm font-medium text-[#5d5e60] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/20">
                        {showcaseApps.map((app) => (
                          <tr key={app.id} className="hover:bg-white/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {app.logoUrl ? (
                                  <img
                                    src={app.logoUrl}
                                    alt={app.company}
                                    className="w-8 h-8 rounded-lg object-contain shadow-sm border border-white/40 bg-white"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-white/60 border border-white/40 flex items-center justify-center text-[#a04100] text-xs font-bold shadow-sm">
                                    {app.initials}
                                  </div>
                                )}
                                <span className="text-sm font-medium text-[#1b1b1e]">{app.company || '—'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#1b1b1e]">{app.jobTitle || '—'}</td>
                            <td className="px-6 py-4">
                              {typeof app.matchScore === 'number' ? (
                                <span className="text-[#ff6b00] text-lg font-semibold">{Math.round(app.matchScore)}</span>
                              ) : (
                                <span className="text-[#8e7164] text-sm">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                                  STATUS_PILL[app.status] ?? STATUS_PILL.under_review
                                }`}
                              >
                                {STATUS_LABEL[app.status] ?? 'Under Review'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link
                                to={`/seeker/applications/${app.id}`}
                                className="text-[#5d5e60] hover:text-[#a04100] transition-colors"
                                title="View application"
                              >
                                <span className="material-symbols-outlined">more_vert</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="xl:col-span-4 space-y-6">
            {/* Nearby Companies */}
            <div className="glass-card p-6 rounded-[2rem]">
              <h3 className="text-xl font-semibold text-[#1b1b1e] mb-6">Nearby Companies</h3>

              {feedLoading && hasCoords ? (
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-12 h-12 rounded-xl bg-white/40" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/40 rounded w-1/2" />
                        <div className="h-2 bg-white/40 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !hasCoords ? (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-4xl text-[#8e7164]">my_location</span>
                  <p className="text-sm text-[#5d5e60] mt-2">
                    Share your location to see companies hiring nearby.
                  </p>
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="mt-3 px-4 py-2 bg-white/40 border border-white/40 backdrop-blur-md rounded-2xl text-sm font-medium text-[#1b1b1e] hover:bg-white/60 transition-all shadow-sm"
                  >
                    Use my location
                  </button>
                  {geoStatus === 'denied' && (
                    <p className="text-xs text-[#8e7164] mt-3">
                      Location was denied.{' '}
                      <Link to="/seeker/profile" className="text-[#a04100] hover:underline">
                        Set city in profile
                      </Link>
                    </p>
                  )}
                </div>
              ) : showcaseCompanies.length === 0 ? (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-4xl text-[#8e7164]">domain_disabled</span>
                  <p className="text-sm text-[#5d5e60] mt-2">
                    No companies in your area have new openings yet.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {showcaseCompanies.map((c) => (
                      <div key={c.company_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          {c.logo_url ? (
                            <img
                              alt={c.name}
                              src={c.logo_url}
                              className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 p-2 shadow-sm object-contain"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm flex items-center justify-center text-[#a04100] font-bold text-sm">
                              {c.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#1b1b1e] truncate">{c.name}</p>
                            <p className="text-xs font-semibold text-[#5d5e60] truncate">
                              {c.industry ?? 'Hiring company'} · {c.nearest_branch.city}
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/seeker/companies/${c.company_id}`}
                          onClick={() => handleNearbyCardClick(c)}
                          className="text-xs font-semibold text-[#a04100] hover:underline shrink-0 ml-3"
                        >
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/seeker/companies"
                    className="mt-8 block w-full text-center py-3 bg-white/40 backdrop-blur-md text-[#5d5e60] rounded-2xl text-sm font-medium hover:bg-white/60 transition-all border border-white/40 shadow-sm"
                  >
                    View all companies
                  </Link>
                </>
              )}
            </div>

            {/* Career Tip */}
            <div className="relative overflow-hidden p-6 rounded-[2rem] glass-primary text-white group cursor-default">
              <div className="relative z-10">
                <span
                  className="material-symbols-outlined mb-4 bg-white/20 p-2 rounded-xl border border-white/20 inline-block"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lightbulb
                </span>
                <h4 className="text-xl font-semibold mb-2">Daily Career Tip</h4>
                <p className="text-base opacity-90 mb-4 leading-relaxed">
                  &ldquo;Personalize your portfolio intro for each specific role you apply for. Context is the secret to getting noticed.&rdquo;
                </p>
                <Link
                  to="/seeker/profile"
                  className="text-sm font-medium text-white underline underline-offset-4 opacity-90 hover:opacity-100 transition-opacity"
                >
                  Polish my profile
                </Link>
              </div>
              <div className="absolute -right-4 -bottom-4 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -left-4 top-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatTile({
  icon,
  iconWrapClass,
  label,
  value,
}: {
  icon: string;
  iconWrapClass: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="glass-card p-6 rounded-3xl flex items-center gap-4 transition-transform hover:scale-[1.02]">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-white/40 ${iconWrapClass}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-[#5d5e60]">{label}</p>
        <p className="text-2xl xl:text-3xl font-semibold text-[#1b1b1e]">{value}</p>
      </div>
    </div>
  );
}

function JobGlassCard({
  job,
  saved,
  onSave,
  onCardClick,
}: {
  job: HomeJob;
  saved: boolean;
  onSave: (job: HomeJob) => void;
  onCardClick: (job: HomeJob) => void;
}) {
  const company = job.company?.name ?? '';
  const initials = company.substring(0, 2).toUpperCase() || 'C';
  const locationText =
    (job.locations ?? [])
      .map((l) => l.label ?? l.city ?? '')
      .filter(Boolean)
      .join(', ') ||
    (job.work_mode ? job.work_mode.charAt(0).toUpperCase() + job.work_mode.slice(1) : 'Remote');
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency, true);
  const matchPct = typeof job.match_score === 'number' ? Math.round(job.match_score) : null;

  return (
    <div className="glass-card p-6 rounded-[2rem] flex flex-col hover:border-[#ff6b00]/40 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className="w-14 h-14 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-white/40 p-2">
          {job.company?.logo_url ? (
            <img alt={company} className="w-full h-full object-contain" src={job.company.logo_url} />
          ) : (
            <span className="text-[#a04100] font-bold text-sm">{initials}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSave(job)}
          className={`p-2 rounded-full hover:bg-white/40 transition-colors ${
            saved ? 'text-[#ff6b00]' : 'text-[#5d5e60] hover:text-[#a04100]'
          }`}
          aria-label={saved ? 'Unsave job' : 'Save job'}
        >
          <span
            className="material-symbols-outlined"
            style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            bookmark
          </span>
        </button>
      </div>
      <h4 className="text-lg font-semibold text-[#1b1b1e] mb-1 line-clamp-1">{job.title}</h4>
      <p className="text-sm font-medium text-[#5d5e60] mb-4 line-clamp-1">
        {company} {locationText && <>&bull; {locationText}</>}
      </p>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {matchPct !== null && (
          <div className="px-3 py-1 bg-green-500/10 text-green-700 rounded-full text-xs font-semibold border border-green-500/20">
            {matchPct}% Match
          </div>
        )}
        {salary && <span className="text-[#5d5e60] text-xs font-semibold">{salary}</span>}
      </div>
      {job.match_reason && (
        <p className="text-[#5d5e60] text-xs font-semibold mb-6 line-clamp-2">{job.match_reason}</p>
      )}
      <Link
        to={`/seeker/jobs/${job._id}`}
        onClick={() => onCardClick(job)}
        className="mt-auto w-full text-center py-3 border border-white/60 text-[#1b1b1e] text-sm font-semibold rounded-2xl hover:bg-white/60 active:scale-95 transition-all shadow-sm"
      >
        View Details
      </Link>
    </div>
  );
}
