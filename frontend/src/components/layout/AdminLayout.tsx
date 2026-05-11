import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { authEndpoints } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Tags,
  Database,
  Ticket,
  BarChart3,
  FileText,
  Shield,
  ShieldCheck,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCog,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/admin/GlobalSearch';

const navItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Companies', path: '/admin/companies', icon: Building2 },
  { name: 'Jobs', path: '/admin/jobs', icon: Briefcase },
  { name: 'AI Insights', path: '/admin/ai-insights', icon: Sparkles },
  { name: 'Categories', path: '/admin/categories', icon: Tags },
  { name: 'Skills', path: '/admin/skills', icon: Database },
  { name: 'Tickets', path: '/admin/tickets', icon: Ticket },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { name: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
  { name: 'Admins', path: '/admin/admins', icon: Shield },
  { name: 'Roles', path: '/admin/roles', icon: ShieldCheck },
  { name: 'Officials', path: '/admin/officials', icon: UserCog },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try { await authEndpoints.logout(); } catch {}
    logout();
    navigate('/admin/login');
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AD';

  return (
    <div className="min-h-screen glass-canvas-deep flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full bg-white/60 backdrop-blur-xl border-r border-white/40 z-30 flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">H</span>
                </div>
                <span className="font-bold text-xl text-gray-900">Hirely</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                      ${isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                      ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-orange-600' : ''}`} />
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-medium text-sm"
                      >
                        {item.name}
                      </motion.span>
                    )}
                    {isActive && !sidebarCollapsed && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-100">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-orange-600 font-semibold text-sm">{initials}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">Admin</p>
                <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Logout">
                <LogOut className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        {/* Top Header */}
        <header className="h-16 bg-white/60 backdrop-blur-xl border-b border-white/40 sticky top-0 z-20">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell variant="admin" />
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center cursor-pointer">
                <span className="text-white font-bold">AD</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}