import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  Flag,
  ChevronLeft,
  ChevronRight,
  MapPin,
  DollarSign,
  Calendar,
  Users as UsersIcon,
} from 'lucide-react';
import * as adminApi from '../../api/admin';

interface Job {
  id: string;
  title: string;
  company: string;
  companyId: string;
  location: string;
  salary: string;
  type: string;
  status: 'active' | 'closed' | 'draft' | 'reported';
  postedDate: string;
  applications: number;
  isReported?: boolean;
  reportsCount?: number;
}


const statusConfig = {
  active: { label: 'Active', color: 'bg-green-50 text-green-700 border-green-200' },
  closed: { label: 'Closed', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  draft: { label: 'Draft', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  reported: { label: 'Reported', color: 'bg-red-50 text-red-700 border-red-200' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showReportedOnly, setShowReportedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    adminApi.getAdminJobs({ page: 1, limit: 100 }).then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setJobs(list.map((j: any) => ({
        id: j._id ?? j.id,
        title: j.title ?? '',
        company: j.company_id?.name ?? '',
        companyId: j.company_id?._id ?? j.company_id ?? '',
        location: (j.locations ?? []).map((l: any) => l.label ?? l.city ?? '').join(', '),
        salary: j.salary_min && j.salary_max
          ? `$${(j.salary_min / 1000).toFixed(0)}k - $${(j.salary_max / 1000).toFixed(0)}k`
          : 'Competitive',
        type: j.job_type ?? 'Full-time',
        status: j.status ?? 'active',
        postedDate: j.created_at ?? j.createdAt ?? '',
        applications: j.applications_count ?? 0,
      })));
    }).catch(() => {});
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesReported = !showReportedOnly || job.isReported;
    return matchesSearch && matchesStatus && matchesReported;
  });

  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const handleRemoveJob = async (jobId: string) => {
    try {
      await adminApi.removeJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setSelectedJob(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Job Moderation</h1>
          <p className="text-gray-600 mt-1">Review and manage job postings</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
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
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
            <option value="reported">Reported</option>
          </select>
          <button
            onClick={() => setShowReportedOnly(!showReportedOnly)}
            className={`px-4 py-2 border rounded-xl font-medium text-sm transition-colors ${
              showReportedOnly
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Flag className="w-4 h-4 inline mr-2" />
            Reported Only
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Jobs', value: jobs.length, status: 'all' },
          { label: 'Active', value: jobs.filter(j => j.status === 'active').length, status: 'active' },
          { label: 'Closed', value: jobs.filter(j => j.status === 'closed').length, status: 'closed' },
          { label: 'Draft', value: jobs.filter(j => j.status === 'draft').length, status: 'draft' },
          { label: 'Reported', value: jobs.filter(j => j.isReported).length, status: 'reported' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => {
              setStatusFilter(stat.status);
              setShowReportedOnly(false);
            }}
            className={`p-4 rounded-xl border transition-all ${
              statusFilter === stat.status && !showReportedOnly
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </button>
        ))}
      </motion.div>

      {/* Jobs List */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="divide-y divide-gray-50">
          {paginatedJobs.map((job) => {
            const status = statusConfig[job.status];
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-6 hover:bg-gray-50 transition-colors ${job.isReported ? 'bg-red-50/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      job.isReported
                        ? 'bg-red-100'
                        : 'bg-gradient-to-br from-orange-100 to-orange-50'
                    }`}>
                      <Briefcase className={`w-6 h-6 ${job.isReported ? 'text-red-600' : 'text-orange-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                        {job.isReported && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            {job.reportsCount} reports
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{job.company}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {job.salary}
                        </span>
                        <span className="flex items-center gap-1">
                          <UsersIcon className="w-4 h-4" />
                          {job.applications} applications
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(job.postedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                      {status.label}
                    </span>
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    {job.status === 'active' && (
                      <button
                        onClick={() => handleRemoveJob(job.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Job"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs
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

      {/* Job Detail Modal */}
      {selectedJob && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedJob(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
                {selectedJob.isReported && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    Reported ({selectedJob.reportsCount} reports)
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedJob.title}</h3>
                  <p className="text-gray-600">{selectedJob.company}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{selectedJob.location}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Salary Range</p>
                  <p className="font-medium text-gray-900">{selectedJob.salary}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Job Type</p>
                  <p className="font-medium text-gray-900">{selectedJob.type}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Applications</p>
                  <p className="font-medium text-gray-900">{selectedJob.applications}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Posted Date</p>
                  <p className="font-medium text-gray-900">{new Date(selectedJob.postedDate).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[selectedJob.status].color}`}>
                    {statusConfig[selectedJob.status].label}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  handleRemoveJob(selectedJob.id);
                  setSelectedJob(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                Remove Job
              </button>
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

function XCircle(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></motion.svg>;
}