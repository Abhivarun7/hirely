import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { searchPublicJobs } from '../../api/public';
import { API_BASE_URL } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

interface JobLocation {
  lat: number;
  lng: number;
}

interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  salary: string;
  type: string;
  tags: string[];
  postedDays: number;
  position?: JobLocation;
}

function formatSalary(min: number, max: number, currency = 'USD', disclosed?: boolean) {
  if (disclosed === false) return 'Not Disclosed';
  if (!min && !max) return 'Competitive';
  const sym = currency === 'INR' ? '₹' : '$';
  const fmt = (n: number) => {
    if (currency === 'INR') {
      if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toString();
    }
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toString();
  };
  if (min && max) return `${sym}${fmt(min)} - ${sym}${fmt(max)}`;
  if (min) return `${sym}${fmt(min)}+`;
  return `Up to ${sym}${fmt(max)}`;
}

function formatJobType(t: string) {
  return t ? t.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '';
}

function mapJob(j: any): Job {
  const primaryLoc = j.locations?.[0];
  return {
    id: j._id ?? j.id,
    title: j.title ?? '',
    company: j.company?.name ?? j.company_id?.name ?? j.companyName ?? '',
    logo: (j.company?.name ?? j.company_id?.name ?? j.companyName ?? 'C').substring(0, 2).toUpperCase(),
    location: (j.locations ?? []).map((l: any) => l.label ?? l.city ?? '').join(', ') || j.location || '',
    salary: formatSalary(j.salary_min ?? 0, j.salary_max ?? 0, j.salary_currency ?? 'USD', j.salary_disclosed),
    type: formatJobType(j.job_type ?? j.type ?? 'Full-time'),
    tags: (j.skills ?? []).map((s: any) => s.name ?? '').slice(0, 3),
    postedDays: Math.floor((Date.now() - new Date(j.created_at ?? j.createdAt ?? Date.now()).getTime()) / 86400000),
    position: primaryLoc?.latitude && primaryLoc?.longitude
      ? { lat: primaryLoc.latitude, lng: primaryLoc.longitude }
      : undefined,
  };
}

