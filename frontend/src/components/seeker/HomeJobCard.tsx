import { Link } from 'react-router-dom';
import { formatSalary } from '../../lib/formatters';

export interface HomeJob {
  _id: string;
  title: string;
  slug?: string;
  job_type?: string;
  work_mode?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  locations?: { label?: string; city?: string }[];
  company?: { _id?: string; name?: string; slug?: string; logo_url?: string };
  createdAt?: string | Date;
  match_score?: number;
  match_reason?: string;
  distance_km?: number;
}

interface Props {
  job: HomeJob;
  position: number;
  onApplyClick?: (job: HomeJob) => void;
  onSaveClick?: (job: HomeJob) => void;
  onDismissClick?: (job: HomeJob) => void;
  onCardClick?: (job: HomeJob) => void;
}

function postedDaysAgo(d?: string | Date): number {
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));
}

export default function HomeJobCard({ job, onApplyClick, onSaveClick, onDismissClick, onCardClick }: Props) {
  const companyName = job.company?.name ?? '';
  const initials = companyName.substring(0, 2).toUpperCase() || 'C';
  const locationText = (job.locations ?? []).map((l) => l.label ?? l.city ?? '').filter(Boolean).join(', ');
  const days = postedDaysAgo(job.createdAt);
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency, true);

  return (
    <div className="p-4 border border-zinc-200 rounded-xl hover:border-orange-200 hover:shadow-md transition-all bg-white">
      <div className="flex items-start gap-4">
        {job.company?.logo_url ? (
          <img
            src={job.company.logo_url}
            alt={companyName}
            className="w-12 h-12 rounded-xl object-contain bg-white border border-zinc-100 p-1"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-bold text-sm">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-on-surface truncate">{job.title}</h3>
            <p className="text-sm text-tertiary truncate">{companyName}</p>
          </div>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2 text-xs text-zinc-500">
            {locationText && (
              <span className="inline-flex items-center">
                <span className="material-symbols-outlined text-xs mr-1">location_on</span>
                {locationText}
              </span>
            )}
            {job.distance_km != null && (
              <>
                <span className="text-zinc-300">|</span>
                <span>{job.distance_km} km away</span>
              </>
            )}
            <span className="text-zinc-300">|</span>
            <span className="text-orange-500 font-medium inline-flex items-center">
              <span className="material-symbols-outlined text-xs mr-1">payments</span>
              {salary}
            </span>
            {job.work_mode && (
              <>
                <span className="text-zinc-300">|</span>
                <span className="capitalize">{job.work_mode}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-zinc-400 inline-flex items-center">
              <span className="material-symbols-outlined text-xs mr-1">schedule</span>
              {days === 0 ? 'Today' : `${days}d ago`}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Link
          to={`/seeker/jobs/${job._id}`}
          onClick={() => onCardClick?.(job)}
          className="flex-1 py-2 bg-orange-500 text-white text-center text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
        >
          <span className="material-symbols-outlined mr-1 align-middle">send</span>
          View &amp; Apply
        </Link>
        <button
          type="button"
          onClick={() => onSaveClick?.(job)}
          className="px-3 py-2 border border-zinc-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
          title="Save job"
        >
          <span className="material-symbols-outlined text-zinc-400 hover:text-orange-500">bookmark_border</span>
        </button>
        {onDismissClick && (
          <button
            type="button"
            onClick={() => onDismissClick(job)}
            className="px-3 py-2 border border-zinc-200 rounded-lg hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
            title="Not interested"
          >
            <span className="material-symbols-outlined text-zinc-400">close</span>
          </button>
        )}
        {onApplyClick && (
          <span className="hidden">
            {/* Reserved for direct-apply flow */}
            {String(onApplyClick.length)}
          </span>
        )}
      </div>
    </div>
  );
}
