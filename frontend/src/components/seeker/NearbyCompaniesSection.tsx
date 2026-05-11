import { Link } from 'react-router-dom';

export interface NearbyCompany {
  company_id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  industry?: string;
  nearest_branch: { city: string; distance_km: number };
  new_openings_count: number;
  sample_jobs: { _id: string; title: string; posted_days_ago: number }[];
}

interface Props {
  companies: NearbyCompany[];
  loading?: boolean;
  hasCoords: boolean;
  onRequestLocation: () => void;
  onCardClick?: (c: NearbyCompany) => void;
}

export default function NearbyCompaniesSection({
  companies,
  loading,
  hasCoords,
  onRequestLocation,
  onCardClick,
}: Props) {
  return (
    <section className="bg-white rounded-xl border border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-on-surface inline-flex items-center">
          <span className="material-symbols-outlined mr-2 text-blue-500">apartment</span>
          Companies hiring near you
        </h2>
        <Link
          to="/seeker/jobs"
          className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
        >
          See all
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border border-zinc-100 rounded-xl animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-100 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !hasCoords ? (
        <div className="text-center py-10 px-4">
          <span className="material-symbols-outlined text-4xl text-zinc-300">my_location</span>
          <p className="text-sm text-tertiary mt-2">
            Share your location to discover companies hiring nearby.
          </p>
          <button
            type="button"
            onClick={onRequestLocation}
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined text-base">my_location</span>
            Use my location
          </button>
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-10 px-4">
          <span className="material-symbols-outlined text-4xl text-zinc-300">domain_disabled</span>
          <p className="text-sm text-tertiary mt-2">
            No companies in your area have posted new openings recently.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {companies.map((c) => (
            <Link
              key={c.company_id}
              to={`/seeker/companies/${c.company_id}`}
              onClick={() => onCardClick?.(c)}
              className="p-4 border border-zinc-200 rounded-xl hover:border-blue-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt={c.name}
                    className="w-12 h-12 rounded-xl object-contain bg-white border border-zinc-100 p-1"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-on-surface truncate group-hover:text-blue-600 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-xs text-tertiary truncate">
                    {c.industry ?? 'Hiring company'}
                    {' · '}
                    {c.nearest_branch.city} · {c.nearest_branch.distance_km} km
                  </p>
                  <p className="mt-2 text-xs font-medium text-blue-600 inline-flex items-center">
                    <span className="material-symbols-outlined text-sm mr-1">work</span>
                    {c.new_openings_count} new opening{c.new_openings_count === 1 ? '' : 's'}
                  </p>
                  {c.sample_jobs.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {c.sample_jobs.slice(0, 2).map((j) => (
                        <li key={j._id} className="text-xs text-zinc-600 truncate">
                          • {j.title}
                          <span className="text-zinc-400">
                            {' '}
                            · {j.posted_days_ago === 0 ? 'today' : `${j.posted_days_ago}d ago`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
