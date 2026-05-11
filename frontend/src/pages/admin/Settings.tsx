import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Save,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Key,
} from 'lucide-react';
import * as adminApi from '../../api/admin';

interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  category?: string;
}

const allCategories = ['general', 'limits', 'jobs', 'auth', 'notifications', 'system'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Settings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: '', value: '', description: '', category: 'general' });

  useEffect(() => {
    adminApi.getConfig().then((res) => {
      const data = res.data?.data ?? res.data ?? {};
      if (typeof data === 'object' && !Array.isArray(data)) {
        setSettings(Object.entries(data).map(([key, value]) => ({
          key,
          value: String(value),
          description: '',
          category: 'general',
        })));
      }
    }).catch(() => {});
  }, []);

  const handleEdit = (setting: SystemSetting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const handleSave = async () => {
    setSettings(prev =>
      prev.map(s => (s.key === editingKey ? { ...s, value: editValue } : s))
    );
    setEditingKey(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleDelete = (key: string) => {
    setSettings(prev => prev.filter(s => s.key !== key));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(prev => [...prev, { ...newSetting }]);
    setNewSetting({ key: '', value: '', description: '', category: 'general' });
    setIsAddModalOpen(false);
  };

  const handleSaveAll = async () => {
    try {
      const payload = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, unknown>);
      await adminApi.updateConfig(payload);
    } catch {}
    setIsSaveModalOpen(false);
  };

  const categories = Array.from(new Set(settings.map(s => s.category ?? 'general').filter(Boolean)));
  const settingsByCategory = (categories.length ? categories : allCategories).reduce((acc, category) => {
    acc[category] = settings.filter(s => (s.category ?? 'general') === category);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Configure platform settings and preferences</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Setting
          </button>
          <button
            onClick={() => setIsSaveModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium shadow-lg shadow-orange-200"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>
        </div>
      </motion.div>

      {/* Settings by Category */}
      {categories.map((category) => {
        const categorySettings = settingsByCategory[category];
        if (categorySettings.length === 0) return null;

        return (
          <motion.div
            key={category}
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize flex items-center gap-2">
              {category === 'general' && <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><SettingsIcon className="w-4 h-4 text-blue-600" /></span>}
              {category === 'limits' && <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><Key className="w-4 h-4 text-purple-600" /></span>}
              {category === 'jobs' && <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center"><Briefcase className="w-4 h-4 text-orange-600" /></span>}
              {category === 'auth' && <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-green-600" /></span>}
              {category === 'notifications' && <span className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center"><Bell className="w-4 h-4 text-yellow-600" /></span>}
              {category === 'system' && <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><AlertCircle className="w-4 h-4 text-red-600" /></span>}
              {category} Settings
            </h3>
            <div className="space-y-4">
              {categorySettings.map((setting) => (
                <div
                  key={setting.key}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 font-mono">{setting.key}</p>
                    {setting.description && (
                      <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {editingKey === setting.key ? (
                      <>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 w-48"
                        />
                        <button
                          onClick={handleSave}
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title="Save"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 font-mono">
                          {setting.value}
                        </span>
                        <button
                          onClick={() => handleEdit(setting)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(setting.key)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Add Setting Modal */}
      {isAddModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add New Setting</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Setting Key
                </label>
                <input
                  type="text"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  placeholder="e.g., max_upload_size"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Value
                </label>
                <input
                  type="text"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Setting value"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Brief description of this setting"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newSetting.category}
                  onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 capitalize"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="capitalize">{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium"
                >
                  Add Setting
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Save Confirmation Modal */}
      {isSaveModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsSaveModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Save className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Save Changes
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to save all changes? This action will update the system configuration.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Briefcase(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></motion.svg>;
}

function Shield(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3 5-3 10"/><path d="M9 17h6"/><path d="M5 14H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/><circle cx="12" cy="17" r="5"/></motion.svg>;
}

function Bell(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></motion.svg>;
}

function Edit2(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return <motion.svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></motion.svg>;
}