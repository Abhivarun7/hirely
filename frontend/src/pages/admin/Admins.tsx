import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Plus,
  Edit2,
  UserX,
  Mail,
  Phone,
  BadgeCheck,
  LogIn,
  CheckCircle,
  Lock,
  Camera,
  Upload,
} from 'lucide-react';
import * as adminApi from '../../api/admin';
import type { RoleRecord, PermissionCatalog } from '../../api/admin';
import PermissionMatrix from './PermissionMatrix';

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(
  /\/api\/v1\/?$/,
  ''
);

function fullUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN}${url}`;
}

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  employeeId?: string;
  avatarUrl?: string;
  roleId?: string;
  roleName: string;
  isSystemRole: boolean;
  rolePermissions: string[];
  extraPermissions: string[];
  status: 'active' | 'deactivated';
  createdAt: string;
  lastLogin?: string;
}

interface FormState {
  email: string;
  role_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  employee_id: string;
  avatar_url: string;
  extra_permissions: Set<string>;
}

const EMPTY_FORM: FormState = {
  email: '',
  role_id: '',
  first_name: '',
  last_name: '',
  phone: '',
  employee_id: '',
  avatar_url: '',
  extra_permissions: new Set<string>(),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

function getInitials(first: string, last: string, email: string): string {
  const f = first?.[0];
  const l = last?.[0];
  if (f && l) return `${f}${l}`.toUpperCase();
  if (f) return f.toUpperCase();
  return (email[0] ?? 'A').toUpperCase();
}

export default function Admins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      adminApi.getAdmins(),
      adminApi.getRoles(),
      adminApi.getPermissionCatalog(),
    ])
      .then(([adminsRes, rolesRes, catalogRes]) => {
        const aList: any[] = (adminsRes.data as any)?.data ?? adminsRes.data ?? [];
        setAdmins(aList.map(mapAdmin));
        const rList = (rolesRes.data as any)?.data ?? rolesRes.data ?? [];
        setRoles(Array.isArray(rList) ? rList : []);
        const c = (catalogRes.data as any)?.data ?? catalogRes.data;
        if (c) setCatalog(c as PermissionCatalog);
      })
      .catch(() => {});
  }, []);

  const reload = async () => {
    try {
      const res = await adminApi.getAdmins();
      const list: any[] = (res.data as any)?.data ?? res.data ?? [];
      setAdmins(list.map(mapAdmin));
    } catch {}
  };

  const selectedRole = useMemo(
    () => roles.find((r) => r._id === form.role_id) ?? null,
    [roles, form.role_id]
  );

  const inheritedPerms = useMemo(
    () => new Set(selectedRole?.permissions ?? []),
    [selectedRole]
  );

  const openCreate = () => {
    setEditingAdmin(null);
    setForm({
      ...EMPTY_FORM,
      role_id: roles[0]?._id ?? '',
      extra_permissions: new Set(),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setForm({
      email: admin.email,
      role_id: admin.roleId ?? roles[0]?._id ?? '',
      first_name: admin.firstName,
      last_name: admin.lastName,
      phone: admin.phone ?? '',
      employee_id: admin.employeeId ?? '',
      avatar_url: admin.avatarUrl ?? '',
      extra_permissions: new Set(admin.extraPermissions),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const togglePermission = (perm: string) => {
    setForm((prev) => {
      const next = new Set(prev.extra_permissions);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return { ...prev, extra_permissions: next };
    });
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar must be 5 MB or smaller');
      return;
    }
    setAvatarUploading(true);
    setError(null);
    try {
      const res = await adminApi.uploadAdminAvatar(file);
      const url = (res.data as any)?.data?.url;
      if (url) setForm((prev) => ({ ...prev, avatar_url: url }));
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!form.role_id) throw new Error('Pick a role');
      const extras = Array.from(form.extra_permissions);
      const payload = {
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        employee_id: form.employee_id.trim() || undefined,
        avatar_url: form.avatar_url || undefined,
        role_id: form.role_id,
        extra_permissions: extras,
      };
      if (editingAdmin) {
        await adminApi.updateAdmin(editingAdmin.id, payload);
      } else {
        await adminApi.createAdmin({ email: form.email.trim(), ...payload });
      }
      setIsModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to save admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (admin: Admin) => {
    if (!confirm(`Deactivate ${admin.fullName || admin.email}?`)) return;
    try {
      await adminApi.updateAdmin(admin.id, { is_active: false });
      await reload();
    } catch {}
  };

  const handleReactivate = async (admin: Admin) => {
    try {
      await adminApi.updateAdmin(admin.id, { is_active: true });
      await reload();
    } catch {}
  };

  const activeAdmins = admins.filter((a) => a.status === 'active');
  const deactivatedAdmins = admins.filter((a) => a.status === 'deactivated');
  const superAdmins = admins.filter((a) => a.roleName === 'super_admin');

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Accounts</h1>
          <p className="text-gray-600 mt-1">Manage admin users and their permissions</p>
        </div>
        <button
          onClick={openCreate}
          disabled={roles.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium shadow-lg shadow-orange-200 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Add Admin
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Admins" value={admins.length} />
        <Stat label="Active" value={activeAdmins.length} />
        <Stat label="Super Admins" value={superAdmins.length} />
        <Stat label="Deactivated" value={deactivatedAdmins.length} />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Extras</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No admins yet.
                  </td>
                </tr>
              )}
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {admin.avatarUrl ? (
                        <img
                          src={fullUrl(admin.avatarUrl)}
                          alt={admin.fullName}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
                            admin.status === 'active'
                              ? 'bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {getInitials(admin.firstName, admin.lastName, admin.email)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {admin.fullName || admin.email}
                        </p>
                        {admin.employeeId && (
                          <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" />
                            {admin.employeeId}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate max-w-[180px]">{admin.email}</span>
                    </div>
                    {admin.phone && (
                      <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {admin.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200">
                      {admin.isSystemRole && <Lock className="w-3 h-3" />}
                      <Shield className="w-3.5 h-3.5" />
                      {admin.roleName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {admin.extraPermissions.length > 0 ? `+${admin.extraPermissions.length}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        admin.status === 'active'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {admin.status === 'active' ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <UserX className="w-3.5 h-3.5" />
                      )}
                      {admin.status === 'active' ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(admin)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      {admin.status === 'active' ? (
                        <button
                          onClick={() => handleDeactivate(admin)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate"
                        >
                          <UserX className="w-4 h-4 text-red-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(admin)}
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingAdmin ? `Edit admin: ${editingAdmin.fullName || editingAdmin.email}` : 'Add new admin'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {form.avatar_url ? (
                      <img
                        src={fullUrl(form.avatar_url)}
                        alt="Avatar"
                        className="w-20 h-20 rounded-2xl object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-bold text-xl">
                        {getInitials(form.first_name, form.last_name, form.email)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md hover:bg-orange-600 disabled:opacity-50"
                      title="Change photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarPick}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Profile photo</p>
                    <p className="text-xs text-gray-500">JPEG, PNG, or WebP — up to 5 MB.</p>
                    {avatarUploading && (
                      <p className="text-xs text-orange-600 mt-1 inline-flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Uploading…
                      </p>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Alex"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Mercer"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Email + Phone + Employee ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={!!editingAdmin}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="admin@hirely.com"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="+1 555 123 4567"
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={form.employee_id}
                      onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="EMP-2026-001"
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={form.role_id}
                    onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">— Pick a role —</option>
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} {r.is_system ? '(system)' : ''} — {r.permissions.length} perms
                      </option>
                    ))}
                  </select>
                  {selectedRole?.description && (
                    <p className="mt-1 text-xs text-gray-500">{selectedRole.description}</p>
                  )}
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Extra permissions ({form.extra_permissions.size} added on top of role)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Permissions inherited from the role are shown ticked and locked. Tick additional
                    permissions to grant on top.
                  </p>
                  {catalog ? (
                    <PermissionMatrix
                      catalog={catalog.catalog}
                      selected={form.extra_permissions}
                      inherited={inheritedPerms}
                      onToggle={togglePermission}
                    />
                  ) : (
                    <p className="text-sm text-gray-500">Loading permission catalog…</p>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : editingAdmin ? 'Save changes' : 'Create admin'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

function mapAdmin(a: any): Admin {
  const role = a.admin_role_id ?? null;
  const roleName = role?.name ?? a.role ?? 'unknown';
  const firstName = a.first_name ?? '';
  const lastName = a.last_name ?? '';
  const fullName = `${firstName} ${lastName}`.trim();
  return {
    id: a._id ?? a.id,
    firstName,
    lastName,
    fullName,
    email: a.email ?? '',
    phone: a.phone,
    employeeId: a.employee_id,
    avatarUrl: a.avatar_url,
    roleId: role?._id ?? role?.id,
    roleName,
    isSystemRole: role?.is_system ?? false,
    rolePermissions: role?.permissions ?? [],
    extraPermissions: a.extra_permissions ?? [],
    status: a.is_active ? 'active' : 'deactivated',
    createdAt: a.createdAt ?? a.created_at ?? '',
    lastLogin: a.last_login_at ?? a.last_login ?? a.lastLogin,
  };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-white rounded-xl border border-gray-100">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
