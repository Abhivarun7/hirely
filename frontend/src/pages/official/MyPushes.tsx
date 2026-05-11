import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Building2, User } from 'lucide-react';
import * as api from '@/api/official';

interface PushRow {
  _id: string;
  candidate_kind: 'registered' | 'walk_in';
  pushed_at: string;
  current_status: string;
  push_note?: string;
  job_id?: { _id: string; title?: string; company_id?: { name?: string; logo_url?: string } };
  seeker_id?: { _id: string; first_name?: string; last_name?: string; city?: string; state?: string };
}

const statusColor: Record<string, string> = {
  applied: 'bg-blue-50 text-blue-700 border-blue-200',
  reviewed: 'bg-purple-50 text-purple-700 border-purple-200',
  shortlisted: 'bg-amber-50 text-amber-700 border-amber-200',
  interview_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  offer_extended: 'bg-orange-50 text-orange-700 border-orange-200',
  hired: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  withdrawn: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function MyPushes() {
  const [items, setItems] = useState<PushRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.listPushes({ limit: 100 });
        setItems(res.data?.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900">My Pushes</h1>
        <p className="text-gray-600 mt-1">Resumes you've pushed and where they stand</p>
      </motion.div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading && <div className="p-10 text-center text-gray-500">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="p-10 text-center text-gray-500">You haven't pushed any candidates yet.</div>
        )}
        {!loading && items.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {items.map((p) => (
              <li key={p._id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Send className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-gray-900 inline-flex items-center gap-1.5">
                        <User className="w-4 h-4 text-gray-400" />
                        {p.seeker_id?.first_name} {p.seeker_id?.last_name}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="inline-flex items-center gap-1.5 text-gray-700">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {p.job_id?.title ?? 'Job'} ({p.job_id?.company_id?.name ?? '—'})
                      </span>
                      {p.candidate_kind === 'walk_in' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium uppercase tracking-wider">
                          Walk-in
                        </span>
                      )}
                    </div>
                    {p.push_note && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{p.push_note}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Pushed {new Date(p.pushed_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusColor[p.current_status] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    {p.current_status.replace(/_/g, ' ')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
