import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { companyEndpoints } from '../../api/company';
import { API_BASE_URL } from '../../api/client';
import {
  ArrowLeft, Mail, Phone, Download, Calendar, Clock, CheckCircle, AlertCircle,
  XCircle, FileText, MessageSquare, Video, Plus, ChevronDown, Sparkles, Loader2,
  GraduationCap, Briefcase, Award, ExternalLink, Send,
} from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
const resolveAsset = (url?: string) =>
  !url ? '' : /^https?:\/\//i.test(url) ? url : `${ASSET_BASE_URL}${url}`;

type Status =
  | 'applied' | 'reviewed' | 'shortlisted' | 'interview_scheduled'
  | 'offer_extended' | 'hired' | 'rejected' | 'withdrawn';

type Recommendation = 'strong_match' | 'possible_match' | 'weak_match' | 'not_a_match';

interface AIScreening {
  score: number;
  recommendation: Recommendation;
  summary: string;
  strengths: string[];
  gaps: string[];
  screened_at: string;
}

interface InterviewItem {
  _id: string;
  interview_date: string;
  format: 'video' | 'phone' | 'in_person';
  location_or_link?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

interface Skill { _id: string; name: string; }
interface EduItem {
  _id: string; institution: string; degree?: string; field_of_study?: string;
  start_date?: string; end_date?: string; is_current?: boolean; description?: string;
}
interface ExpItem {
  _id: string; company_name: string; job_title?: string; location?: string;
  start_date?: string; end_date?: string; is_current?: boolean; description?: string;
}

interface Detail {
  id: string;
  status: Status;
  appliedAt: string;
  candidateEmail: string;
  firstName: string;
  lastName: string;
  headline: string;
  bio: string;
  city: string;
  country: string;
  phone: string;
  avatarUrl: string;
  jobId: string;
  jobTitle: string;
  resumeUrl: string;
  resumeName: string;
  coverLetter: string;
  aiScreening?: AIScreening;
  skills: Skill[];
  education: EduItem[];
  experience: ExpItem[];
  interviews: InterviewItem[];
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: typeof Clock }> = {
  applied: { label: 'Applied', color: 'text-blue-600 bg-blue-50', icon: Clock },
  reviewed: { label: 'Reviewed', color: 'text-yellow-600 bg-yellow-50', icon: AlertCircle },
  shortlisted: { label: 'Shortlisted', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-indigo-600 bg-indigo-50', icon: Calendar },
  offer_extended: { label: 'Offer Extended', color: 'text-amber-600 bg-amber-50', icon: Award },
  hired: { label: 'Hired', color: 'text-purple-600 bg-purple-50', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-600 bg-red-50', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-500 bg-gray-50', icon: XCircle },
};

const REC_LABEL: Record<Recommendation, { label: string; color: string }> = {
  strong_match: { label: 'Strong match', color: 'text-green-700 bg-green-50 border-green-200' },
  possible_match: { label: 'Possible match', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  weak_match: { label: 'Weak match', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  not_a_match: { label: 'Not a match', color: 'text-red-700 bg-red-50 border-red-200' },
};

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

const formatDateOnly = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

interface InternalNote {
  id: string; authorName: string; content: string; createdAt: string;
}

export default function ApplicantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [screening, setScreening] = useState<AIScreening | undefined>(undefined);
  const [screenBusy, setScreenBusy] = useState(false);
  const [screenError, setScreenError] = useState('');

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedule, setSchedule] = useState({
    interview_date: '',
    format: 'video' as 'video' | 'phone' | 'in_person',
    location_or_link: '',
    notes: '',
  });
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      companyEndpoints.getApplicant(id),
      companyEndpoints.getApplicantNotes(id),
    ]).then(([appRes, notesRes]: any[]) => {
      const a = appRes.data?.data ?? appRes.data ?? {};
      const seeker = a.seeker_id ?? {};
      const job = a.job ?? a.job_id ?? {};
      const resume = a.resume_id ?? {};

      setDetail({
        id: a._id ?? id,
        status: (a.status ?? 'applied') as Status,
        appliedAt: a.applied_at ?? '',
        candidateEmail: a.candidate_email ?? '',
        firstName: seeker.first_name ?? '',
        lastName: seeker.last_name ?? '',
        headline: seeker.headline ?? '',
        bio: seeker.bio ?? '',
        city: seeker.city ?? '',
        country: seeker.country ?? '',
        phone: seeker.phone ?? '',
        avatarUrl: seeker.avatar_url ?? '',
        jobId: job._id ?? job.id ?? '',
        jobTitle: job.title ?? '',
        resumeUrl: resume.file_url ?? '',
        resumeName: resume.original_name ?? resume.label ?? 'Resume',
        coverLetter: a.cover_letter_text ?? '',
        aiScreening: a.ai_screening,
        skills: (a.skills ?? []).map((s: any) => ({
          _id: s._id ?? s.skill_tag_id?._id ?? '',
          name: s.skill_tag_id?.name ?? s.name ?? '',
        })).filter((s: Skill) => s.name),
        education: a.education ?? [],
        experience: a.experience ?? [],
        interviews: a.interviews ?? [],
      });
      setScreening(a.ai_screening);

      const list: any[] = notesRes.data?.data ?? notesRes.data ?? [];
      setNotes(list.map((n: any) => ({
        id: n._id ?? '',
        authorName: n.author_id?.email ?? n.author_id?.first_name ?? 'Team',
        content: n.note ?? n.content ?? '',
        createdAt: n.created_at ?? '',
      })));
    }).catch(() => { /* failures already surfaced upstream by interceptors */ });
  }, [id]);

  const initials = useMemo(() => {
    if (!detail) return '?';
    return `${(detail.firstName[0] ?? '')}${(detail.lastName[0] ?? '')}`.toUpperCase() || '?';
  }, [detail]);

  const handleStatusChange = async (newStatus: Status) => {
    if (!id || !detail) return;
    setStatusBusy(true);
    try {
      await companyEndpoints.updateApplicantStatus(id, { status: newStatus });
      setDetail({ ...detail, status: newStatus });
    } catch {
      // keep previous status — error already shown via console
    } finally {
      setStatusBusy(false);
      setShowStatusDropdown(false);
    }
  };

  const handleScreen = async (force = false) => {
    if (!id) return;
    setScreenBusy(true);
    setScreenError('');
    try {
      const res: any = await companyEndpoints.screenApplicant(id, { force });
      const data = res.data?.data ?? res.data;
      setScreening(data);
      if (detail) setDetail({ ...detail, aiScreening: data });
    } catch (err: any) {
      setScreenError(err?.response?.data?.message ?? 'AI screening failed');
    } finally {
      setScreenBusy(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !id) return;
    try {
      const res: any = await companyEndpoints.addApplicantNote(id, newNote.trim());
      const n = res.data?.data ?? res.data;
      setNotes((prev) => [
        { id: n._id ?? Date.now().toString(), authorName: 'You', content: newNote.trim(), createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setNewNote('');
    } catch {
      // input keeps the text
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!schedule.interview_date) {
      setScheduleError('Pick a date and time');
      return;
    }
    setScheduleBusy(true);
    setScheduleError('');
    try {
      const res: any = await companyEndpoints.scheduleInterview(id, {
        interview_date: new Date(schedule.interview_date).toISOString(),
        format: schedule.format,
        location_or_link: schedule.location_or_link || undefined,
        notes: schedule.notes || undefined,
      });
      const created = res.data?.data ?? res.data;
      if (detail) {
        setDetail({
          ...detail,
          status: 'interview_scheduled',
          interviews: [created, ...detail.interviews],
        });
      }
      setSchedule({ interview_date: '', format: 'video', location_or_link: '', notes: '' });
      setScheduleOpen(false);
    } catch (err: any) {
      setScheduleError(err?.response?.data?.message ?? 'Failed to schedule');
    } finally {
      setScheduleBusy(false);
    }
  };

  const updateInterviewStatus = async (interviewId: string, status: InterviewItem['status']) => {
    try {
      await companyEndpoints.updateInterview(interviewId, { status });
      if (detail) {
        setDetail({
          ...detail,
          interviews: detail.interviews.map((i) =>
            i._id === interviewId ? { ...i, status } : i
          ),
        });
      }
    } catch {
      // surface upstream
    }
  };

  if (!detail) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>;
  }

  const statusConfig = STATUS_CONFIG[detail.status];
  const StatusIcon = statusConfig.icon;
  const resumeHref = resolveAsset(detail.resumeUrl);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/company/applicants')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 truncate">
            {detail.firstName} {detail.lastName}
          </h1>
          <p className="text-gray-600 mt-1">{detail.headline || 'No headline'}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {statusConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — candidate card + actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <div className="text-center">
              {detail.avatarUrl ? (
                <img
                  src={resolveAsset(detail.avatarUrl)}
                  alt=""
                  className="w-24 h-24 rounded-2xl object-cover mx-auto"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center text-orange-600 font-bold text-2xl mx-auto">
                  {initials}
                </div>
              )}
              <h2 className="mt-4 text-lg font-bold text-gray-900">{detail.firstName} {detail.lastName}</h2>
              <p className="text-sm text-gray-500">{detail.headline}</p>
              {(detail.city || detail.country) && (
                <p className="text-xs text-gray-400 mt-1">
                  {[detail.city, detail.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            <div className="mt-6 space-y-2.5 text-sm">
              {detail.candidateEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${detail.candidateEmail}`} className="text-orange-600 hover:underline truncate">
                    {detail.candidateEmail}
                  </a>
                </div>
              )}
              {detail.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{detail.phone}</span>
                </div>
              )}
              {detail.jobTitle && (
                <Link to={`/company/jobs/${detail.jobId}/edit`} className="flex items-center gap-3 text-gray-600 hover:text-orange-600">
                  <FileText className="w-4 h-4 text-gray-400" />
                  {detail.jobTitle}
                </Link>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Applied {formatDateOnly(detail.appliedAt)}</span>
              </div>
            </div>

            {detail.resumeUrl && (
              <div className="mt-6 grid grid-cols-2 gap-2">
                <a
                  href={resumeHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <ExternalLink className="w-4 h-4" /> View
                </a>
                <a
                  href={resumeHref}
                  download={detail.resumeName}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  <Download className="w-4 h-4" /> Resume
                </a>
              </div>
            )}
          </Card>

          {/* Status update */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Application Status</h3>
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                disabled={statusBusy}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 ${statusConfig.color} disabled:opacity-50`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                    {(['applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'offer_extended', 'hired', 'rejected'] as Status[]).map((s) => {
                      const config = STATUS_CONFIG[s];
                      const Icon = config.icon;
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${detail.status === s ? 'bg-orange-50 text-orange-600' : 'text-gray-700'}`}
                        >
                          <Icon className="w-4 h-4" />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => setScheduleOpen(true)}
                disabled={detail.status === 'rejected' || detail.status === 'hired'}
              >
                <Video className="w-4 h-4 mr-1.5" /> Interview
              </Button>
              <Button
                variant="primary"
                onClick={() => handleStatusChange('offer_extended')}
                disabled={statusBusy || detail.status === 'rejected' || detail.status === 'hired'}
              >
                <Award className="w-4 h-4 mr-1.5" /> Offer
              </Button>
            </div>
          </Card>

          {/* AI Screening */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-500" /> AI Screening
              </h3>
              <button
                onClick={() => handleScreen(!!screening)}
                disabled={screenBusy}
                title={
                  screening
                    ? 'Re-run AI screening (skips cache, costs another LLM call)'
                    : 'Run AI screening for this candidate'
                }
                className="text-xs text-orange-600 font-medium hover:text-orange-700 disabled:opacity-50 flex items-center gap-1"
              >
                {screenBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {screening ? 'Re-run' : 'Screen now'}
              </button>
            </div>
            {screenError && (
              <p className="text-xs text-red-600 mb-2">{screenError}</p>
            )}
            {screening ? (() => {
              const rec = REC_LABEL[screening.recommendation] ?? REC_LABEL.possible_match;
              const strengths = screening.strengths ?? [];
              const gaps = screening.gaps ?? [];
              return (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`text-3xl font-bold ${
                    screening.score >= 75 ? 'text-green-600' :
                    screening.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {screening.score}
                    <span className="text-sm text-gray-400 font-normal">/100</span>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${rec.color}`}>
                    {rec.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{screening.summary}</p>
                {strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
                    <ul className="text-sm text-gray-600 space-y-0.5 list-disc list-inside">
                      {strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {gaps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-1">Gaps</p>
                    <ul className="text-sm text-gray-600 space-y-0.5 list-disc list-inside">
                      {gaps.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-gray-400">Screened {formatDate(screening.screened_at)}</p>
              </div>
              );
            })() : (
              <p className="text-sm text-gray-500">Run AI screening to score this candidate against the job requirements.</p>
            )}
          </Card>
        </div>

        {/* RIGHT — profile sections */}
        <div className="lg:col-span-2 space-y-6">
          {detail.bio && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-2">About</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{detail.bio}</p>
            </Card>
          )}

          {detail.coverLetter && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-2">Cover letter</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{detail.coverLetter}</p>
            </Card>
          )}

          {detail.skills.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.skills.map((s) => (
                  <span key={s._id} className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
                    {s.name}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {detail.experience.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" /> Experience
              </h3>
              <div className="divide-y divide-gray-100">
                {detail.experience.map((x) => (
                  <div key={x._id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-medium text-sm text-gray-900">{x.job_title}</p>
                    <p className="text-sm text-gray-600">{x.company_name}{x.location ? ` · ${x.location}` : ''}</p>
                    <p className="text-xs text-gray-400">
                      {formatDateOnly(x.start_date)} – {x.is_current ? 'Present' : formatDateOnly(x.end_date)}
                    </p>
                    {x.description && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{x.description}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {detail.education.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-gray-400" /> Education
              </h3>
              <div className="divide-y divide-gray-100">
                {detail.education.map((e) => (
                  <div key={e._id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-medium text-sm text-gray-900">{e.institution}</p>
                    <p className="text-sm text-gray-600">{[e.degree, e.field_of_study].filter(Boolean).join(' · ')}</p>
                    <p className="text-xs text-gray-400">
                      {formatDateOnly(e.start_date)} – {e.is_current ? 'Present' : formatDateOnly(e.end_date)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Interviews */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-gray-400" /> Interviews
              </h3>
              <button
                onClick={() => setScheduleOpen(true)}
                className="text-sm text-orange-600 font-medium hover:text-orange-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Schedule
              </button>
            </div>
            {detail.interviews.length === 0 ? (
              <p className="text-sm text-gray-500">No interviews scheduled yet.</p>
            ) : (
              <div className="space-y-3">
                {detail.interviews.map((iv) => (
                  <div key={iv._id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900">
                          {formatDate(iv.interview_date)}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{iv.format.replace('_', ' ')}</p>
                        {iv.location_or_link && (
                          iv.format === 'video' ? (
                            <a href={iv.location_or_link} target="_blank" rel="noreferrer" className="text-xs text-orange-600 hover:underline break-all">
                              {iv.location_or_link}
                            </a>
                          ) : (
                            <p className="text-xs text-gray-600">{iv.location_or_link}</p>
                          )
                        )}
                        {iv.notes && <p className="text-xs text-gray-500 mt-1">{iv.notes}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0 ${
                        iv.status === 'completed' ? 'bg-green-100 text-green-700' :
                        iv.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        iv.status === 'no_show' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {iv.status.replace('_', ' ')}
                      </span>
                    </div>
                    {iv.status === 'scheduled' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => updateInterviewStatus(iv._id, 'completed')}
                          className="px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                        >
                          Mark completed
                        </button>
                        <button
                          onClick={() => updateInterviewStatus(iv._id, 'cancelled')}
                          className="px-2.5 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => updateInterviewStatus(iv._id, 'no_show')}
                          className="px-2.5 py-1 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100"
                        >
                          No-show
                        </button>
                      </div>
                    )}
                    {iv.status === 'completed' && detail.status !== 'hired' && detail.status !== 'rejected' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleStatusChange('offer_extended')}
                          className="px-2.5 py-1 text-xs bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                        >
                          Extend offer
                        </button>
                        <button
                          onClick={() => handleStatusChange('rejected')}
                          className="px-2.5 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" /> Internal notes
            </h3>
            <form onSubmit={handleAddNote} className="mb-3 flex gap-2">
              <Input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note for your team…"
                className="flex-1"
              />
              <Button type="submit" variant="primary" disabled={!newNote.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-sm text-gray-500">No notes yet.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-900">{n.authorName}</span>
                      <span className="text-xs text-gray-400">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Schedule modal */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setScheduleOpen(false)} />
          <motion.form
            onSubmit={handleSchedule}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900">Schedule interview</h2>
            {scheduleError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{scheduleError}</p>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date & time *</label>
              <Input
                type="datetime-local"
                value={schedule.interview_date}
                onChange={(e) => setSchedule({ ...schedule, interview_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Format</label>
              <select
                value={schedule.format}
                onChange={(e) => setSchedule({ ...schedule, format: e.target.value as 'video' | 'phone' | 'in_person' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm bg-white"
              >
                <option value="video">Video call</option>
                <option value="phone">Phone</option>
                <option value="in_person">In person</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {schedule.format === 'video' ? 'Meeting link (Google Meet / Zoom URL)' : 'Location / phone'}
              </label>
              <Input
                type="text"
                value={schedule.location_or_link}
                onChange={(e) => setSchedule({ ...schedule, location_or_link: e.target.value })}
                placeholder={schedule.format === 'video' ? 'https://meet.google.com/...' : 'Office address or phone number'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                rows={3}
                value={schedule.notes}
                onChange={(e) => setSchedule({ ...schedule, notes: e.target.value })}
                placeholder="Anything the candidate should know…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm resize-none"
              />
            </div>
            <p className="text-xs text-gray-500">
              An invite email will be sent to the candidate with the date, time, and link.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setScheduleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={scheduleBusy}>
                {scheduleBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Schedule & email
              </Button>
            </div>
          </motion.form>
        </div>
      )}
    </motion.div>
  );
}
