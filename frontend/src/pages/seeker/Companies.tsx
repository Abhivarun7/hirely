import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, Building2, MapPin, Users, Calendar, ExternalLink,
  Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  searchPublicCompanies, getPublicCompanyIndustries, type PublicCompany,
} from '../../api/public';
import { API_BASE_URL } from '../../api/client';

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
const resolveAsset = (url?: string) =>
  !url ? '' : /^https?:\/\//i.test(url) ? url : `${ASSET_BASE_URL}${url}`;

const SIZE_OPTIONS = [
  { value: '', label: 'Any size' },
  { value: '1-10', label: '1–10' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '201-500', label: '201–500' },
  { value: '500+', label: '500+' },
];

export default function Companies() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get('q') ?? '';
  const [industry, setIndustry] = useState(searchParams.get('industry') ?? '');
  const [size, setSize] = useState(searchParams.get('size') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasNext: false, hasPrev: false });

  useEffect(() => {
    getPublicCompanyIndustries()
      .then((res) => {
        const list: any[] = res.data?.data ?? [];
        setIndustries(list.filter((i) => typeof i === 'string'));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchPublicCompanies({
        q: query || undefined,
        industry: industry || undefined,
        company_size: size || undefined,
        page,
        limit: 12,
      });
      const list: PublicCompany[] = res.data?.data ?? [];
      setCompanies(list);
      const p = res.data?.pagination ?? {};
      setPagination({
        total: p.total ?? 0,
        totalPages: p.totalPages ?? 1,
        hasNext: !!p.hasNext,
        hasPrev: !!p.hasPrev,
      });
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [query, industry, size, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (industry) next.set('industry', industry); else next.delete('industry');
    if (size) next.set('size', size); else next.delete('size');
    if (page > 1) next.set('page', String(page)); else next.delete('page');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry, size, page]);

  const hasFilters = query || industry || size;

  return (
    <div className="glass-canvas relative min-h-[calc(100vh-4rem)] -mt-4 pt-4 pb-20 overflow-hidden">
      <span className="organic-shape bg-[#ff6b00] w-[500px] h-[500px] -top-24 -left-24" />
      <span className="organic-shape bg-[#c6c6c7] w-[400px] h-[400px] top-1/2 right-0" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-10 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1b1b1e]">
              {query ? `Companies matching "${query}"` : 'Browse companies'}
            </h1>
            <p className="text-base text-[#5d5e60] mt-1">
              {loading ? 'Loading…' : `${pagination.total} ${pagination.total === 1 ? 'company' : 'companies'}`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <FilterPill
              label="All industries"
              active={industry === ''}
              onClick={() => { setIndustry(''); setPage(1); }}
            />
            {industries.map((ind) => (
              <FilterPill
                key={ind}
                label={ind}
                active={industry === ind}
                onClick={() => { setIndustry(ind); setPage(1); }}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#5d5e60]" />
              <select
                value={size}
                onChange={(e) => { setSize(e.target.value); setPage(1); }}
                className="px-3 py-1.5 bg-white/60 border border-white/60 rounded-xl text-xs text-[#1b1b1e] focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/40 focus:border-[#ff6b00]"
              >
                {SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setIndustry(''); setSize(''); setPage(1); }}
                className="text-xs text-[#a04100] hover:underline font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && companies.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-3xl h-48 animate-pulse" />
            ))
          ) : companies.length === 0 ? (
            <div className="col-span-full glass-card rounded-3xl p-12 text-center">
              <Building2 className="w-12 h-12 text-[#8e7164] mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-semibold text-[#1b1b1e]">No companies found</h3>
              <p className="text-sm text-[#5d5e60] mt-1">
                Try removing some filters or searching with a different name.
              </p>
            </div>
          ) : (
            companies.map((c, idx) => (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="glass-card-floating p-6 rounded-3xl flex flex-col"
              >
                <Link to={`/seeker/companies/${c._id}`} className="flex items-start gap-3">
                  {c.logo_url ? (
                    <img
                      src={resolveAsset(c.logo_url)}
                      alt=""
                      className="w-14 h-14 rounded-2xl object-contain bg-white/60 backdrop-blur-md border border-white/40 p-2 shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#ff6b00]/20 border border-white/40 flex items-center justify-center text-[#a04100] font-bold text-lg flex-shrink-0">
                      {c.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[#1b1b1e] hover:text-[#a04100] transition-colors truncate block">
                      {c.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#5d5e60]">
                      {c.industry && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {c.industry}
                        </span>
                      )}
                      {c.company_size && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" /> {c.company_size}
                        </span>
                      )}
                      {c.founding_year && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Est. {c.founding_year}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {c.description && (
                  <p className="mt-3 text-sm text-[#5d5e60] line-clamp-3">
                    {c.description}
                  </p>
                )}

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/30">
                  <Link
                    to={`/seeker/companies/${c._id}`}
                    className="text-xs font-semibold text-[#a04100] hover:text-[#ff6b00] inline-flex items-center gap-1"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    {c.open_jobs} open {c.open_jobs === 1 ? 'role' : 'roles'}
                  </Link>
                  <Link
                    to={`/seeker/companies/${c._id}`}
                    className="text-xs font-medium text-[#5d5e60] hover:text-[#a04100] inline-flex items-center gap-1"
                  >
                    View profile <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev || loading}
              className="px-4 py-2 glass-card rounded-2xl text-sm font-medium text-[#1b1b1e] hover:bg-white/60 disabled:opacity-40 inline-flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-sm text-[#5d5e60] px-3">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext || loading}
              className="px-4 py-2 glass-card rounded-2xl text-sm font-medium text-[#1b1b1e] hover:bg-white/60 disabled:opacity-40 inline-flex items-center gap-1 transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading && companies.length > 0 && (
          <div className="fixed bottom-4 right-4 glass-card rounded-full px-3 py-1.5 text-xs text-[#5d5e60] inline-flex items-center gap-1.5 z-30">
            <Loader2 className="w-3 h-3 animate-spin" /> Updating…
          </div>
        )}
      </main>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
        active
          ? 'bg-[#ff6b00] text-white border-[#ff6b00] orange-glow'
          : 'bg-white/40 text-[#5d5e60] border-white/60 hover:bg-white/60'
      }`}
    >
      {label}
    </button>
  );
}
