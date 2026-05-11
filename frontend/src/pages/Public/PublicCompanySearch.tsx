import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, Building2, Search, MapPin, Users, Calendar, ExternalLink,
  Loader2, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
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

interface CompanySearchPageProps {
  /** Render in a chrome-less mode when nested inside an authenticated layout. */
  embedded?: boolean;
}

export default function PublicCompanySearch({ embedded = false }: CompanySearchPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [industry, setIndustry] = useState(searchParams.get('industry') ?? '');
  const [size, setSize] = useState(searchParams.get('size') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasNext: false, hasPrev: false });

  // One-shot industries fetch for the filter chip row.
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

  // Keep URL params in sync so links are shareable / back-button works.
  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (industry) next.set('industry', industry);
    if (size) next.set('size', size);
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [query, industry, size, page, setSearchParams]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const isSeeker = isAuthenticated && user?.role === 'job_seeker';
  const detailHref = (id: string) => (isSeeker ? `/seeker/companies/${id}` : `/companies/${id}`);
  const jobsHref = (id: string) => (isSeeker ? `/seeker/jobs?company=${id}` : `/jobs?company=${id}`);

  const hasFilters = query || industry || size;

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gray-50'}>
      {/* Public chrome (only when not embedded in a layout) */}
      {!embedded && (
        <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Hirely</span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/jobs" className="text-gray-600 hover:text-orange-600 font-medium">Find Jobs</Link>
              <Link to="/companies" className="text-orange-600 font-semibold">Companies</Link>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link to={isSeeker ? '/seeker/dashboard' : '/'} className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="px-3 py-1.5 text-sm text-gray-700 hover:text-orange-600">Sign In</Link>
                  <Link to="/register" className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-4">
              <Building2 className="w-3.5 h-3.5" /> Discover companies hiring on Hirely
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Find your next employer
            </h1>
            <p className="text-orange-50 text-base md:text-lg">
              Browse {pagination.total > 0 ? pagination.total.toLocaleString() : ''} approved companies — see what they do, who works there, and the roles they're hiring for.
            </p>
          </motion.div>

          <form onSubmit={onSearchSubmit} className="mt-6 max-w-3xl">
            <div className="flex items-center bg-white rounded-xl shadow-lg overflow-hidden">
              <Search className="w-5 h-5 text-gray-400 ml-4" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search companies by name…"
                className="flex-1 px-3 py-3 text-gray-900 outline-none text-sm md:text-base"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setPage(1); }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-3 bg-orange-700 text-white font-semibold hover:bg-orange-800 transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Filters + results */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => { setIndustry(''); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                industry === ''
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All industries
            </button>
            {industries.map((ind) => (
              <button
                key={ind}
                onClick={() => { setIndustry(ind); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  industry === ind
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <select
                value={size}
                onChange={(e) => { setSize(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            {hasFilters && (
              <button
                onClick={() => { setQuery(''); setIndustry(''); setSize(''); setPage(1); }}
                className="text-xs text-gray-500 hover:text-orange-600 font-medium"
              >
                Clear filters
              </button>
            )}
            <div className="ml-auto text-xs text-gray-500">
              {loading ? 'Loading…' : `${pagination.total} companies`}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading && companies.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))
          ) : companies.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900">No companies found</h3>
              <p className="text-sm text-gray-500 mt-1">Try removing some filters or searching with a different name.</p>
            </div>
          ) : (
            companies.map((c, idx) => (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all p-5 flex flex-col"
              >
                <div className="flex items-start gap-3">
                  {c.logo_url ? (
                    <img
                      src={resolveAsset(c.logo_url)}
                      alt=""
                      className="w-14 h-14 rounded-xl object-contain bg-white border border-gray-100 p-1 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-bold text-lg flex-shrink-0">
                      {c.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link to={detailHref(c._id)} className="font-semibold text-gray-900 hover:text-orange-600 truncate block">
                      {c.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
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
                </div>

                {c.description && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-3">
                    {c.description}
                  </p>
                )}

                <div className="mt-auto pt-4 flex items-center justify-between">
                  <Link
                    to={jobsHref(c._id)}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    {c.open_jobs} open {c.open_jobs === 1 ? 'role' : 'roles'}
                  </Link>
                  <Link
                    to={detailHref(c._id)}
                    className="text-xs font-medium text-gray-600 hover:text-orange-600 inline-flex items-center gap-1"
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
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev || loading}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext || loading}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 inline-flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {loading && companies.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white rounded-full px-3 py-1.5 shadow-lg border border-gray-200 text-xs text-gray-500 inline-flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Updating…
        </div>
      )}
    </div>
  );
}

// Suppress unused warning for navigate (kept available for future use).
void useNavigate;
