import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, Briefcase, UserCog, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as adminApi from '@/api/admin';

type EntityKind = 'company' | 'job' | 'official';

interface ResultItem {
  id: string;
  kind: EntityKind;
  title: string;
  subtitle?: string;
  badge?: string;
  path: string;
}

const KIND_META: Record<EntityKind, { label: string; icon: typeof Search; accent: string }> = {
  company: { label: 'Companies', icon: Building2, accent: 'bg-purple-500/10 text-purple-500' },
  job: { label: 'Jobs', icon: Briefcase, accent: 'bg-[#ff6b00]/10 text-[#a04100]' },
  official: { label: 'Officials', icon: UserCog, accent: 'bg-blue-500/10 text-blue-500' },
};

const PER_KIND = 4;

function fullName(first?: string, last?: string): string {
  return [first, last].filter(Boolean).join(' ').trim();
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch
  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const myRequestId = ++requestIdRef.current;
    setLoading(true);

    Promise.allSettled([
      adminApi.getCompanies({ search: debounced, limit: PER_KIND, page: 1 }),
      adminApi.getAdminJobs({ search: debounced, limit: PER_KIND, page: 1 }),
      adminApi.getOfficials({ search: debounced, limit: PER_KIND, page: 1 }),
    ]).then(([compRes, jobRes, offRes]) => {
      if (requestIdRef.current !== myRequestId) return;

      const merged: ResultItem[] = [];

      if (compRes.status === 'fulfilled') {
        const list: any[] = (compRes.value as any)?.data?.data ?? [];
        for (const c of list) {
          merged.push({
            id: String(c._id ?? c.id),
            kind: 'company',
            title: c.name ?? 'Untitled company',
            subtitle: c.slug ? `@${c.slug}` : c.website ?? '',
            badge: c.approval_status ?? c.status,
            path: '/admin/companies',
          });
        }
      }

      if (jobRes.status === 'fulfilled') {
        const list: any[] = (jobRes.value as any)?.data?.data ?? [];
        for (const j of list) {
          const companyName =
            typeof j.company_id === 'object' && j.company_id ? j.company_id.name : undefined;
          merged.push({
            id: String(j._id ?? j.id),
            kind: 'job',
            title: j.title ?? 'Untitled job',
            subtitle: companyName ?? j.location ?? '',
            badge: j.status,
            path: '/admin/jobs',
          });
        }
      }

      if (offRes.status === 'fulfilled') {
        const list: any[] = (offRes.value as any)?.data?.data ?? [];
        for (const o of list) {
          const name = fullName(o.first_name, o.last_name) || o.user_id?.email || 'Official';
          const subtitleParts = [o.designation, o.city].filter(Boolean);
          merged.push({
            id: String(o._id ?? o.id),
            kind: 'official',
            title: name,
            subtitle: subtitleParts.join(' · '),
            badge: o.is_active === false ? 'inactive' : 'active',
            path: '/admin/officials',
          });
        }
      }

      setResults(merged);
      setHighlight(0);
      setLoading(false);
    });
  }, [debounced]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const grouped = useMemo(() => {
    const out: Record<EntityKind, ResultItem[]> = { company: [], job: [], official: [] };
    for (const r of results) out[r.kind].push(r);
    return out;
  }, [results]);

  const flatOrder = useMemo<ResultItem[]>(
    () => [...grouped.company, ...grouped.job, ...grouped.official],
    [grouped]
  );

  const handleSelect = (item: ResultItem) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(item.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, flatOrder.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      const item = flatOrder[highlight];
      if (item) handleSelect(item);
    }
  };

  const showDropdown = open && (debounced.length >= 2 || query.length >= 1);

  return (
    <div ref={containerRef} className="relative max-w-md w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8c8e] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search companies, jobs, officials..."
        className="w-full pl-10 pr-16 py-2 bg-white/40 backdrop-blur-xl border border-white/50 rounded-xl text-sm text-[#1b1b1e] placeholder:text-[#8b8c8e] focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/40 focus:border-transparent"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-[#5d5e60] bg-white/60 border border-white/60 rounded pointer-events-none">
        {navigator.platform.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl+K'}
      </kbd>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 left-0 right-0 mt-2 glass-card-deep rounded-2xl overflow-hidden max-h-[min(70vh,520px)] overflow-y-auto"
          >
            <span className="specular-edge" />

            {debounced.length < 2 ? (
              <p className="p-4 text-sm text-[#5d5e60]">Keep typing to search...</p>
            ) : loading ? (
              <div className="p-4 text-sm text-[#5d5e60] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </div>
            ) : flatOrder.length === 0 ? (
              <p className="p-4 text-sm text-[#5d5e60]">
                No results for "<span className="font-medium text-[#1b1b1e]">{debounced}</span>".
              </p>
            ) : (
              <div className="py-1">
                {(['company', 'job', 'official'] as EntityKind[]).map((kind) => {
                  const items = grouped[kind];
                  if (items.length === 0) return null;
                  const meta = KIND_META[kind];
                  const Icon = meta.icon;
                  return (
                    <div key={kind} className="px-1 py-1">
                      <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#5d5e60] uppercase">
                        {meta.label}
                      </div>
                      {items.map((item) => {
                        const flatIndex = flatOrder.indexOf(item);
                        const isHL = flatIndex === highlight;
                        return (
                          <button
                            key={`${kind}-${item.id}`}
                            type="button"
                            onMouseEnter={() => setHighlight(flatIndex)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelect(item);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                              isHL ? 'bg-white/60' : 'hover:bg-white/40'
                            }`}
                          >
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.accent}`}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1b1b1e] truncate">
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-xs text-[#5d5e60] truncate">{item.subtitle}</p>
                              )}
                            </div>
                            {item.badge && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/60 border border-white/60 text-[#5d5e60] capitalize shrink-0">
                                {item.badge.replace(/_/g, ' ')}
                              </span>
                            )}
                            <ArrowRight
                              className={`w-4 h-4 shrink-0 transition-opacity ${
                                isHL ? 'opacity-100 text-[#ff6b00]' : 'opacity-0'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-3 py-2 border-t border-white/40 text-[10px] text-[#8b8c8e] flex justify-between bg-white/20">
              <span>
                <kbd className="px-1 py-0.5 bg-white/60 border border-white/60 rounded">↑↓</kbd>{' '}
                navigate
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-white/60 border border-white/60 rounded">↵</kbd>{' '}
                open ·{' '}
                <kbd className="px-1 py-0.5 bg-white/60 border border-white/60 rounded">esc</kbd>{' '}
                close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
