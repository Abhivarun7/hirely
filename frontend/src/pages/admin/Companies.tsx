import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle as XCircleIcon,
  Ban,
  Pause,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Globe,
} from 'lucide-react';
import * as adminApi from '../../api/admin';

interface Company {
  id: string;
  name: string;
  email: string;
  industry: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'banned';
  registeredDate: string;
  logo?: string;
  website?: string;
  description?: string;
  employeeCount?: string;
}


const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircleIcon },
  suspended: { label: 'Suspended', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Pause },
  banned: { label: 'Banned', color: 'bg-gray-50 text-gray-700 border-gray-200', icon: Ban },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    adminApi.getCompanies({ page: 1, limit: 100 }).then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setCompanies(list.map((c: any) => ({
        id: c._id ?? c.id,
        name: c.name ?? '',
        email: c.email ?? '',
        industry: c.industry ?? '',
        status: c.status ?? 'pending',
        registeredDate: c.created_at ?? c.createdAt ?? '',
        website: c.website ?? '',
        description: c.description ?? '',
        employeeCount: c.employee_count ?? '',
      })));
    }).catch(() => {});
  }, []);

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  const handleStatusChange = async (companyId: string, newStatus: Company['status']) => {
    try {
      if (newStatus === 'approved') await adminApi.approveCompany(companyId);
      else if (newStatus === 'rejected') await adminApi.rejectCompany(companyId);
      else if (newStatus === 'suspended') await adminApi.suspendCompany(companyId);
      else if (newStatus === 'banned') await adminApi.banCompany(companyId);
      setCompanies((prev) => prev.map((c) => c.id === companyId ? { ...c, status: newStatus } : c));
    } catch {}
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
          <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
          <p className="text-gray-600 mt-1">Review and manage company registrations</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['all', 'pending', 'approved', 'rejected', 'suspended'].map((status) => {
          const count = status === 'all'
            ? companies.length
            : companies.filter(c => c.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`p-4 rounded-xl border transition-all ${
                statusFilter === status
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 capitalize">{status}</p>
            </button>
          );
        })}
      </motion.div>

      {/* Table */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedCompanies.map((company) => {
                const status = statusConfig[company.status];
                const StatusIcon = status.icon;
                return (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                          <span className="text-orange-600 font-bold text-sm">
                            {company.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{company.name}</p>
                          <p className="text-sm text-gray-500">{company.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{company.industry}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(company.registeredDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedCompany(company)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        {company.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(company.id, 'approved')}
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(company.id, 'rejected')}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircleIcon className="w-4 h-4 text-red-500" />
                            </button>
                          </>
                        )}
                        {company.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(company.id, 'suspended')}
                            className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Suspend"
                          >
                            <Pause className="w-4 h-4 text-orange-500" />
                          </button>
                        )}
                        {company.status !== 'banned' && company.status !== 'pending' && (
                          <button
                            onClick={() => handleStatusChange(company.id, 'banned')}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Ban"
                          >
                            <Ban className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} companies
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

      {/* Company Detail Modal */}
      {selectedCompany && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCompany(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
              <button
                onClick={() => setSelectedCompany(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-2xl">
                    {selectedCompany.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedCompany.name}</h3>
                  <p className="text-gray-500">{selectedCompany.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedCompany.website && (
                      <a
                        href={selectedCompany.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Industry</p>
                  <p className="font-medium text-gray-900">{selectedCompany.industry}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Employee Count</p>
                  <p className="font-medium text-gray-900">{selectedCompany.employeeCount}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Registered Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedCompany.registeredDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[selectedCompany.status].color}`}>
                    {selectedCompany.status}
                  </span>
                </div>
              </div>
              {selectedCompany.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="text-gray-700">{selectedCompany.description}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              {selectedCompany.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedCompany.id, 'rejected');
                      setSelectedCompany(null);
                    }}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedCompany.id, 'approved');
                      setSelectedCompany(null);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
                  >
                    Approve
                  </button>
                </>
              )}
              {selectedCompany.status === 'approved' && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedCompany.id, 'suspended');
                    setSelectedCompany(null);
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
                >
                  Suspend
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Clock(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></motion.svg>;
}
