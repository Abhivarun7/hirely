import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { authEndpoints } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import NotificationBell from '@/components/NotificationBell';

export default function SeekerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const onDashboard = location.pathname.startsWith('/seeker/dashboard');
  const onJobs = location.pathname.startsWith('/seeker/jobs');
  const onCompanies = location.pathname.startsWith('/seeker/companies');

  // Sync the global search box with the current URL so deep-linking and
  // browser back keep the input showing the truth.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('q') ?? '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try { await authEndpoints.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search routes by current page: stay on companies if you're on companies, else jobs.
    const target = onCompanies ? '/seeker/companies' : '/seeker/jobs';
    const q = searchQuery.trim();
    navigate(q ? `${target}?q=${encodeURIComponent(q)}` : target);
  };

  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-[#fbf9fc]">
      {/* Top Header Navigation */}
      <header className="extreme-glass fixed top-0 w-full z-50">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 h-16 gap-4">
          {/* Logo + primary nav */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/seeker/dashboard" className="flex items-center mr-2">
              <span className="text-2xl font-black tracking-tighter text-[#ff6b00] orange-glow-text">Hirely</span>
            </Link>
            <NavButton to="/seeker/dashboard" icon="home" label="Home" active={onDashboard} />
            <NavButton to="/seeker/jobs" icon="work" label="Jobs" active={onJobs} />
            <NavButton to="/seeker/companies" icon="apartment" label="Companies" active={onCompanies} />
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl flex items-center">
            <div className="flex items-center w-full bg-white/40 rounded-2xl border border-white/60 focus-within:border-[#ff6b00] focus-within:ring-2 focus-within:ring-[#ff6b00]/30 transition-all backdrop-blur-md">
              <div className="flex items-center flex-1 px-4">
                <span className="material-symbols-outlined text-[#8e7164] mr-2">search</span>
                <input
                  type="text"
                  placeholder={onCompanies ? 'Search companies...' : 'Search jobs, skills, or companies...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-sm text-[#1b1b1e] placeholder:text-[#8e7164] py-2"
                />
              </div>
              <button
                type="submit"
                className="m-1 px-3 py-1.5 bg-[#ff6b00] text-white rounded-xl hover:brightness-110 active:scale-95 orange-glow transition-all"
                aria-label="Search"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
            </div>
          </form>

          {/* Profile dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell variant="glass" />
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1 p-1 pr-2 rounded-full bg-white/40 border border-white/60 hover:bg-white/60 transition-all"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
              >
                <div className="w-9 h-9 rounded-full bg-[#ff6b00]/20 border border-white/60 flex items-center justify-center text-[#a04100] font-bold">
                  {userInitial}
                </div>
                <span className="material-symbols-outlined text-[#5d5e60] text-[20px]">arrow_drop_down</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-[#e2bfb0]/40 shadow-2xl overflow-hidden z-50">
                  {/* User Info */}
                  <div className="p-4 border-b border-[#efedf0]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#ff6b00]/15 border border-[#ff6b00]/30 flex items-center justify-center text-[#a04100] font-bold text-lg">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1b1b1e] truncate">{user?.email || 'User'}</p>
                        <Link
                          to="/seeker/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="text-xs text-[#a04100] hover:underline flex items-center gap-1 font-medium"
                        >
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <nav className="py-2">
                    <DropdownLink to="/seeker/applications" icon="description" label="Applications" onClick={() => setDropdownOpen(false)} active={location.pathname.startsWith('/seeker/applications')} />
                    <DropdownLink to="/seeker/saved" icon="bookmark" label="Saved Jobs" onClick={() => setDropdownOpen(false)} active={location.pathname.startsWith('/seeker/saved')} />
                    <DropdownLink to="/seeker/support" icon="support_agent" label="Help & Support" onClick={() => setDropdownOpen(false)} active={location.pathname.startsWith('/seeker/support')} />
                  </nav>

                  {/* Settings */}
                  <div className="border-t border-[#efedf0] py-2">
                    <button
                      type="button"
                      className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-[#5d5e60] hover:bg-[#fbf9fc] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">settings</span>
                      <span>Settings</span>
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-[#efedf0] py-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-red-600 hover:bg-red-500/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}

function DropdownLink({
  to,
  icon,
  label,
  onClick,
  active,
}: {
  to: string;
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        active
          ? 'bg-[#ff6b00]/10 text-[#a04100] font-semibold'
          : 'text-[#5d5e60] hover:bg-[#fbf9fc]'
      }`}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function NavButton({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`hidden sm:inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border text-sm font-semibold transition-all ${
        active
          ? 'bg-[#ff6b00] text-white border-[#ff6b00] orange-glow'
          : 'bg-white/40 text-[#5d5e60] border-white/60 hover:bg-white/60 hover:text-[#a04100]'
      }`}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}