import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import * as seekerApi from '../../api/seeker';
import { API_BASE_URL } from '../../api/client';
import { formatSalary } from '../../lib/formatters';

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
  saved: boolean;
  position?: JobLocation;
}

function mapJob(j: any): Job {
  const primaryLoc = j.locations?.[0];
  return {
    id: j._id ?? j.id,
    title: j.title ?? '',
    company: j.company_id?.name ?? '',
    logo: (j.company_id?.name ?? 'C').substring(0, 2).toUpperCase(),
    location: (j.locations ?? []).map((l: any) => l.label ?? l.city ?? '').join(', '),
    salary: formatSalary(j.salary_min, j.salary_max, j.salary_currency, j.salary_disclosed),
    type: j.job_type ?? 'Full-time',
    tags: (j.skills ?? []).map((s: any) => s.name ?? '').slice(0, 3),
    postedDays: Math.floor((Date.now() - new Date(j.created_at ?? j.createdAt ?? Date.now()).getTime()) / 86400000),
    saved: j.is_saved ?? false,
    position: primaryLoc?.latitude && primaryLoc?.longitude
      ? { lat: primaryLoc.latitude, lng: primaryLoc.longitude }
      : undefined,
  };
}

function postedLabel(days: number) {
  if (days <= 0) return 'Just now';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
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
            <div className="flex flex-col items-center cursor-pointer">
              <div
                className={`px-4 py-2 rounded-full font-bold text-xs shadow-2xl border transition-transform whitespace-nowrap max-w-[160px] truncate ${
                  isSelected
                    ? 'bg-[#ff6b00] text-white border-white/50 orange-glow scale-110'
                    : 'extreme-glass text-[#1b1b1e]'
                }`}
              >
                {job.title}
              </div>
              <div
                className={`w-[2px] h-8 mx-auto ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#ff6b00] to-transparent'
                    : 'bg-white/50'
                }`}
              />
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

function MapControls({ onMyLocation }: { onMyLocation: () => void }) {
  const map = useMap();
  const zoomIn = () => {
    if (!map) return;
    const z = map.getZoom() ?? 4;
    map.setZoom(z + 1);
  };
  const zoomOut = () => {
    if (!map) return;
    const z = map.getZoom() ?? 4;
    map.setZoom(Math.max(0, z - 1));
  };

  return (
    <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-20 pointer-events-auto">
      <div className="flex flex-col extreme-glass rounded-2xl p-1 overflow-hidden">
        <button
          type="button"
          onClick={zoomIn}
          className="w-12 h-12 flex items-center justify-center text-[#1b1b1e] hover:bg-white/30 transition-all rounded-xl"
          aria-label="Zoom in"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
        <div className="h-[1px] bg-white/30 mx-2" />
        <button
          type="button"
          onClick={zoomOut}
          className="w-12 h-12 flex items-center justify-center text-[#1b1b1e] hover:bg-white/30 transition-all rounded-xl"
          aria-label="Zoom out"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onMyLocation}
        className="w-14 h-14 extreme-glass rounded-2xl flex items-center justify-center text-[#a04100] shadow-2xl hover:bg-white/40 transition-all"
        aria-label="Center on my location"
      >
        <span className="material-symbols-outlined text-[28px] orange-glow-text">my_location</span>
      </button>
    </div>
  );
}

