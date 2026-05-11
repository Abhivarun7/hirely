import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { authEndpoints } from '@/api/auth';
import { companyEndpoints } from '@/api/company';
import { useAuthStore } from '@/store/authStore';
import NotificationBell from '@/components/NotificationBell';

const navItems = [
  { path: '/company/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/company/jobs', label: 'Jobs', icon: 'work' },
  { path: '/company/applicants', label: 'Applicants', icon: 'groups' },
  { path: '/company/insights', label: 'AI Insights', icon: 'psychology' },
  { path: '/company/profile', label: 'Profile', icon: 'account_circle' },
  { path: '/company/team', label: 'Team', icon: 'group' },
  { path: '/company/branches', label: 'Branches', icon: 'location_on' },
  { path: '/company/support', label: 'Help & Support', icon: 'support_agent' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return letters || 'CO';
}

export default function CompanyLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  const isActive = (path: string) => location.pathname.startsWith(path);

  useEffect(() => {
    let cancelled = false;
    async function loadCompany() {
      try {
        const res = await companyEndpoints.getProfile();
        if (cancelled) return;
        const data = (res?.data as any)?.data ?? res?.data ?? {};
        setCompanyName(data.name ?? '');
        setCompanyLogo(data.logo_url ?? data.logo ?? null);
      } catch {
        // keep defaults
      }
    }
    loadCompany();
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = companyName ? getInitials(companyName) : 'CO';
  const displayName = companyName || 'Your Company';

  const handleLogout = async () => {
    try {
      await authEndpoints.logout();
    } catch {}
    logout();
    navigate('/login');
  };

  const renderNav = (onNav?: () => void) => (
    <nav className="flex-1 px-4 space-y-1">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNav}
            className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              active
                ? 'text-[#a04100] bg-[#ff6b00]/10 font-bold border-r-4 border-[#a04100] active-glow-strong'
                : 'text-[#5d5e60] hover:bg-white/40 hover:text-[#a04100]'
            }`}
          >
            <span
              className={`material-symbols-outlined ${active ? 'orange-glow-bleed' : 'group-hover:orange-glow-bleed'}`}
            >
              {item.icon}
            </span>
            <span className="text-[16px] leading-6">{item.label}</span>
            {active && (
              <motion.div
                layoutId="companyActiveDot"
                className="ml-auto w-1.5 h-1.5 bg-[#a04100] rounded-full orange-glow-bleed"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const renderBrand = () => (
    <div className="px-6 mb-10">
      <Link to="/" className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[#ff6b00] rounded-xl flex items-center justify-center shadow-lg active-glow-strong">
          <span className="material-symbols-outlined text-white text-2xl">apartment</span>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#a04100] to-orange-400 leading-tight">
            Hirely
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#5d5e60]">
            TalentPulse Portal
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/40">
        {companyLogo ? (
          <img
            src={companyLogo}
            alt={displayName}
            className="w-10 h-10 shrink-0 rounded-xl object-contain bg-white p-1 border border-white/60 shadow-md"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[#a04100] flex items-center justify-center text-white font-bold text-sm orange-glow-bleed">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-semibold text-[#1b1b1e] truncate leading-tight"
            title={displayName}
          >
            {displayName}
          </p>
          <p className="mt-1 text-[10px] font-bold text-[#a04100] bg-[#ff6b00]/10 px-1.5 py-0.5 rounded inline-block">
            Company
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen glass-canvas-deep flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:h-screen z-50 glass-pane glass-noise py-8 border-r border-white/40">
        <div className="specular-edge" />
        {renderBrand()}
        {renderNav()}
        <div className="mt-auto px-4 pt-4 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-[#5d5e60] hover:bg-red-500/10 hover:text-red-600"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-[16px]">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50 flex flex-col glass-pane glass-noise py-8 border-r border-white/40"
            >
              <div className="specular-edge" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 text-[#5d5e60] hover:text-[#a04100] z-10"
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              {renderBrand()}
              {renderNav(() => setSidebarOpen(false))}
              <div className="mt-auto px-4 pt-4 border-t border-white/20">
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-[#5d5e60] hover:bg-red-500/10 hover:text-red-600"
                >
                  <span className="material-symbols-outlined">logout</span>
                  <span className="text-[16px]">Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 relative">
        {/* Top Header (Mobile) — kept untouched per design constraint */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link to="/" className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-base">apartment</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              Hirely
            </span>
          </Link>
          <NotificationBell variant="admin" />
        </header>

        {/* Floating bell on desktop (no fixed top header in this layout). */}
        <div className="hidden lg:block fixed top-6 right-6 z-30">
          <NotificationBell variant="admin" />
        </div>

        <main className="p-4 lg:p-10 max-w-[1440px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
