import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Mail, MapPin, Send, X, Briefcase, Check } from 'lucide-react';
import * as api from '@/api/official';

interface Candidate {
  _id: string;
  user_id?: string | null;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  headline?: string;
  visibility?: string;
  created_by_official_id?: string | null;
}

interface JobOption {
  _id: string;
  title: string;
  company_id?: { name?: string; logo_url?: string };
  job_type?: string;
  work_mode?: string;
  locations?: { city?: string; state?: string }[];
}

export default function Candidates() {
  const [tab, setTab] = useState<'all' | 'registered' | 'walk_in'>('all');
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState<Candidate | null>(null);
  const [locationMissing, setLocationMissing] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.getCandidates({ limit: 50, kind: tab, search: search || undefined });
      setItems(res.data?.data ?? []);
      setLocationMissing(!!res.data?.location_missing);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [tab]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-600 mt-1">Registered seekers in your area + your own walk-ins</p>
        </div>
        <button
          onClick={() => setWalkInOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 font-medium shadow-lg shadow-orange-200"
        >
          <Plus className="w-5 h-5" />
          Add Walk-in
        </button>
      </motion.div>

      <div className="flex gap-2">
        {(['all', 'registered', 'walk_in'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t === 'all' ? 'All' : t === 'registered' ? 'Registered' : 'Walk-ins'}
          </button>
        ))}
      </div>

      {locationMissing && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Set your location in Profile to discover registered seekers in your radius.
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); fetch(); }} className="flex gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, headline…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700">
          Search
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading && <div className="p-10 text-center text-gray-500">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="p-10 text-center text-gray-500">No candidates found.</div>
        )}
        {!loading && items.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {items.map((c) => {
              const isWalkIn = !c.user_id;
              return (
                <li key={c._id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-bold text-sm">
                        {`${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {c.first_name} {c.last_name}
                        </p>
                        {isWalkIn && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium uppercase tracking-wider">
                            Walk-in
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-0.5">
                        {c.email && (
                          <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email}</span>
                        )}
                        {(c.city || c.state) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {[c.city, c.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {c.headline && <span className="text-gray-600 truncate max-w-xs">{c.headline}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setPushOpen(c)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-100 border border-orange-200"
                    >
                      <Send className="w-4 h-4" />
                      Push
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {walkInOpen && (
        <WalkInModal
          onClose={() => setWalkInOpen(false)}
          onCreated={() => { setWalkInOpen(false); fetch(); }}
        />
      )}
      {pushOpen && (
        <PushModal
          candidate={pushOpen}
          onClose={() => setPushOpen(null)}
          onPushed={() => setPushOpen(null)}
        />
      )}
    </div>
  );
}

function WalkInModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    city: '', state: '', country: '', headline: '', notes: '',
  });
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ seekerId: string; firstName: string; lastName: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) { setError('A resume file is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      fd.append('resume', resume);
      const res = await api.createWalkIn(fd);
      const seekerId = res.data?.data?.seeker?._id;
      if (!seekerId) {
        setError('Created, but could not load matching jobs.');
        return;
      }
      setCreated({ seekerId, firstName: form.first_name, lastName: form.last_name });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create walk-in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    onCreated();
  };

  if (created) {
    return (
      <ModalShell
        title={`Recommend jobs for ${created.firstName} ${created.lastName}`.trim()}
        onClose={handleDone}
      >
        <RecommendedJobsPanel
          seekerId={created.seekerId}
          onDone={handleDone}
        />
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Add Walk-in Candidate" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required>
            <input required type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Last Name" required>
            <input required type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="City">
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
          </Field>
          <Field label="State">
            <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Country">
            <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label="Headline">
          <input type="text" placeholder="e.g. Welder with 5 yrs experience" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Resume (PDF / DOC / DOCX)" required>
          <input
            required
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResume(e.target.files?.[0] ?? null)}
            className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700 file:cursor-pointer text-sm"
          />
        </Field>
        <Field label="Notes">
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
          <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-medium disabled:opacity-60">
            {submitting ? 'Saving…' : 'Create & See Jobs'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function RecommendedJobsPanel({ seekerId, onDone }: { seekerId: string; onDone: () => void }) {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationMissing, setLocationMissing] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);
  const [pushed, setPushed] = useState<Record<string, true>>({});
  const [rowError, setRowError] = useState<{ jobId: string; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getNearbyJobs({ limit: 50 });
        setJobs(res.data?.data ?? []);
        setLocationMissing(!!res.data?.location_missing);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pushTo = async (jobId: string) => {
    setPushing(jobId);
    setRowError(null);
    try {
      await api.pushCandidate({ seeker_id: seekerId, job_id: jobId });
      setPushed((p) => ({ ...p, [jobId]: true }));
    } catch (err: any) {
      setRowError({ jobId, message: err?.response?.data?.message ?? 'Push failed' });
    } finally {
      setPushing(null);
    }
  };

  const pushedCount = Object.keys(pushed).length;

  return (
    <div className="p-6 space-y-4">
      <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
        <Check className="w-4 h-4" />
        Candidate saved. Push them to a nearby job below.
      </div>

      {locationMissing && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Your location isn't set, so these aren't filtered by radius. Set it in Profile for better matches.
        </div>
      )}

      <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
        {loading && <div className="p-10 text-center text-gray-500">Loading nearby jobs…</div>}
        {!loading && jobs.length === 0 && (
          <div className="p-10 text-center text-gray-500">No nearby jobs found.</div>
        )}
        {!loading && jobs.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {jobs.map((j) => {
              const loc = j.locations?.[0];
              const locLabel = [loc?.city, loc?.state].filter(Boolean).join(', ');
              const isPushed = !!pushed[j._id];
              const isPushing = pushing === j._id;
              const hasError = rowError?.jobId === j._id;
              return (
                <li key={j._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{j.title}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-0.5">
                        {j.company_id?.name && <span>{j.company_id.name}</span>}
                        {locLabel && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />{locLabel}
                          </span>
                        )}
                        {j.job_type && <span className="capitalize">{j.job_type.replace('_', ' ')}</span>}
                      </div>
                      {hasError && <p className="text-xs text-red-600 mt-1">{rowError!.message}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => pushTo(j._id)}
                      disabled={isPushing || isPushed}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                        isPushed
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 disabled:opacity-60'
                      }`}
                    >
                      {isPushed ? <><Check className="w-4 h-4" />Pushed</> : <><Send className="w-4 h-4" />{isPushing ? 'Pushing…' : 'Push'}</>}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-gray-500">
          {pushedCount > 0 ? `${pushedCount} push${pushedCount === 1 ? '' : 'es'} sent` : 'Skip to do this later'}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function PushModal({ candidate, onClose, onPushed }: { candidate: Candidate; onClose: () => void; onPushed: () => void }) {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobId, setJobId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getNearbyJobs({ limit: 100 });
        setJobs(res.data?.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) { setError('Pick a job first.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.pushCandidate({ seeker_id: candidate._id, job_id: jobId, push_note: note || undefined });
      setSuccess(true);
      setTimeout(onPushed, 900);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Push failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title={`Push ${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            Pushed! Closing…
          </div>
        )}
        <p className="text-sm text-gray-600">
          The default resume on file will be sent. The company will see this as an application referred by you.
        </p>

        <Field label="Job" required>
          <select required value={jobId} onChange={(e) => setJobId(e.target.value)} className={inputCls} disabled={loading}>
            <option value="">{loading ? 'Loading…' : 'Pick a nearby job'}</option>
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.title} — {j.company_id?.name ?? '?'}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Push note (optional)">
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this candidate a good fit?"
            className={inputCls}
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">
            Cancel
          </button>
          <button type="submit" disabled={submitting || success} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-medium disabled:opacity-60">
            <Send className="w-4 h-4" />
            {submitting ? 'Pushing…' : 'Push resume'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
