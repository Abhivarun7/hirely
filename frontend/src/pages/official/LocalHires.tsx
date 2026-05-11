import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Building2, MapPin, User } from 'lucide-react';
import * as api from '@/api/official';

interface HireRow {
  _id: string;
  updated_at: string;
  applied_at: string;
  job_id?: { title?: string; locations?: { city?: string; state?: string }[]; company_id?: { name?: string; logo_url?: string } };
  seeker_id?: { first_name?: string; last_name?: string; city?: string; state?: string };
  referred_by?: { email?: string };
}

export default function LocalHires() {
  const [items, setItems] = useState<HireRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationMissing, setLocationMissing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getNearbyHires({ limit: 100 });
        setItems(res.data?.data ?? []);
        setLocationMissing(!!res.data?.location_missing);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900">Local Hires</h1>
        <p className="text-gray-600 mt-1">People hired by companies in your radius</p>
      </motion.div>

      {locationMissing && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Set your location in Profile to see local hires.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading && <div className="p-10 text-center text-gray-500">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="p-10 text-center text-gray-500">No hires recorded in your area yet.</div>
        )}
        {!loading && items.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {items.map((h) => (
              <li key={h._id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-gray-900 inline-flex items-center gap-1.5">
                        <User className="w-4 h-4 text-gray-400" />
                        {h.seeker_id?.first_name} {h.seeker_id?.last_name}
                      </span>
                      <span className="text-gray-400">·</span>
                      <span className="inline-flex items-center gap-1.5 text-gray-700">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {h.job_id?.company_id?.name ?? 'Unknown company'}
                      </span>
                      <span className="text-gray-500 text-sm">— {h.job_id?.title ?? 'Job'}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                      {h.job_id?.locations?.[0] && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {[h.job_id.locations[0].city, h.job_id.locations[0].state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {h.referred_by?.email && (
                        <span>Referred by: {h.referred_by.email}</span>
                      )}
                      <span>Hired {new Date(h.updated_at).toLocaleDateString()}</span>
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
