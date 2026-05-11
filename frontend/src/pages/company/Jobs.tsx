import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Copy,
  XCircle,
  Users,
  Eye,
  Calendar,
  X,
  MapPin,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';
import { companyEndpoints } from '../../api/company';

interface Job {
  id: string;
  title: string;
  status: 'active' | 'closed' | 'draft';
  applicantsCount: number;
  viewsCount: number;
  postedAt: string;
  location: string[];
  salaryMin: number;
  salaryMax: number;
  currency: string;
}


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

type DrawerTab = 'Description' | 'Requirements' | 'Skills';

interface JobDetail {
  title: string;
  status: string;
  description: string;
  requirements: string;
  skills: string[];
  location: string[];
  salaryMin: number;
  salaryMax: number;
  currency: string;
  postedAt: string;
  workMode?: string;
  jobType?: string;
  experienceLevel?: string;
}

function JobPreviewDrawer({
  jobId,
  onClose,
}: {
  jobId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>('Description');

  useEffect(() => {
    if (!jobId) return;
    setDetail(null);
    setLoading(true);
    setActiveTab('Description');
    companyEndpoints
      .getJob(jobId)
      .then((res) => {
        const j: any = res.data?.data ?? res.data;
        setDetail({
          title: j.title ?? '',
          status: j.status ?? 'draft',
          description: j.description ?? '',
          requirements: j.requirements ?? '',
          skills: (j.skills ?? []).map((s: any) => s.skill_tag_id?.name ?? s.name ?? '').filter(Boolean),
          location: (j.locations ?? []).map((l: any) => l.label ?? l.city ?? ''),
          salaryMin: j.salary_min ?? j.salaryMin ?? 0,
          salaryMax: j.salary_max ?? j.salaryMax ?? 0,
          currency: j.salary_currency ?? j.currency ?? 'USD',
          postedAt: j.created_at ?? j.createdAt ?? '',
          workMode: j.work_mode ?? j.workMode,
          jobType: j.job_type ?? j.type,
          experienceLevel: j.experience_level ?? j.experienceLevel,
        });
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [jobId]);

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  const formatLabel = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <AnimatePresence>
      {jobId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="font-semibold text-gray-900 truncate text-lg">
                  {loading ? 'Loading…' : (detail?.title ?? 'Job Description')}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !detail ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Failed to load job details.
              </div>
            ) : (
              <>
                {/* Meta info */}
                <div className="px-6 py-4 border-b border-gray-100 space-y-3 flex-shrink-0">
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      detail.status === 'active'
                        ? 'bg-green-50 text-green-600'
                        : detail.status === 'closed'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {formatLabel(detail.status)}
                    </span>
                    {detail.jobType && (
                      <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        {formatLabel(detail.jobType)}
                      </span>
                    )}
                    {detail.workMode && (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {formatLabel(detail.workMode)}
                      </span>
                    )}
                    {detail.experienceLevel && (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {formatLabel(detail.experienceLevel)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
                    {detail.location.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {detail.location.join(', ')}
                      </span>
                    )}
                    {(detail.salaryMin > 0 || detail.salaryMax > 0) && (
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        {fmt(detail.salaryMin, detail.currency)} – {fmt(detail.salaryMax, detail.currency)}
                      </span>
                    )}
                    {detail.postedAt && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(detail.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 flex-shrink-0">
                  {(['Description', 'Requirements', 'Skills'] as DrawerTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                        activeTab === tab ? 'text-orange-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="drawerTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                    >
                      {activeTab === 'Skills' ? (
                        detail.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {detail.skills.map((skill) => (
                              <span
                                key={skill}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-sm font-medium"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">No skills listed.</p>
                        )
                      ) : (
                        <div className="prose prose-sm prose-gray max-w-none">
                          {(activeTab === 'Description' ? detail.description : detail.requirements)
                            .split('\n')
                            .filter(Boolean)
                            .map((line, i) => (
                              <p key={i} className="text-gray-600 leading-relaxed mb-3">
                                {line}
                              </p>
                            ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                  <Link to={`/company/jobs/${jobId}/edit`} className="flex-1">
                    <Button variant="primary" className="w-full">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Job
                    </Button>
                  </Link>
                  <Link to={`/company/jobs/${jobId}/applicants`} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      Applicants
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    companyEndpoints.getJobs().then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setJobs(list.map((j: any) => ({
        id: j._id ?? j.id,
        title: j.title ?? '',
        status: j.status ?? 'draft',
        applicantsCount: j.applicants_count ?? j.applicantsCount ?? 0,
        viewsCount: j.views_count ?? j.viewsCount ?? 0,
        postedAt: j.created_at ?? j.createdAt ?? '',
        location: (j.locations ?? []).map((l: any) => l.label ?? l.city ?? ''),
        salaryMin: j.salary_min ?? 0,
        salaryMax: j.salary_max ?? 0,
        currency: j.salary_currency ?? 'USD',
      })));
    }).catch(() => {});
  }, []);
  const [statusFilter, setStatusFilter] = useState<'all' | Job['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleDuplicate = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (job) {
      setJobs((prev) => [
        ...prev,
        { ...job, id: Date.now().toString(), title: `${job.title} (Copy)`, status: 'draft', applicantsCount: 0 },
      ]);
    }
    setActiveMenu(null);
  };

  const handleClose = (id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: 'closed' } : j))
    );
    setActiveMenu(null);
  };

  const formatSalary = (min: number, max: number, currency: string) => {
    const format = (n: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
    return `${format(min)} - ${format(max)}`;
  };

  return (
    <>
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-1">Manage your job listings</p>
        </div>
        <Link to="/company/jobs/create">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Create New Job
          </Button>
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs..."
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'active', 'closed', 'draft'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Jobs Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicants</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Views</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Salary</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Posted</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredJobs.map((job, index) => (
                <motion.tr
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link to={`/company/jobs/${job.id}/edit`} className="font-medium text-gray-900 hover:text-orange-600">
                      {job.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {job.location.join(', ')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      job.status === 'active'
                        ? 'bg-green-50 text-green-600'
                        : job.status === 'closed'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{job.applicantsCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{job.viewsCount.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {new Date(job.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPreviewJobId(job.id)}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="View JD"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveMenu(activeMenu === job.id ? null : job.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeMenu === job.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                          <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                            <button
                              onClick={() => { setPreviewJobId(job.id); setActiveMenu(null); }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View JD
                            </button>
                            <Link
                              to={`/company/jobs/${job.id}/edit`}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </Link>
                            <Link
                              to={`/company/applicants?jobId=${job.id}`}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Users className="w-4 h-4" />
                              View Applicants
                            </Link>
                            <button
                              onClick={() => handleDuplicate(job.id)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                            {job.status !== 'closed' && (
                              <button
                                onClick={() => handleClose(job.id)}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Close Job
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No jobs found</h3>
            <p className="mt-1 text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Create your first job to get started.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link to="/company/jobs/create">
                <Button variant="primary" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Job
                </Button>
              </Link>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>

    <JobPreviewDrawer jobId={previewJobId} onClose={() => setPreviewJobId(null)} />
    </>
  );
}
