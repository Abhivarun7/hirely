import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Briefcase, Building2, MapPin } from 'lucide-react';
import * as api from '@/api/official';

interface JobRow {
  _id: string;
  title: string;
  status: string;
  job_type?: string;
  work_mode?: string;
  locations?: { city?: string; state?: string; country?: string }[];
  company_id?: { name?: string; logo_url?: string };
  category_id?: { name?: string };
  experience_level?: string;
}

export default function NearbyJobs() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationMissing, setLocationMissing] = useState(false);

  const fetch = async (q?: string) => {
    setLoading(true);
    try {
      const res = await api.getNearbyJobs({ limit: 50, search: q || undefined });
      setJobs(res.data?.data ?? []);
      setLocationMissing(!!res.data?.location_missing);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900">Nearby Jobs</h1>
        <p className="text-gray-600 mt-1">Active openings within your assigned radius</p>
      </motion.div>

      {locationMissing && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Your location isn't set yet. Set it in Profile to filter by radius — showing all jobs for now.
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); fetch(search); }}
        className="flex gap-3"
      >
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, description…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700">
          Search
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading && <div className="p-10 text-center text-gray-500">Loading…</div>}
        {!loading && jobs.length === 0 && (
          <div className="p-10 text-center text-gray-500">No jobs found in your area.</div>
        )}
        {!loading && jobs.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {jobs.map((job) => (
              <li key={job._id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    {job.company_id?.logo_url ? (
                      <img src={job.company_id.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <Briefcase className="w-6 h-6 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {job.company_id?.name ?? 'Unknown company'}
                      </span>
                      {job.locations?.[0] && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {[job.locations[0].city, job.locations[0].state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {job.category_id?.name && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                          {job.category_id.name}
                        </span>
                      )}
                      {job.work_mode && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs capitalize">
                          {job.work_mode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
