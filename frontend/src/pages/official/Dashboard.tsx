import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Users, Send, Trophy, MapPin, Radius } from 'lucide-react';
import * as api from '@/api/official';

export default function Dashboard() {
  const [stats, setStats] = useState({
    nearbyJobs: 0,
    pushes: 0,
    hires: 0,
    radius: 0,
    location: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [me, jobs, pushes, hires] = await Promise.all([
          api.getMe(),
          api.getNearbyJobs({ limit: 1 }),
          api.listPushes({ limit: 1 }),
          api.getNearbyHires({ limit: 1 }),
        ]);
        const profile: any = me.data?.data ?? {};
        setStats({
          nearbyJobs: jobs.data?.pagination?.total ?? 0,
          pushes: pushes.data?.pagination?.total ?? 0,
          hires: hires.data?.pagination?.total ?? 0,
          radius: profile.search_radius_km ?? 0,
          location: [profile.city, profile.state, profile.country].filter(Boolean).join(', '),
        });
      } catch {
        /* shown via empty state */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tiles = [
    { label: 'Jobs in Area', value: stats.nearbyJobs, icon: Briefcase, color: 'orange', to: '/official/jobs' },
    { label: 'My Pushes', value: stats.pushes, icon: Send, color: 'blue', to: '/official/pushes' },
    { label: 'Hires in Area', value: stats.hires, icon: Trophy, color: 'green', to: '/official/hires' },
    { label: 'Candidates', value: '—', icon: Users, color: 'purple', to: '/official/candidates' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />{stats.location || 'Set your location in Profile'}</span>
          <span className="inline-flex items-center gap-1.5"><Radius className="w-4 h-4" />{stats.radius || 0} km radius</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          return (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={t.to}
                className="block p-5 bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all"
              >
                <div className={`w-10 h-10 rounded-xl bg-${t.color}-50 flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 text-${t.color}-600`} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{loading ? '—' : t.value}</p>
                <p className="text-sm text-gray-500 mt-1">{t.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white"
      >
        <h2 className="text-xl font-bold mb-1">Push a candidate</h2>
        <p className="text-orange-50 text-sm mb-4">
          Match a candidate from your area with an open job and push their resume directly to the company.
        </p>
        <Link
          to="/official/candidates"
          className="inline-flex items-center px-4 py-2 bg-white text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors"
        >
          Browse candidates
        </Link>
      </motion.div>
    </div>
  );
}
