import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserCog,
  Plus,
  Edit2,
  UserX,
  Mail,
  MapPin,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import * as adminApi from '../../api/admin';
import { LocationPicker, type PickedLocation } from '../../components/ui/LocationPicker';

interface Official {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  designation: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  search_radius_km: number;
  avatar_url?: string;
  is_active: boolean;
  createdAt: string;
}

interface FormState {
  email: string;
  first_name: string;
  last_name: string;
  designation: string;
  phone: string;
  email_alt: string;
  employee_code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  search_radius_km: string;
}

const blankForm: FormState = {
  email: '',
  first_name: '',
  last_name: '',
  designation: '',
  phone: '',
  email_alt: '',
  employee_code: '',
  address: '',
  city: '',
  state: '',
  country: '',
  latitude: '',
  longitude: '',
  search_radius_km: '100',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

function rowToOfficial(r: any): Official {
  const u = r.user_id && typeof r.user_id === 'object' ? r.user_id : null;
  return {
    id: r._id ?? r.id,
    user_id: u?._id ?? r.user_id ?? '',
    email: u?.email ?? r.email ?? '',
    first_name: r.first_name ?? '',
    last_name: r.last_name ?? '',
    designation: r.designation ?? '',
    phone: r.phone,
    city: r.city,
    state: r.state,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
    search_radius_km: r.search_radius_km ?? 100,
    avatar_url: r.avatar_url,
    is_active: r.is_active ?? true,
    createdAt: r.createdAt ?? '',
  };
}

export default function Officials() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Official | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOfficials({ limit: 100 });
      const list: any[] = res.data?.data ?? res.data ?? [];
      setOfficials(list.map(rowToOfficial));
    } catch {
      // surfaced via empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (o: Official) => {
    setEditing(o);
    setForm({
      email: o.email,
      first_name: o.first_name,
      last_name: o.last_name,
      designation: o.designation,
      phone: o.phone ?? '',
      email_alt: '',
      employee_code: '',
      address: '',
      city: o.city ?? '',
      state: o.state ?? '',
      country: o.country ?? '',
      latitude: o.latitude != null ? String(o.latitude) : '',
      longitude: o.longitude != null ? String(o.longitude) : '',
      search_radius_km: String(o.search_radius_km),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const buildPayload = (): adminApi.OfficialPayload => {
    const payload: adminApi.OfficialPayload = {
      first_name: form.first_name || undefined,
      last_name: form.last_name || undefined,
      designation: form.designation || undefined,
      phone: form.phone || undefined,
      email_alt: form.email_alt || undefined,
      employee_code: form.employee_code || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      country: form.country || undefined,
      search_radius_km: form.search_radius_km ? Number(form.search_radius_km) : undefined,
    };
    if (form.latitude && form.longitude) {
      payload.latitude = Number(form.latitude);
      payload.longitude = Number(form.longitude);
    }
    if (!editing) {
      payload.email = form.email;
    }
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await adminApi.updateOfficial(editing.id, buildPayload());
      } else {
        await adminApi.createOfficial(buildPayload());
      }
      setIsModalOpen(false);
      await fetch();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await adminApi.deactivateOfficial(id);
      setOfficials((prev) => prev.map((o) => (o.id === id ? { ...o, is_active: false } : o)));
    } catch {}
  };

  const handleReactivate = async (id: string) => {
    try {
      await adminApi.reactivateOfficial(id);
      setOfficials((prev) => prev.map((o) => (o.id === id ? { ...o, is_active: true } : o)));
    } catch {}
  };

  const handleResend = async (id: string) => {
    try { await adminApi.resendOfficialWelcome(id); } catch {}
  };

  const active = officials.filter((o) => o.is_active);
  const inactive = officials.filter((o) => !o.is_active);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employment Officials</h1>
          <p className="text-gray-600 mt-1">
            Manage local officials who push candidates to companies
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium shadow-lg shadow-orange-200"
        >
          <Plus className="w-5 h-5" />
          Add Official
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{officials.length}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{active.length}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{inactive.length}</p>
          <p className="text-sm text-gray-500">Deactivated</p>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Official</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Radius</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">Loading…</td></tr>
              )}
              {!loading && officials.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  No officials yet. Click "Add Official" to create one.
                </td></tr>
              )}
              {officials.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        o.is_active
                          ? 'bg-gradient-to-br from-orange-100 to-orange-50'
                          : 'bg-gray-100'
                      }`}>
                        {o.avatar_url ? (
                          <img src={o.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <span className={`font-bold text-sm ${o.is_active ? 'text-orange-600' : 'text-gray-500'}`}>
                            {`${o.first_name[0] ?? ''}${o.last_name[0] ?? ''}`.toUpperCase() || 'O'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{o.first_name} {o.last_name}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Mail className="w-3.5 h-3.5" />
                          {o.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                      <UserCog className="w-3.5 h-3.5" />
                      {o.designation || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {[o.city, o.state, o.country].filter(Boolean).join(', ') || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {o.search_radius_km} km
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      o.is_active
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      {o.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      {o.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResend(o.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Resend welcome email"
                      >
                        <RefreshCw className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => openEdit(o)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      {o.is_active ? (
                        <button
                          onClick={() => handleDeactivate(o.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate"
                        >
                          <UserX className="w-4 h-4 text-red-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(o.id)}
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title="Reactivate"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editing ? 'Edit Official' : 'Add New Official'}
              </h2>
              {!editing && (
                <p className="text-sm text-gray-500 mt-1">
                  A welcome email will be sent so they can set their own password.
                </p>
              )}
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {!editing && (
                <Field label="Email" required>
                  <input type="email" value={form.email} required
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="official@example.gov" />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required>
                  <input type="text" value={form.first_name} required
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </Field>
                <Field label="Last Name" required>
                  <input type="text" value={form.last_name} required
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </Field>
              </div>

              <Field label="Designation" required>
                <input type="text" value={form.designation} required
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="District Employment Officer" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                  <input type="text" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </Field>
                <Field label="Employee Code">
                  <input type="text" value={form.employee_code}
                    onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </Field>
              </div>

              <Field label="Address">
                <input type="text" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field label="City">
                  <input type="text" value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </Field>
                <Field label="State">
                  <input type="text" value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </Field>
                <Field label="Country">
                  <input type="text" value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </Field>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Location
                </label>
                <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/50 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {form.latitude && form.longitude ? 'Location set' : 'No location set'}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {form.latitude && form.longitude
                        ? `${Number(form.latitude).toFixed(5)}, ${Number(form.longitude).toFixed(5)}`
                        : 'Pick on the map for radius-based job matching.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 whitespace-nowrap"
                  >
                    {form.latitude ? 'Change on map' : 'Pick on map'}
                  </button>
                </div>
              </div>

              <Field label="Radius (km)">
                <input type="number" min={1} max={1000} value={form.search_radius_km}
                  onChange={(e) => setForm({ ...form, search_radius_km: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : editing ? 'Update' : 'Create Official'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {pickerOpen && (
        <LocationPicker
          onSelect={(loc: PickedLocation) => {
            setForm((prev) => ({
              ...prev,
              latitude: String(loc.latitude),
              longitude: String(loc.longitude),
              city: loc.city || prev.city,
              state: loc.state ?? prev.state,
              country: loc.country || prev.country,
              address: loc.address ?? prev.address,
            }));
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </motion.div>
  );
}

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
