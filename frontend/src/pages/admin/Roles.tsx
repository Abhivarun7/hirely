import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Edit2, Trash2, Lock } from 'lucide-react';
import * as adminApi from '../../api/admin';
import type { RoleRecord, PermissionCatalog } from '../../api/admin';
import PermissionMatrix from './PermissionMatrix';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface FormState {
  name: string;
  description: string;
  permissions: Set<string>;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  permissions: new Set<string>(),
};

export default function Roles() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([adminApi.getRoles(), adminApi.getPermissionCatalog()])
      .then(([rolesRes, catalogRes]) => {
        const list = (rolesRes.data as any)?.data ?? rolesRes.data ?? [];
        setRoles(Array.isArray(list) ? list : []);
        const c = (catalogRes.data as any)?.data ?? catalogRes.data;
        if (c) setCatalog(c as PermissionCatalog);
      })
      .catch(() => {});
  }, []);

  const reload = async () => {
    try {
      const res = await adminApi.getRoles();
      const list = (res.data as any)?.data ?? res.data ?? [];
      setRoles(Array.isArray(list) ? list : []);
    } catch {}
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, permissions: new Set<string>() });
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (role: RoleRecord) => {
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description ?? '',
      permissions: new Set(role.permissions),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const togglePermission = (perm: string) => {
    setForm((prev) => {
      const next = new Set(prev.permissions);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return { ...prev, permissions: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        permissions: Array.from(form.permissions),
      };
      if (editing) {
        if (editing.is_system) throw new Error('System roles cannot be modified');
        await adminApi.updateRole(editing._id, payload);
      } else {
        await adminApi.createRole(payload);
      }
      setIsModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: RoleRecord) => {
    if (role.is_system) return;
    if (!confirm(`Delete role "${role.name}"? Admins assigned to it will need to be reassigned first.`))
      return;
    try {
      await adminApi.deleteRole(role._id);
      await reload();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to delete role');
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-600 mt-1">
            Define roles with specific create / view / edit / delete privileges.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium shadow-lg shadow-orange-200"
        >
          <Plus className="w-5 h-5" />
          Create role
        </button>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Permissions
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {roles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No roles yet. Create one to get started.
                </td>
              </tr>
            )}
            {roles.map((role) => (
              <tr key={role._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        role.is_system ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-gray-500 max-w-md">{role.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
                </td>
                <td className="px-6 py-4">
                  {role.is_system ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                      <Lock className="w-3 h-3" />
                      System
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Custom
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(role)}
                      disabled={role.is_system}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={role.is_system ? 'System roles cannot be edited' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      disabled={role.is_system}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={role.is_system ? 'System roles cannot be deleted' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                {editing ? `Edit role: ${editing.name}` : 'Create new role'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Content Auditor"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="What can this role do?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions ({form.permissions.size} selected)
                  </label>
                  {catalog ? (
                    <PermissionMatrix
                      catalog={catalog.catalog}
                      selected={form.permissions}
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
                  {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create role'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
