import { Link } from 'react-router-dom';
import HomeJobCard, { HomeJob } from './HomeJobCard';

interface Props {
  jobs: HomeJob[];
  loading?: boolean;
  hasProfileSignals?: boolean;
  onSave: (job: HomeJob) => void;
  onDismiss: (job: HomeJob) => void;
  onCardClick?: (job: HomeJob) => void;
}

export default function RecommendedJobsSection({
  jobs,
  loading,
  hasProfileSignals,
  onSave,
  onDismiss,
  onCardClick,
}: Props) {
  return (
    <section className="bg-white rounded-xl border border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-on-surface inline-flex items-center">
            <span className="material-symbols-outlined mr-2 text-orange-500">auto_awesome</span>
            Recommended for You
          </h2>
          {!hasProfileSignals && jobs.length > 0 && (
            <p className="text-xs text-tertiary mt-0.5">
              Add skills and experience to your profile for stronger matches.{' '}
              <Link to="/seeker/profile" className="text-orange-500 font-medium hover:underline">
                Complete profile
              </Link>
            </p>
          )}
        </div>
        <Link
          to="/seeker/jobs"
          className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
        >
          View all jobs
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border border-zinc-100 rounded-xl animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-100 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 rounded w-1/2" />
                  <div className="h-3 bg-zinc-100 rounded w-2/3" />
                </div>
              </div>
              <div className="h-9 bg-zinc-100 rounded-lg mt-4" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-10 px-4">
          <span className="material-symbols-outlined text-4xl text-zinc-300">search_off</span>
          <p className="text-sm text-tertiary mt-2">
            No recommendations yet. Complete your profile to get personalized job suggestions.
          </p>
          <Link
            to="/seeker/profile"
            className="inline-block mt-3 text-orange-500 font-bold text-sm hover:underline"
          >
            <span className="material-symbols-outlined mr-1 align-middle">person</span>
            Update profile
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {jobs.map((job, idx) => (
            <HomeJobCard
              key={job._id}
              job={job}
              position={idx}
              onSaveClick={onSave}
              onDismissClick={onDismiss}
              onCardClick={onCardClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
