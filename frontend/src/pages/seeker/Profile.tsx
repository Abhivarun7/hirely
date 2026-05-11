import { useState, useEffect, useRef } from 'react';
import * as seekerApi from '../../api/seeker';
import api, { API_BASE_URL } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, X, Edit2, Trash2, Loader2, Search,
  AlertCircle, Upload, FileText, Briefcase, GraduationCap, Camera, Download,
} from 'lucide-react';

// API_BASE_URL ends with /api/v1 — strip it to resolve relative /uploads URLs.
const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
const resolveAsset = (url?: string) =>
  !url ? '' : /^https?:\/\//i.test(url) ? url : `${ASSET_BASE_URL}${url}`;

function toYearMonth(value?: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(value?: string | null): string {
  if (!value) return '';
  let d: Date;
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split('-').map(Number);
    d = new Date(y, m - 1, 1);
  } else {
    d = new Date(value);
  }
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const VISIBILITY_LABEL: Record<string, string> = {
  public: 'Open to Offers',
  companies_only: 'Visible to Companies',
  hidden: 'Profile Hidden',
};
const VISIBILITY_NEXT: Record<string, 'public' | 'companies_only' | 'hidden'> = {
  public: 'companies_only',
  companies_only: 'hidden',
  hidden: 'public',
};

const inp =
  'w-full px-3 py-2 bg-white/60 border border-white/60 rounded-xl text-sm text-[#1b1b1e] placeholder:text-[#8e7164] focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/40 focus:border-[#ff6b00] transition-all';

interface SkillTag { id: string; name: string; }
interface ProfileSkill { tag_id: string; name: string; }

interface EduItem {
  _id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
}

interface ExpItem {
  _id: string;
  company_name: string;
  job_title: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
}

interface Resume {
  _id: string;
  original_name: string;
  url: string;
  is_default: boolean;
  uploaded_at: string;
}

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  headline: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

// ─── Education Modal ──────────────────────────────────────────────────────────

const EMPTY_EDU: Omit<EduItem, '_id'> = {
  institution: '', degree: '', field_of_study: '',
  start_date: '', end_date: '', is_current: false, description: '',
};

function EduModal({
  item, onSave, onClose,
}: {
  item: Partial<EduItem> | null;
  onSave: (data: Omit<EduItem, '_id'>, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<EduItem, '_id'>>({ ...EMPTY_EDU, ...item });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.institution.trim()) { setError('Institution is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form, item?._id);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1b1b1e]">{item?._id ? 'Edit Education' : 'Add Education'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Institution *</label>
            <input className={inp} value={form.institution} onChange={(e) => set('institution', e.target.value)} placeholder="e.g. MIT" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Degree</label>
              <input className={inp} value={form.degree} onChange={(e) => set('degree', e.target.value)} placeholder="e.g. B.Tech" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Field of Study</label>
              <input className={inp} value={form.field_of_study} onChange={(e) => set('field_of_study', e.target.value)} placeholder="e.g. Computer Science" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input type="month" className={inp} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input type="month" className={inp} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} disabled={form.is_current} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={form.is_current} onChange={(e) => set('is_current', e.target.checked)} className="rounded" />
            Currently studying here
          </label>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea className={`${inp} resize-none`} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Relevant courses, achievements..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm text-white bg-[#ff6b00] rounded-lg hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Experience Modal ─────────────────────────────────────────────────────────

const EMPTY_EXP: Omit<ExpItem, '_id'> = {
  company_name: '', job_title: '', location: '',
  start_date: '', end_date: '', is_current: false, description: '',
};

function ExpModal({
  item, onSave, onClose,
}: {
  item: Partial<ExpItem> | null;
  onSave: (data: Omit<ExpItem, '_id'>, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<ExpItem, '_id'>>({ ...EMPTY_EXP, ...item });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.company_name.trim()) { setError('Company name is required'); return; }
    if (!form.job_title.trim()) { setError('Job title is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form, item?._id);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1b1b1e]">{item?._id ? 'Edit Experience' : 'Add Experience'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company *</label>
              <input className={inp} value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="e.g. Google" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Job Title *</label>
              <input className={inp} value={form.job_title} onChange={(e) => set('job_title', e.target.value)} placeholder="e.g. Software Engineer" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <input className={inp} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. San Francisco, CA" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input type="month" className={inp} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input type="month" className={inp} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} disabled={form.is_current} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={form.is_current} onChange={(e) => set('is_current', e.target.checked)} className="rounded" />
            I currently work here
          </label>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea className={`${inp} resize-none`} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Key responsibilities and achievements..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm text-white bg-[#ff6b00] rounded-lg hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuthStore();
  const [profileMeta, setProfileMeta] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [editing, setEditing] = useState(false);

  const [education, setEducation] = useState<EduItem[]>([]);
  const [eduModal, setEduModal] = useState<{ open: boolean; item: Partial<EduItem> | null }>({ open: false, item: null });

  const [experience, setExperience] = useState<ExpItem[]>([]);
  const [expModal, setExpModal] = useState<{ open: boolean; item: Partial<ExpItem> | null }>({ open: false, item: null });

  const [skills, setSkills] = useState<ProfileSkill[]>([]);
  const [catalog, setCatalog] = useState<SkillTag[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillLoading, setSkillLoading] = useState(false);
  const [showSkillSearch, setShowSkillSearch] = useState(false);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarRef = useRef<HTMLInputElement>(null);

  const [visibility, setVisibility] = useState<'public' | 'companies_only' | 'hidden'>('public');
  const [visibilitySaving, setVisibilitySaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const sortedExperience = [...experience].sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
    return (b.start_date || '').localeCompare(a.start_date || '');
  });
  const sortedEducation = [...education].sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));

  useEffect(() => {
    seekerApi.getProfile().then((res) => {
      const p = res.data?.data ?? res.data ?? {};
      setProfileMeta(p);
      reset({
        firstName: p.first_name ?? '',
        lastName: p.last_name ?? '',
        headline: p.headline ?? '',
        bio: p.bio ?? p.summary ?? '',
        location: p.location ?? p.city ?? '',
        phone: p.phone ?? '',
        linkedin: p.linkedin_url ?? '',
        github: p.github_url ?? '',
      });
      if (p.visibility && (p.visibility === 'public' || p.visibility === 'companies_only' || p.visibility === 'hidden')) {
        setVisibility(p.visibility);
      }
      if (Array.isArray(p.education)) {
        setEducation(p.education.map((e: any) => ({
          _id: e._id ?? '',
          institution: e.institution ?? '',
          degree: e.degree ?? '',
          field_of_study: e.field_of_study ?? '',
          start_date: toYearMonth(e.start_date),
          end_date: toYearMonth(e.end_date),
          is_current: e.is_current ?? false,
          description: e.description ?? '',
        })));
      }
      if (Array.isArray(p.experience)) {
        setExperience(p.experience.map((e: any) => ({
          _id: e._id ?? '',
          company_name: e.company_name ?? e.company ?? '',
          job_title: e.job_title ?? e.title ?? '',
          location: e.location ?? '',
          start_date: toYearMonth(e.start_date),
          end_date: toYearMonth(e.end_date),
          is_current: e.is_current ?? false,
          description: e.description ?? '',
        })));
      }
      if (Array.isArray(p.skills)) {
        setSkills(p.skills.map((s: any) => ({
          tag_id: s.skill_tag_id?._id ?? s.skill_tag_id ?? '',
          name: s.skill_tag_id?.name ?? s.name ?? '',
        })).filter((s: ProfileSkill) => s.tag_id));
      }
      if (Array.isArray(p.resumes)) {
        setResumes(p.resumes);
      }
    }).catch(() => {});

    api.get('/public/skill-tags').then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setCatalog(list.map((s) => ({ id: s._id ?? s.id, name: s.name ?? '' })));
    }).catch(() => {});
  }, [reset]);

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    setSaveMsg('');
    try {
      await seekerApi.updateProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        headline: data.headline,
        bio: data.bio,
        location: data.location,
        phone: data.phone,
        linkedin_url: data.linkedin,
        github_url: data.github,
      });
      setProfileMeta((prev: any) => ({
        ...(prev ?? {}),
        first_name: data.firstName,
        last_name: data.lastName,
        headline: data.headline,
        bio: data.bio,
        location: data.location,
        phone: data.phone,
        linkedin_url: data.linkedin,
        github_url: data.github,
      }));
      setEditing(false);
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {}
    setSaving(false);
  };

  const cancelEdit = () => {
    const p = profileMeta ?? {};
    reset({
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      headline: p.headline ?? '',
      bio: p.bio ?? p.summary ?? '',
      location: p.location ?? p.city ?? '',
      phone: p.phone ?? '',
      linkedin: p.linkedin_url ?? '',
      github: p.github_url ?? '',
    });
    setEditing(false);
  };

  const handleEduSave = async (data: Omit<EduItem, '_id'>, id?: string) => {
    if (id) {
      await seekerApi.updateEducation(id, data as Record<string, unknown>);
      setEducation((prev) => prev.map((e) => e._id === id ? { ...e, ...data } : e));
    } else {
      const res = await seekerApi.addEducation(data as Record<string, unknown>);
      const created = res.data?.data ?? res.data;
      setEducation((prev) => [...prev, { ...data, _id: created._id ?? '' }]);
    }
  };

  const deleteEdu = async (id: string) => {
    await seekerApi.deleteEducation(id);
    setEducation((prev) => prev.filter((e) => e._id !== id));
  };

  const handleExpSave = async (data: Omit<ExpItem, '_id'>, id?: string) => {
    if (id) {
      await seekerApi.updateExperience(id, data as Record<string, unknown>);
      setExperience((prev) => prev.map((e) => e._id === id ? { ...e, ...data } : e));
    } else {
      const res = await seekerApi.addExperience(data as Record<string, unknown>);
      const created = res.data?.data ?? res.data;
      setExperience((prev) => [...prev, { ...data, _id: created._id ?? '' }]);
    }
  };

  const deleteExp = async (id: string) => {
    await seekerApi.deleteExperience(id);
    setExperience((prev) => prev.filter((e) => e._id !== id));
  };

  const addSkill = async (tag: SkillTag) => {
    if (skills.some((s) => s.tag_id === tag.id)) return;
    setSkillLoading(true);
    try {
      await seekerApi.addSkills([tag.id]);
      setSkills((prev) => [...prev, { tag_id: tag.id, name: tag.name }]);
    } catch {}
    setSkillLoading(false);
  };

  const addCustomSkill = async () => {
    const name = skillSearch.trim();
    if (!name) return;
    setSkillLoading(true);
    try {
      const res = await seekerApi.createSkillTag(name);
      const payload = res.data as any;
      const tag = payload?.data ?? payload;
      const id = tag._id ?? tag.id ?? '';
      const tagName = tag.name ?? name;
      if (!skills.some((s) => s.tag_id === id)) {
        await seekerApi.addSkills([id]);
        setSkills((prev) => [...prev, { tag_id: id, name: tagName }]);
        setCatalog((prev) => prev.some((t) => t.id === id) ? prev : [...prev, { id, name: tagName }]);
      }
      setSkillSearch('');
    } catch {}
    setSkillLoading(false);
  };

  const handleRemoveSkill = async (tagId: string) => {
    try {
      await seekerApi.removeSkill(tagId);
      setSkills((prev) => prev.filter((s) => s.tag_id !== tagId));
    } catch {}
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('resume', file);
    try {
      const res = await seekerApi.uploadResume(fd);
      const created = res.data?.data ?? res.data;
      setResumes((prev) => [...prev, created]);
    } catch {}
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDeleteResume = async (id: string) => {
    await seekerApi.deleteResume(id);
    setResumes((prev) => prev.filter((r) => r._id !== id));
  };

  const handleSetDefaultResume = async (id: string) => {
    await seekerApi.setDefaultResume(id);
    setResumes((prev) => prev.map((r) => ({ ...r, is_default: r._id === id })));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError('');
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await seekerApi.uploadAvatar(fd);
      const data = res.data?.data ?? res.data;
      const url = data?.avatar_url ?? data?.profile?.avatar_url ?? '';
      setProfileMeta((prev: any) => ({ ...(prev ?? {}), avatar_url: url }));
    } catch (err: any) {
      setAvatarError(err?.response?.data?.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
      if (avatarRef.current) avatarRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setAvatarError('');
    try {
      await seekerApi.removeAvatar();
      setProfileMeta((prev: any) => ({ ...(prev ?? {}), avatar_url: '' }));
    } catch (err: any) {
      setAvatarError(err?.response?.data?.message || 'Failed to remove photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const cycleVisibility = async () => {
    const next = VISIBILITY_NEXT[visibility];
    setVisibilitySaving(true);
    try {
      await seekerApi.updateVisibility({ visibility: next });
      setVisibility(next);
    } catch {}
    setVisibilitySaving(false);
  };

  const downloadCV = () => {
    const def = resumes.find((r) => r.is_default) ?? resumes[0];
    if (!def) return;
    const url = resolveAsset(def.url);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const firstName = profileMeta?.first_name ?? '';
  const lastName = profileMeta?.last_name ?? '';
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = (firstName[0] ?? '') + (lastName[0] ?? '') || 'U';
  const headline = profileMeta?.headline ?? '';
  const location = profileMeta?.location ?? profileMeta?.city ?? '';
  const bio = profileMeta?.bio ?? profileMeta?.summary ?? '';

  const catalogFiltered = catalog
    .filter((t) => !skills.some((s) => s.tag_id === t.id))
    .filter((t) => !skillSearch || t.name.toLowerCase().includes(skillSearch.toLowerCase()))
    .slice(0, 30);

  const hasDefaultResume = resumes.some((r) => r.is_default) || resumes.length > 0;

  return (
    <div className="glass-canvas relative min-h-[calc(100vh-4rem)] -mt-4 pt-4 pb-20 overflow-hidden">
      <span className="organic-shape bg-[#ff6b00] w-[500px] h-[500px] -top-24 -left-24" />
      <span className="organic-shape bg-[#c6c6c7] w-[400px] h-[400px] top-1/2 right-0" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-10 py-10 space-y-8">
        {/* Profile Hero */}
        <section className="glass-card rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b00]/5 rounded-full -mr-20 -mt-20 blur-3xl" />

          <form onSubmit={handleSubmit(onSubmit)} className="relative">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
              {/* Avatar */}
              <div className="relative group shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-[#ff6b00]/10 flex items-center justify-center">
                  {profileMeta?.avatar_url ? (
                    <img src={resolveAsset(profileMeta.avatar_url)} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#a04100] text-4xl font-bold select-none">{initials.toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.click()}
                    disabled={avatarUploading}
                    className="p-2 bg-[#ff6b00] text-white rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                    title="Change photo"
                  >
                    {avatarUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  </button>
                  {profileMeta?.avatar_url && !avatarUploading && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="p-2 bg-white text-[#5d5e60] border border-white/60 rounded-xl shadow-lg hover:text-red-500 transition-all"
                      title="Remove photo"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              {/* Identity */}
              <div className="flex-1 text-center md:text-left min-w-0">
                {editing ? (
                  <div className="space-y-2 max-w-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#5d5e60] mb-1">First Name *</label>
                        <input {...register('firstName')} className={inp} placeholder="First name" />
                        {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5d5e60] mb-1">Last Name *</label>
                        <input {...register('lastName')} className={inp} placeholder="Last name" />
                        {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5d5e60] mb-1">Headline</label>
                      <input {...register('headline')} className={inp} placeholder="e.g. Senior Product Designer" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5d5e60] mb-1">Location</label>
                      <input {...register('location')} className={inp} placeholder="e.g. San Francisco, CA" />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl md:text-4xl font-bold text-[#1b1b1e]">{fullName || 'Your name'}</h1>
                    <p className="text-lg text-[#5d5e60] mt-1">{headline || 'Add a headline to stand out'}</p>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-4 text-[#5d5e60]">
                      <span className="material-symbols-outlined text-[18px]">location_on</span>
                      <span className="text-sm font-medium">{location || 'Add your location'}</span>
                    </div>
                    {avatarError && <p className="text-xs text-red-500 mt-2">{avatarError}</p>}
                  </>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row md:flex-col xl:flex-row gap-3 shrink-0">
                {editing ? (
                  <>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-[#ff6b00] text-white text-sm font-semibold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg active-glow disabled:opacity-60 flex items-center gap-2 justify-center"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Profile
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="px-6 py-3 bg-white text-[#1b1b1e] border border-[#e2bfb0] text-sm font-semibold rounded-xl hover:bg-[#efedf0] active:scale-95 transition-all disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cycleVisibility}
                      disabled={visibilitySaving}
                      className="px-6 py-3 bg-[#ff6b00] text-white text-sm font-semibold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg active-glow disabled:opacity-60 flex items-center gap-2 justify-center"
                      title="Tap to change visibility"
                    >
                      {visibilitySaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {VISIBILITY_LABEL[visibility]}
                    </button>
                    <button
                      type="button"
                      onClick={downloadCV}
                      disabled={!hasDefaultResume}
                      className="px-6 py-3 bg-white text-[#1b1b1e] border border-[#e2bfb0] text-sm font-semibold rounded-xl hover:bg-[#efedf0] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 justify-center"
                      title={hasDefaultResume ? 'Download CV' : 'Upload a resume first'}
                    >
                      <Download className="w-4 h-4" />
                      Download CV
                    </button>
                  </>
                )}
                {saveMsg && <span className="text-sm text-green-600 font-medium self-center">{saveMsg}</span>}
              </div>
            </div>

            {/* Two-column body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
              {/* Left column */}
              <div className="lg:col-span-4 space-y-8">
                {/* Basic Info */}
                <section className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[#1b1b1e]">Basic Info</h2>
                    {!editing ? (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-[#a04100] text-sm font-medium hover:underline"
                      >
                        Edit All
                      </button>
                    ) : (
                      <span className="text-xs uppercase tracking-wider text-[#ff6b00] font-semibold">Editing</span>
                    )}
                  </div>
                  <div className="space-y-4">
                    <PillField label="Email" value={user?.email ?? '—'} readOnly />
                    {editing ? (
                      <>
                        <FieldEditor label="Phone" register={register('phone')} placeholder="+1 234 567 8900" />
                        <FieldEditor label="LinkedIn" register={register('linkedin')} placeholder="linkedin.com/in/..." />
                        <FieldEditor label="GitHub" register={register('github')} placeholder="github.com/..." />
                      </>
                    ) : (
                      <>
                        <PillField label="Phone" value={profileMeta?.phone || '—'} />
                        <PillField label="LinkedIn" value={profileMeta?.linkedin_url || '—'} link={profileMeta?.linkedin_url} />
                        <PillField label="GitHub" value={profileMeta?.github_url || '—'} link={profileMeta?.github_url} />
                      </>
                    )}
                  </div>
                </section>

                {/* Skills */}
                <section className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[#1b1b1e]">Skills</h2>
                    <button
                      type="button"
                      onClick={() => setShowSkillSearch((v) => !v)}
                      className="p-2 hover:bg-[#ff6b00]/10 rounded-lg text-[#a04100] transition-all"
                      aria-label="Add skills"
                    >
                      <span className="material-symbols-outlined">{showSkillSearch ? 'close' : 'add'}</span>
                    </button>
                  </div>
                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <span
                          key={s.tag_id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ff6b00]/10 border border-[#ff6b00]/20 text-[#a04100] text-sm font-medium rounded-full backdrop-blur-md"
                        >
                          {s.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(s.tag_id)}
                            className="hover:text-[#ff6b00]"
                            aria-label={`Remove ${s.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#8e7164]">Add your top skills to help recruiters find you.</p>
                  )}

                  {showSkillSearch && (
                    <div className="mt-4 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e7164] pointer-events-none" />
                        <input
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          placeholder="Search skills to add..."
                          className={`${inp} pl-9`}
                        />
                      </div>
                      {catalog.length === 0 ? (
                        <p className="text-sm text-[#8e7164]">Loading skill catalog…</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {catalogFiltered.map((tag) => (
                            <button
                              type="button"
                              key={tag.id}
                              onClick={() => addSkill(tag)}
                              disabled={skillLoading}
                              className="px-3 py-1.5 bg-white/60 border border-white/60 text-[#5d5e60] rounded-full text-xs font-medium hover:bg-[#ff6b00]/10 hover:text-[#a04100] hover:border-[#ff6b00]/20 transition-colors disabled:opacity-50"
                            >
                              + {tag.name}
                            </button>
                          ))}
                          {skillSearch.trim() && catalogFiltered.length === 0 && (
                            <button
                              type="button"
                              onClick={addCustomSkill}
                              disabled={skillLoading}
                              className="px-3 py-1.5 bg-[#ff6b00] text-white rounded-full text-xs font-medium hover:brightness-110 disabled:opacity-50 flex items-center gap-1"
                            >
                              {skillLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                              Add &ldquo;{skillSearch.trim()}&rdquo;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Resumes */}
                <section className="glass-card rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[#1b1b1e]">Resumes</h2>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="p-2 bg-[#ff6b00]/10 text-[#a04100] rounded-lg hover:bg-[#ff6b00]/20 transition-all disabled:opacity-50"
                      aria-label="Upload resume"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </button>
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
                  </div>

                  {resumes.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-8 h-8 text-[#8e7164] mx-auto mb-2 opacity-60" />
                      <p className="text-sm text-[#8e7164]">No resumes uploaded yet.</p>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="mt-2 text-sm text-[#a04100] hover:underline"
                      >
                        Upload your resume
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resumes.map((r) => (
                        <div
                          key={r._id}
                          className={`p-4 rounded-2xl flex items-center justify-between transition-all ${
                            r.is_default
                              ? 'bg-white/60 border border-[#ff6b00]/30 shadow-sm'
                              : 'bg-white/40 border border-white/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`material-symbols-outlined ${r.is_default ? 'text-[#a04100]' : 'text-[#5d5e60]'}`}>description</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#1b1b1e] truncate">{r.original_name}</p>
                              {r.is_default ? (
                                <p className="text-[10px] uppercase tracking-wider text-[#a04100] font-bold">Default</p>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultResume(r._id)}
                                  className="text-[10px] uppercase tracking-wider text-[#5d5e60] hover:text-[#a04100] transition-colors"
                                >
                                  Set Default
                                </button>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteResume(r._id)}
                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                            aria-label="Delete resume"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Right column */}
              <div className="lg:col-span-8 space-y-8">
                {/* About Me */}
                <section className="glass-card rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-[#1b1b1e]">About Me</h2>
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-[#a04100] text-sm font-medium hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <textarea
                      {...register('bio')}
                      rows={5}
                      className={`${inp} resize-none`}
                      placeholder="Tell employers about yourself, your work, and what you're looking for..."
                    />
                  ) : (
                    <p className="text-base text-[#5d5e60] leading-relaxed whitespace-pre-line">
                      {bio || 'Add a short bio so employers know what you bring to the table.'}
                    </p>
                  )}
                </section>

                {/* Experience */}
                <section className="glass-card rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-semibold text-[#1b1b1e]">Professional Experience</h2>
                    <button
                      type="button"
                      onClick={() => setExpModal({ open: true, item: null })}
                      className="flex items-center gap-2 px-4 py-2 bg-[#ff6b00] text-white rounded-xl text-sm font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                      Add Experience
                    </button>
                  </div>

                  {sortedExperience.length === 0 ? (
                    <div className="text-center py-10">
                      <Briefcase className="w-10 h-10 text-[#8e7164] mx-auto mb-2 opacity-60" />
                      <p className="text-sm text-[#8e7164]">No experience added yet.</p>
                      <button
                        type="button"
                        onClick={() => setExpModal({ open: true, item: null })}
                        className="mt-2 text-sm text-[#a04100] hover:underline"
                      >
                        Add your first experience
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {sortedExperience.map((exp) => (
                        <div
                          key={exp._id}
                          className="relative pl-8 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-0 before:w-px before:bg-[#e2bfb0]/60"
                        >
                          <div
                            className={`absolute left-[-4px] top-2 w-2 h-2 rounded-full ${
                              exp.is_current ? 'bg-[#ff6b00] shadow-[0_0_8px_#FF6B00]' : 'bg-[#c6c6c8]'
                            }`}
                          />
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                            <div>
                              <h3 className="text-lg font-semibold text-[#1b1b1e]">{exp.job_title}</h3>
                              <p className="text-sm font-medium text-[#a04100] mb-2">
                                {exp.company_name}
                                {exp.location && <span className="text-[#5d5e60]"> · {exp.location}</span>}
                              </p>
                              <p className="text-xs text-[#5d5e60] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                                {formatMonth(exp.start_date)} — {exp.is_current ? 'Present' : formatMonth(exp.end_date) || 'N/A'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setExpModal({ open: true, item: exp })}
                                className="p-2 hover:bg-white/60 rounded-lg text-[#5d5e60] transition-all"
                                aria-label="Edit experience"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteExp(exp._id)}
                                className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                                aria-label="Delete experience"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {exp.description && (
                            <p className="text-sm text-[#5d5e60] mt-4 leading-relaxed">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Education */}
                <section className="glass-card rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-semibold text-[#1b1b1e]">Education</h2>
                    <button
                      type="button"
                      onClick={() => setEduModal({ open: true, item: null })}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e2bfb0] rounded-xl text-sm font-semibold hover:bg-[#efedf0] transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[20px]">school</span>
                      Add Education
                    </button>
                  </div>

                  {sortedEducation.length === 0 ? (
                    <div className="text-center py-10">
                      <GraduationCap className="w-10 h-10 text-[#8e7164] mx-auto mb-2 opacity-60" />
                      <p className="text-sm text-[#8e7164]">No education added yet.</p>
                      <button
                        type="button"
                        onClick={() => setEduModal({ open: true, item: null })}
                        className="mt-2 text-sm text-[#a04100] hover:underline"
                      >
                        Add your education
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {sortedEducation.map((edu) => (
                        <div key={edu._id} className="flex gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-white/50 border border-white flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#a04100] text-[32px]">account_balance</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-[#1b1b1e]">{edu.institution}</h3>
                                <p className="text-sm font-medium text-[#a04100]">
                                  {edu.degree}{edu.field_of_study ? ` · ${edu.field_of_study}` : ''}
                                </p>
                                <p className="text-xs text-[#5d5e60] mt-1">
                                  {formatMonth(edu.start_date)} — {edu.is_current ? 'Present' : formatMonth(edu.end_date) || 'N/A'}
                                </p>
                                {edu.description && (
                                  <p className="text-sm text-[#5d5e60] mt-2 leading-relaxed">{edu.description}</p>
                                )}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEduModal({ open: true, item: edu })}
                                  className="p-2 hover:bg-white/60 rounded-lg text-[#5d5e60] transition-all"
                                  aria-label="Edit education"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteEdu(edu._id)}
                                  className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                                  aria-label="Delete education"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </form>
        </section>

        {/* Modals */}
        {expModal.open && (
          <ExpModal
            item={expModal.item}
            onSave={handleExpSave}
            onClose={() => setExpModal({ open: false, item: null })}
          />
        )}
        {eduModal.open && (
          <EduModal
            item={eduModal.item}
            onSave={handleEduSave}
            onClose={() => setEduModal({ open: false, item: null })}
          />
        )}
      </main>
    </div>
  );
}

function PillField({
  label,
  value,
  link,
  readOnly,
}: {
  label: string;
  value: string;
  link?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5d5e60] mb-1">
        {label}
        {readOnly && <span className="ml-2 text-[#8e7164] font-normal">(read-only)</span>}
      </label>
      <div className={`text-sm p-3 bg-white/40 rounded-xl border border-white/50 truncate ${link ? 'text-[#a04100]' : 'text-[#1b1b1e]'}`}>
        {link ? (
          <a href={/^https?:\/\//.test(link) ? link : `https://${link}`} target="_blank" rel="noopener" className="hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function FieldEditor({
  label,
  register,
  placeholder,
}: {
  label: string;
  register: any;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5d5e60] mb-1">{label}</label>
      <input {...register} className={inp} placeholder={placeholder} />
    </div>
  );
}
