import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, MapPin } from 'lucide-react';
import * as api from '@/api/official';
import { LocationPicker, type PickedLocation } from '@/components/ui/LocationPicker';

interface Form {
  first_name: string;
  last_name: string;
  designation: string;
  phone: string;
  email_alt: string;
  address: string;
  city: string;
  state: string;
  country: string;
  avatar_url: string;
  latitude: number | null;
  longitude: number | null;
}

const blank: Form = {
  first_name: '', last_name: '', designation: '',
  phone: '', email_alt: '',
  address: '', city: '', state: '', country: '',
  avatar_url: '',
  latitude: null, longitude: null,
};

export default function Profile() {
  const [form, setForm] = useState<Form>(blank);
  const [meta, setMeta] = useState({ email: '', radius: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getMe();
        const p: any = res.data?.data ?? {};
        setForm({
          first_name: p.first_name ?? '',
          last_name: p.last_name ?? '',
          designation: p.designation ?? '',
          phone: p.phone ?? '',
          email_alt: p.email_alt ?? '',
          address: p.address ?? '',
          city: p.city ?? '',
          state: p.state ?? '',
          country: p.country ?? '',
          avatar_url: p.avatar_url ?? '',
          latitude: p.latitude ?? null,
          longitude: p.longitude ?? null,
        });
        setMeta({
          email: typeof p.user_id === 'object' ? p.user_id.email : '',
          radius: p.search_radius_km ?? 100,
        });
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = { ...form };
      if (form.latitude == null || form.longitude == null) {
        delete payload.latitude;
        delete payload.longitude;
      }
      await api.updateMe(payload);
      setSavedAt(Date.now());
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePick = (loc: PickedLocation) => {
    setForm((prev) => ({
      ...prev,
      latitude: loc.latitude,
      longitude: loc.longitude,
      city: loc.city || prev.city,
      state: loc.state ?? prev.state,
      country: loc.country || prev.country,
      address: loc.address ?? prev.address,
    }));
    setPickerOpen(false);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Edit your contact info. Location & radius are admin-managed.</p>
      </motion.div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Email" value={meta.email || '—'} />
          <Stat label="Radius" value={`${meta.radius} km`} />
          <Stat
            label="Latitude"
            value={form.latitude != null ? form.latitude.toFixed(5) : '—'}
          />
          <Stat
            label="Longitude"
            value={form.longitude != null ? form.longitude.toFixed(5) : '—'}
          />
        </div>

        <div className="mb-6 p-4 rounded-xl border border-orange-200 bg-orange-50/50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {form.latitude != null && form.longitude != null ? 'Location set' : 'No location set'}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {form.latitude != null && form.longitude != null
                ? [form.address, form.city, form.state, form.country].filter(Boolean).join(', ') ||
                  `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
                : 'Pick your office on the map for accurate radius matching.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 whitespace-nowrap"
          >
            {form.latitude != null ? 'Change on map' : 'Pick on map'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          {savedAt && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">Saved.</div>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input required type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Last Name" required>
              <input required type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputCls} />
            </Field>
          </div>

          <Field label="Designation" required>
            <input required type="text" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Alternate Email">
              <input type="email" value={form.email_alt} onChange={(e) => setForm({ ...form, email_alt: e.target.value })} className={inputCls} />
            </Field>
          </div>

          <Field label="Address">
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
          </Field>

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

          <Field label="Avatar URL">
            <input type="text" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className={inputCls} placeholder="https://..." />
          </Field>

          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-medium disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {pickerOpen && (
        <LocationPicker
          onSelect={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{value}</p>
    </div>
  );
}