function MapWithMarkers({ jobs, selectedJobId, onJobClick }: { jobs: Job[]; selectedJobId: string | null; onJobClick: (job: Job) => void }) {
  const map = useMap();
  const prevSelected = useRef<string | null>(null);

  useEffect(() => {
    if (selectedJobId && selectedJobId !== prevSelected.current) {
      const job = jobs.find(j => j.id === selectedJobId);
      if (job?.position && map) {
        map.panTo(job.position);
        map.setZoom(12);
      }
    }
    prevSelected.current = selectedJobId;
  }, [selectedJobId, jobs, map]);

  return (
    <>
      {jobs.map((job) => {
        if (!job.position) return null;
        const isSelected = job.id === selectedJobId;
        return (
          <AdvancedMarker
            key={job.id}
            position={job.position}
            onClick={() => onJobClick(job)}
          >
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold shadow-lg cursor-pointer border-2 transition-all ${
                isSelected
                  ? 'bg-orange-500 text-white border-orange-600 scale-110'
                  : 'bg-white text-orange-600 border-orange-400 hover:bg-orange-50'
              }`}
            >
              <span className="max-w-[100px] truncate">{job.title}</span>
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

export default function PublicJobSearch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);

  const selectedJob = jobs.find(j => j.id === selectedJobId) ?? null;

  // Determine user role for button logic
  const isSeeker = isAuthenticated && user?.role === 'job_seeker';
  const isCompanyUser = isAuthenticated && ['company_owner', 'hr_manager', 'recruiter', 'viewer'].includes(user?.role ?? '');

  const fetchJobs = useCallback(() => {
    const params: any = { limit: 100 };
    if (searchQuery) params.q = searchQuery;
    if (remoteOnly) params.work_mode = 'remote';
    searchPublicJobs(params).then((res) => {
      const data = res.data?.data ?? res.data ?? {};
      const list: any[] = Array.isArray(data) ? data : data.jobs ?? data.results ?? [];
      setTotalCount(data.total ?? list.length);
      setJobs(list.map(mapJob));
    }).catch(() => {});
  }, [searchQuery, remoteOnly]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/config`)
      .then(r => r.json())
      .then(j => setMapsApiKey(j.data?.googleMapsApiKey ?? ''))
      .catch(() => setMapsApiKey(''));
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearchQuery(q);
  }, [searchParams]);

  const handleJobClick = (job: Job) => {
    setSelectedJobId(job.id);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  // Determine the job detail path based on role
  const getJobDetailPath = (jobId: string) => {
    if (isSeeker) return `/seeker/jobs/${jobId}`;
    return `/jobs/${jobId}`;
  };

  // Get the action button for the selected job overlay
  const getActionButton = () => {
    if (!selectedJob) return null;

    if (isSeeker) {
      return (
        <Link
          to={`/seeker/jobs/${selectedJob.id}`}
          className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition-all text-center block"
        >
          Apply Now
        </Link>
      );
    }

    if (isCompanyUser) {
      return (
        <Link
          to="/login"
          className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition-all text-center block"
        >
          Login
        </Link>
      );
    }

    // Not logged in
    return (
      <Link
        to="/login"
        className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition-all text-center block"
      >
        Login to Apply
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.03)] fixed top-0 w-full z-50">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-black tracking-tighter text-orange-600">Hirely</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl flex items-center">
            <div className="flex items-center w-full bg-zinc-100 rounded-lg border border-zinc-200 focus-within:border-orange-500 transition-all">
              <div className="flex items-center flex-1 px-3">
                <span className="material-symbols-outlined text-zinc-500 mr-2">search</span>
                <input
                  type="text"
                  placeholder="Search jobs, skills, or companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 text-white rounded-r-lg hover:bg-orange-600 transition-colors"
              >
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>
          </form>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <Link
                to={isSeeker ? '/seeker/dashboard' : isCompanyUser ? '/company/dashboard' : '/'}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors font-medium text-sm"
              >
                <span className="material-symbols-outlined text-lg">dashboard</span>
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-zinc-600 hover:text-orange-600 font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sub-header Filter Bar */}
      <section className="mt-16 bg-white border-b border-zinc-200 sticky top-16 z-40">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-secondary hover:bg-zinc-50 transition-all">
              <span className="material-symbols-outlined text-lg">work</span>
              Job type
              <span className="material-symbols-outlined text-lg">expand_more</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-secondary hover:bg-zinc-50 transition-all">
              <span className="material-symbols-outlined text-lg">payments</span>
              Salary
              <span className="material-symbols-outlined text-lg">expand_more</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-secondary hover:bg-zinc-50 transition-all">
              <span className="material-symbols-outlined text-lg">schedule</span>
              Date posted
              <span className="material-symbols-outlined text-lg">expand_more</span>
            </button>
          </div>
          <div className="h-6 w-[1px] bg-zinc-200 mx-2"></div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface">Remote</span>
            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              className={`w-10 h-5 rounded-full relative flex items-center p-1 transition-colors ${remoteOnly ? 'bg-orange-500' : 'bg-zinc-300'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-all ${remoteOnly ? 'ml-auto' : ''}`}></div>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content: Split Layout */}
      <main className="max-w-[1200px] mx-auto flex h-[calc(100vh-144px)] overflow-hidden">
        {/* Left Side: Scrollable Job List */}
        <aside className="w-full lg:w-1/3 h-full overflow-y-auto px-6 py-6 border-r border-zinc-200 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-on-surface">{totalCount || jobs.length} Jobs Found</h2>
            {jobs.length > 0 && (
              <button
                onClick={() => { setSearchQuery(''); setRemoteOnly(false); }}
                className="text-orange-500 text-sm hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-zinc-300">search</span>
              <p className="mt-2 text-sm text-tertiary">No jobs found. Try adjusting your search.</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => handleJobClick(job)}
                className={`bg-white border p-4 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] cursor-pointer hover:shadow-md transition-shadow ${
                  job.id === selectedJobId ? 'border-orange-500 ring-2 ring-orange-200' : 'border-zinc-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center text-lg font-bold">
                    {job.logo}
                  </div>
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">Actively recruiting</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-1">{job.title}</h3>
                <p className="text-sm text-secondary mb-3">{job.company} · {job.location}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-zinc-100 text-secondary text-xs px-3 py-1 rounded-full">{job.type}</span>
                  <span className="bg-zinc-100 text-secondary text-xs px-3 py-1 rounded-full">{job.salary}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{job.postedDays === 0 ? 'Just now' : job.postedDays === 1 ? '1 day ago' : `${job.postedDays} days ago`}</span>
                  {isSeeker ? (
                    <Link
                      to={`/seeker/jobs/${job.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Apply Now
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      {isCompanyUser ? 'Login' : 'Login to Apply'}
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </aside>

        {/* Right Side: Google Map */}
        <section className="hidden lg:block w-2/3 h-full relative">
          {mapsApiKey === null ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-100">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : mapsApiKey === '' ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-200">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-zinc-400">map</span>
                <p className="mt-2 text-sm text-tertiary">Map unavailable</p>
              </div>
            </div>
          ) : (
            <APIProvider apiKey={mapsApiKey}>
              <Map
                defaultCenter={{ lat: 20, lng: 77 }}
                defaultZoom={4}
                mapId="hirely-public-job-search"
                style={{ width: '100%', height: '100%' }}
                gestureHandling="greedy"
              >
                <MapWithMarkers
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onJobClick={handleJobClick}
                />
              </Map>
            </APIProvider>
          )}

          {/* Zoom Controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            <div className="bg-white rounded-lg shadow-lg border border-zinc-200 overflow-hidden flex flex-col">
              <button className="p-3 hover:bg-zinc-50 border-b border-zinc-100 transition-colors">
                <span className="material-symbols-outlined text-secondary">add</span>
              </button>
              <button className="p-3 hover:bg-zinc-50 transition-colors">
                <span className="material-symbols-outlined text-secondary">remove</span>
              </button>
            </div>
            <button className="bg-white p-3 rounded-lg shadow-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
              <span className="material-symbols-outlined text-secondary">my_location</span>
            </button>
          </div>

          {/* Quick Info Overlay */}
          {selectedJob && (
            <div className="absolute bottom-6 left-6 max-w-sm">
              <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-zinc-200 flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-zinc-100 flex-shrink-0 flex items-center justify-center text-lg font-bold">
                  {selectedJob.logo}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-on-surface">{selectedJob.title}</h4>
                  <p className="text-xs text-secondary mb-2">{selectedJob.company} · {selectedJob.location}</p>
                  {getActionButton()}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
