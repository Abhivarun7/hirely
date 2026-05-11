import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { companyEndpoints } from '../../api/company';
import {
  Users,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
} from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';

type Status =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offer_extended'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

interface Referrer {
  first_name?: string;
  last_name?: string;
  designation?: string;
  email?: string;
}

interface Applicant {
  id: string;
  seekerId: string;
  seekerName: string;
  seekerAvatar: string;
  seekerHeadline: string;
  jobTitle: string;
  jobId: string;
  status: Status;
  appliedAt: string;
  aiScore?: number;
  aiRecommendation?: string;
  referrer?: Referrer;
}

const getStatusConfig = (status: Status) => {
  switch (status) {
    case 'applied':
      return { label: 'Applied', color: 'text-blue-600 bg-blue-50', icon: Clock };
    case 'reviewed':
      return { label: 'Reviewed', color: 'text-yellow-600 bg-yellow-50', icon: AlertCircle };
    case 'shortlisted':
      return { label: 'Shortlisted', color: 'text-green-600 bg-green-50', icon: CheckCircle };
    case 'interview_scheduled':
      return { label: 'Interview Scheduled', color: 'text-indigo-600 bg-indigo-50', icon: Calendar };
    case 'offer_extended':
      return { label: 'Offer Extended', color: 'text-amber-600 bg-amber-50', icon: CheckCircle };
    case 'hired':
      return { label: 'Hired', color: 'text-purple-600 bg-purple-50', icon: CheckCircle };
    case 'rejected':
      return { label: 'Rejected', color: 'text-red-600 bg-red-50', icon: XCircle };
    case 'withdrawn':
      return { label: 'Withdrawn', color: 'text-gray-500 bg-gray-50', icon: XCircle };
    default:
      return { label: 'Unknown', color: 'text-gray-600 bg-gray-50', icon: Clock };
  }
};

const aiBadge = (score?: number) => {
  if (score == null) return null;
  if (score >= 75) return { label: `AI ${score}`, color: 'text-green-700 bg-green-50' };
  if (score >= 50) return { label: `AI ${score}`, color: 'text-yellow-700 bg-yellow-50' };
  return { label: `AI ${score}`, color: 'text-red-700 bg-red-50' };
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export default function Applicants() {
  const [searchParams] = useSearchParams();
  const jobIdFilter = searchParams.get('jobId');
  const [allApplicants, setAllApplicants] = useState<Applicant[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<Status | ''>('');
  const [referredOnly, setReferredOnly] = useState(false);

  useEffect(() => {
    const params: any = {};
    if (jobIdFilter) params.jobId = jobIdFilter;
    if (referredOnly) params.referred_only = true;
    companyEndpoints.getApplicants(Object.keys(params).length ? params : undefined)
      .then((res: any) => {
        const list: any[] = res.data?.data ?? res.data ?? [];
        setAllApplicants(list.map((a: any) => {
          const seeker = a.seeker_id ?? a.seeker ?? {};
          const job = a.job_id ?? a.job ?? {};
          const first = seeker.first_name ?? seeker.firstName ?? '';
          const last = seeker.last_name ?? seeker.lastName ?? '';
          return {
            id: a._id ?? a.id ?? '',
            seekerId: seeker._id ?? seeker.id ?? '',
            seekerName: `${first} ${last}`.trim() || 'Unknown candidate',
            seekerAvatar: `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?',
            seekerHeadline: seeker.headline ?? '',
            jobTitle: job.title ?? '',
            jobId: job._id ?? job.id ?? '',
            status: (a.status ?? 'applied') as Status,
            appliedAt: a.applied_at ?? a.appliedAt ?? '',
            aiScore: a.ai_screening?.score,
            aiRecommendation: a.ai_screening?.recommendation,
            referrer: a.referrer ?? undefined,
          };
        }));
      }).catch(() => {});
  }, [jobIdFilter, referredOnly]);

  const applicants = allApplicants.filter((app) => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesSearch =
      app.seekerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.seekerHeadline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const toggleSelectAll = () => {
    if (selectedApplicants.length === applicants.length) {
      setSelectedApplicants([]);
    } else {
      setSelectedApplicants(applicants.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedApplicants((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = async () => {
    if (bulkAction) {
      try {
        await companyEndpoints.bulkUpdateStatus(selectedApplicants, bulkAction);
        setAllApplicants((prev) =>
          prev.map((a) => selectedApplicants.includes(a.id) ? { ...a, status: bulkAction } : a)
        );
      } catch {}
      setSelectedApplicants([]);
      setBulkAction('');
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applicants</h1>
          <p className="text-gray-600 mt-1">
            {jobIdFilter
              ? `Viewing applicants for a specific job`
              : 'View and manage job applications'}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or headline..."
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Source filter */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <button
          onClick={() => setReferredOnly(false)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            !referredOnly ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          All Applicants
        </button>
        <button
          onClick={() => setReferredOnly(true)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            referredOnly ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Referrals only
        </button>
      </motion.div>

      {/* Status Tabs */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 overflow-x-auto pb-2">
        {(['all', 'applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'offer_extended', 'hired', 'rejected'] as const).map((status) => {
          const count = status === 'all' ? applicants.length : applicants.filter((a) => a.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              <span className="ml-2 text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </motion.div>

      {/* Bulk Actions */}
      {selectedApplicants.length > 0 && (
        <motion.div variants={itemVariants} className="bg-orange-50 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-orange-700">
            {selectedApplicants.length} applicant{selectedApplicants.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as Status)}
              className="px-3 py-1.5 border border-orange-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">Select action...</option>
              <option value="reviewed">Mark Reviewed</option>
              <option value="shortlisted">Shortlist</option>
              <option value="rejected">Reject</option>
            </select>
            <Button variant="primary" onClick={handleBulkUpdate} disabled={!bulkAction}>
              Apply
            </Button>
            <button
              onClick={() => setSelectedApplicants([])}
              className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Applicants List */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedApplicants.length === applicants.length && applicants.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Job</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Score</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applicants.map((applicant, index) => {
                const statusConfig = getStatusConfig(applicant.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <motion.tr
                    key={applicant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedApplicants.includes(applicant.id)}
                        onChange={() => toggleSelect(applicant.id)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-bold text-sm">
                          {applicant.seekerAvatar}
                        </div>
                        <div>
                          <Link
                            to={`/company/applicants/${applicant.id}`}
                            className="font-medium text-gray-900 hover:text-orange-600"
                          >
                            {applicant.seekerName}
                          </Link>
                          <p className="text-sm text-gray-500">{applicant.seekerHeadline}</p>
                          {applicant.referrer && (
                            <span
                              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-medium"
                              title={`Referred by ${applicant.referrer.first_name ?? ''} ${applicant.referrer.last_name ?? ''} (${applicant.referrer.designation ?? 'Official'})`}
                            >
                              Referred by {applicant.referrer.first_name} {applicant.referrer.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/company/jobs/${applicant.jobId}/edit`}
                        className="text-sm text-gray-600 hover:text-orange-600"
                      >
                        {applicant.jobTitle}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const badge = aiBadge(applicant.aiScore);
                        return badge ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(applicant.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/company/applicants/${applicant.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {applicants.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No applicants found</h3>
            <p className="mt-1 text-gray-500">
              {searchQuery || statusFilter !== 'all' || jobIdFilter
                ? 'Try adjusting your filters.'
                : 'No one has applied to your jobs yet.'}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
