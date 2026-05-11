import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Activity,
  Building2,
  Briefcase,
  Users,
  File,
  AlertCircle,
} from 'lucide-react';
import * as adminApi from '../../api/admin';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  ipAddress?: string;
}


const actionConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  CREATE: { label: 'Create', color: 'bg-green-50 text-green-700 border-green-200', icon: Plus },
  UPDATE: { label: 'Update', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Edit2 },
  DELETE: { label: 'Delete', color: 'bg-red-50 text-red-700 border-red-200', icon: Trash2 },
  UPDATE_STATUS: { label: 'Status Change', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Activity },
  LOGIN: { label: 'Login', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: LogIn },
  LOGOUT: { label: 'Logout', color: 'bg-gray-50 text-gray-700 border-gray-200', icon: LogOut },
};

const entityConfig: Record<string, { icon: React.ElementType; label: string }> = {
  user: { icon: Users, label: 'User' },
  company: { icon: Building2, label: 'Company' },
  job: { icon: Briefcase, label: 'Job' },
  admin: { icon: Shield, label: 'Admin' },
  category: { icon: Tags, label: 'Category' },
  settings: { icon: Settings, label: 'Settings' },
  ticket: { icon: Ticket, label: 'Ticket' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

function Plus(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></motion.svg>;
}

function Edit2(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></motion.svg>;
}

function Trash2(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></motion.svg>;
}

function LogIn(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></motion.svg>;
}

function LogOut(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></motion.svg>;
}

function Shield(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3 5-3 10"/><path d="M9 17h6"/><path d="M5 14H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/><circle cx="12" cy="17" r="5"/></motion.svg>;
}

function Tags(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></motion.svg>;
}

function Settings(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></motion.svg>;
}

function Ticket(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></motion.svg>;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    adminApi.getAuditLogs({ page: 1, limit: 100 }).then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setLogs(list.map((l: any, i: number) => ({
        id: l._id ?? l.id ?? String(i),
        timestamp: l.created_at ?? l.createdAt ?? l.timestamp ?? '',
        actor: l.user_id?.email ?? l.actor ?? 'System',
        actorId: l.user_id?._id ?? l.user_id ?? '',
        action: l.action ?? '',
        entityType: l.entity_type ?? l.entityType ?? '',
        entityId: l.entity_id ?? l.entityId ?? '',
        details: l.details ?? l.description,
        ipAddress: l.ip_address ?? l.ipAddress,
      })));
    }).catch(() => {});
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const handleExport = () => {
    const csv = ['ID,Timestamp,Actor,Action,Entity Type,Entity ID,Details']
      .concat(filteredLogs.map((l) => `${l.id},${l.timestamp},${l.actor},${l.action},${l.entityType},${l.entityId},${l.details ?? ''}`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">Track all administrative actions on the platform</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium shadow-lg shadow-orange-200"
        >
          <Download className="w-5 h-5" />
          Export Logs
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by actor, action, or entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="UPDATE_STATUS">Status Change</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
        </select>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Entities</option>
          <option value="user">User</option>
          <option value="company">Company</option>
          <option value="job">Job</option>
          <option value="admin">Admin</option>
          <option value="category">Category</option>
          <option value="settings">Settings</option>
          <option value="ticket">Ticket</option>
        </select>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Actions', value: logs.length },
          { label: 'Today', value: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length },
          { label: 'By Admins', value: logs.filter(l => l.actor !== 'System').length },
          { label: 'By System', value: logs.filter(l => l.actor === 'System').length },
        ].map((stat) => (
          <div key={stat.label} className="p-4 bg-white rounded-xl border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Logs Table */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actor</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedLogs.map((log) => {
                const action = actionConfig[log.action] || { label: log.action, color: 'bg-gray-50 text-gray-700 border-gray-200', icon: Activity };
                const entity = entityConfig[log.entityType] || { icon: File, label: log.entityType };
                const ActionIcon = action.icon;
                const EntityIcon = entity.icon;

                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          log.actor === 'System' ? 'bg-gray-100' : 'bg-orange-100'
                        }`}>
                          {log.actor === 'System' ? (
                            <AlertCircle className="w-4 h-4 text-gray-500" />
                          ) : (
                            <User className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{log.actor}</p>
                          <p className="text-xs text-gray-500">{log.actorId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${action.color}`}>
                        <ActionIcon className="w-3.5 h-3.5" />
                        {action.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <EntityIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{entity.label}</span>
                        <span className="text-xs text-gray-400">({log.entityId})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate">{log.details || '-'}</p>
                      {log.ipAddress && (
                        <p className="text-xs text-gray-400 mt-1">IP: {log.ipAddress}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-orange-500 text-white'
                    : 'border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}