import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { companyEndpoints } from '../../api/company';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Building2,
  X,
  MapPinned,
} from 'lucide-react';
import { Button, Input, Card, LocationPicker } from '../../components/ui';
import type { PickedLocation } from '../../components/ui';

interface Branch {
  id: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
  google_place_id?: string;
  status: 'active' | 'inactive';
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const emptyForm = {
  name: '',
  city: '',
  state: '',
  country: '',
  address: '',
  latitude: 0,
  longitude: 0,
  google_place_id: '',
  status: 'active' as Branch['status'],
};

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    companyEndpoints.getBranches().then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setBranches(
        list.map((b: any) => ({
          id: b._id ?? b.id,
          name: b.name ?? b.city ?? '',
          city: b.city ?? '',
          state: b.state,
          country: b.country ?? '',
          address: b.address ?? '',
          latitude: b.latitude ?? 0,
          longitude: b.longitude ?? 0,
          google_place_id: b.google_place_id,
          status: b.is_active === false ? 'inactive' : 'active',
        }))
      );
    }).catch(() => {});
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      city: branch.city,
      state: branch.state ?? '',
      country: branch.country,
      address: branch.address,
      latitude: branch.latitude,
      longitude: branch.longitude,
      google_place_id: branch.google_place_id ?? '',
      status: branch.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  const handleLocationPick = (loc: PickedLocation) => {
    setFormData((prev) => ({
      ...prev,
      city: loc.city || prev.city,
      state: loc.state ?? prev.state,
      country: loc.country || prev.country,
      address: loc.address ?? prev.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      google_place_id: loc.google_place_id ?? prev.google_place_id,
    }));
    setShowPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        city: formData.city,
        state: formData.state || undefined,
        country: formData.country,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        google_place_id: formData.google_place_id || undefined,
        is_active: formData.status === 'active',
      };

      if (editingBranch) {
        await companyEndpoints.updateBranch(editingBranch.id, payload);
        setBranches((prev) =>
          prev.map((b) =>
            b.id === editingBranch.id
              ? { ...b, ...formData }
              : b
          )
        );
      } else {
        const res = await companyEndpoints.createBranch(payload);
        const created = res.data?.data ?? res.data ?? {};
        setBranches((prev) => [
          ...prev,
          { ...formData, id: created._id ?? created.id ?? Date.now().toString() },
        ]);
      }
    } catch {}
    closeModal();
  };

  const handleDelete = async (id: string) => {
    try {
      await companyEndpoints.deleteBranch(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
    } catch {}
    setDeleteConfirm(null);
  };

  const hasLocation = formData.latitude !== 0 || formData.longitude !== 0;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-600 mt-1">Manage your company locations</p>
        </div>
        <Button onClick={openAddModal} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Branch
        </Button>
      </motion.div>

      {/* Branches List */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branches.map((branch) => (
          <motion.div
            key={branch.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{branch.name || branch.city}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      branch.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {branch.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{branch.address || `${branch.city}, ${branch.country}`}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(branch)}
                  className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(branch.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {branches.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <MapPinned className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No branches yet</h3>
          <p className="mt-1 text-gray-500">Add your first branch location to get started.</p>
          <Button onClick={openAddModal} variant="primary" className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={closeModal}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingBranch ? 'Edit Branch' : 'Add Branch'}
              </h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Downtown Office, HQ"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                    hasLocation
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-dashed border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <MapPinned className={`w-5 h-5 flex-shrink-0 ${hasLocation ? 'text-orange-500' : 'text-gray-400'}`} />
                  <div className="min-w-0">
                    {hasLocation ? (
                      <>
                        <p className="text-sm font-medium text-orange-700 truncate">
                          {formData.city}{formData.state ? `, ${formData.state}` : ''}{formData.country ? `, ${formData.country}` : ''}
                        </p>
                        {formData.address && (
                          <p className="text-xs text-orange-500 truncate">{formData.address}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Click to pick location on map</p>
                    )}
                  </div>
                  {hasLocation && (
                    <span className="ml-auto text-xs text-orange-400 flex-shrink-0">Change</span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Mumbai"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                  <Input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., India"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full street address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Branch['status'] })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!formData.name || !hasLocation || !formData.city || !formData.country || !formData.address}
                >
                  {editingBranch ? 'Save Changes' : 'Add Branch'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Location Picker (rendered outside the modal so it sits above it) */}
      {showPicker && (
        <LocationPicker onSelect={handleLocationPick} onClose={() => setShowPicker(false)} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setDeleteConfirm(null)}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900">Delete Branch?</h3>
              <p className="mt-2 text-gray-500">
                Are you sure you want to delete this branch? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