function MyLocationCenterer({ trigger }: { trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (!trigger || !map || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        map.setZoom(11);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [trigger, map]);
  return null;
}

export default function JobSearch() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const [myLocationTrigger, setMyLocationTrigger] = useState(0);

  const selectedJob = jobs.find(j => j.id === selectedJobId) ?? null;

  const fetchJobs = useCallback(() => {
    const params: seekerApi.JobSearchParams = {};
    if (searchQuery) params.q = searchQuery;
    if (remoteOnly) params.work_mode = 'remote';
    seekerApi.searchJobs(params).then((res) => {
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

  const toggleSave = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    try {
      if (job.saved) {
        await seekerApi.unsaveJob(jobId);
      } else {
        await seekerApi.saveJob(jobId);
      }
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, saved: !j.saved } : j));
    } catch {}
  };

  const handleClearAll = () => {
    setSearchQuery('');
    setRemoteOnly(false);
    setSelectedJobId(null);
  };

  const handleShare = async () => {
    if (!selectedJob) return;
    const url = `${window.location.origin}/seeker/jobs/${selectedJob.id}`;
    const text = `${selectedJob.title} at ${selectedJob.company}`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] -mt-4 overflow-hidden bg-[#fbf9fc]">
      {/* Background Map */}
      <div className="absolute inset-0 z-0">
        {mapsApiKey === null ? (
          <div className="w-full h-full flex items-center justify-center bg-[#dbd9dd]">
            <div className="w-8 h-8 border-2 border-[#ff6b00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mapsApiKey === '' ? (
          <div className="w-full h-full flex items-center justify-center bg-[#dbd9dd]">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-[#8e7164]">map</span>
              <p className="mt-2 text-sm text-[#5d5e60]">Map unavailable</p>
            </div>
          </div>
        ) : (
          <APIProvider apiKey={mapsApiKey}>
            <Map
              defaultCenter={{ lat: 20, lng: 77 }}
              defaultZoom={4}
              mapId="hirely-job-search"
              style={{ width: '100%', height: '100%' }}
              gestureHandling="greedy"
              disableDefaultUI
            >
              <MapWithMarkers
                jobs={jobs}
                selectedJobId={selectedJobId}
                onJobClick={handleJobClick}
              />
              <MyLocationCenterer trigger={myLocationTrigger} />
            </Map>
            <MapControls onMyLocation={() => setMyLocationTrigger((t) => t + 1)} />
          </APIProvider>
        )}
      </div>

      {/* Glass UI Overlay — wrapper is pass-through; children opt back in. */}
      <div className="relative z-10 flex h-full pointer-events-none">
        {/* Job List Pane */}
        <aside className="w-full lg:w-1/3 flex-shrink-0 flex flex-col z-30 glass-panel pointer-events-auto">
          {/* Filter header */}
          <div className="px-6 py-6 flex flex-col gap-5 border-b border-white/20 bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl font-semibold text-[#1b1b1e]">{totalCount || jobs.length} Jobs Found</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[#a04100] text-xs font-semibold hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#5d5e60]">Remote</span>
                <button
                  type="button"
                  onClick={() => setRemoteOnly((v) => !v)}
                  className={`w-10 h-5 rounded-full relative transition-colors border ${
                    remoteOnly ? 'bg-[#ff6b00]/20 border-[#ff6b00]/40' : 'bg-white/10 border-white/30'
                  }`}
                  aria-pressed={remoteOnly}
                  aria-label="Remote only"
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm ${
                      remoteOnly ? 'right-0.5 bg-[#ff6b00] orange-glow' : 'left-0.5 bg-white/80'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <FilterChip label="Job type" />
              <FilterChip label="Salary" />
              <FilterChip label="Date posted" />
              <FilterChip label="Experience" />
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {jobs.length === 0 ? (
              <div className="text-center py-20">
                <span className="material-symbols-outlined text-5xl text-[#8e7164]">search</span>
                <p className="mt-2 text-sm text-[#5d5e60]">No jobs found.</p>
                <p className="text-xs text-[#8e7164] mt-1">Try adjusting your search or filters.</p>
              </div>
            ) : (
              jobs.map((job) => {
                const isSelected = job.id === selectedJobId;
                return (
                  <div
                    key={job.id}
                    onClick={() => handleJobClick(job)}
                    className={`glass-card-floating p-6 rounded-3xl cursor-pointer ${isSelected ? 'active' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-lg ${
                          isSelected
                            ? 'bg-[#ff6b00] text-white orange-glow'
                            : 'bg-white/20 border border-white/40 text-[#1b1b1e] shadow-inner'
                        }`}
                      >
                        {job.logo}
                      </div>
                      <span className="bg-[#ff6b00]/20 text-[#a04100] border border-[#ff6b00]/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Actively recruiting
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-[#1b1b1e]">{job.title}</h3>
                    <p className="text-[#5d5e60] text-sm font-medium mb-4">
                      {job.company}{job.location ? ` • ${job.location}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 bg-white/10 border border-white/30 text-[#5d5e60] rounded-lg text-xs font-medium">
                        {job.type}
                      </span>
                      {job.salary && (
                        <span className="px-3 py-1 bg-white/10 border border-white/30 text-[#5d5e60] rounded-lg text-xs font-medium">
                          {job.salary}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center border-t border-white/20 pt-4 mt-2">
                      <span className="text-xs text-[#5d5e60]">{postedLabel(job.postedDays)}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSave(job.id); }}
                        className={`material-symbols-outlined transition-colors ${
                          job.saved ? 'text-[#ff6b00] orange-glow-text' : 'text-[#5d5e60] hover:text-[#a04100]'
                        }`}
                        style={job.saved ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        aria-label={job.saved ? 'Unsave job' : 'Save job'}
                      >
                        bookmark
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right pane spacer (markers + controls + slab live in the absolute map layer) */}
        <div className="hidden lg:block flex-1 relative pointer-events-none">
          {/* Detail slab */}
          {selectedJob && (
            <div className="absolute bottom-10 left-10 z-20 extreme-glass p-8 rounded-[2.5rem] max-w-lg shadow-2xl flex gap-6 items-center pointer-events-auto">
              <div className="w-24 h-24 rounded-3xl bg-[#ff6b00] text-white flex items-center justify-center font-bold text-3xl shadow-xl orange-glow shrink-0">
                {selectedJob.logo}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-2xl text-[#1b1b1e] leading-tight mb-1 line-clamp-1">{selectedJob.title}</h4>
                <p className="text-[#5d5e60] text-sm font-medium mb-6 line-clamp-1">
                  {selectedJob.company}{selectedJob.location ? ` • ${selectedJob.location}` : ''}
                </p>
                <div className="flex gap-3">
                  <Link
                    to={`/seeker/jobs/${selectedJob.id}`}
                    className="bg-[#ff6b00] text-white font-semibold text-sm px-8 py-3.5 rounded-2xl hover:brightness-110 shadow-lg orange-glow transition-all active:scale-95"
                  >
                    View details
                  </Link>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-14 h-14 extreme-glass flex items-center justify-center rounded-2xl text-[#5d5e60] hover:text-[#a04100] transition-all"
                    aria-label="Share job"
                  >
                    <span className="material-symbols-outlined">share</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 px-4 py-2 rounded-xl border border-white/40 bg-white/10 text-xs font-medium text-[#1b1b1e] hover:bg-white/20 transition-colors whitespace-nowrap"
    >
      {label}
      <span className="material-symbols-outlined text-[16px]">expand_more</span>
    </button>
  );
}
