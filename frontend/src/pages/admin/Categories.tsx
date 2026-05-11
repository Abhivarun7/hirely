import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Briefcase,
  X,
} from 'lucide-react';
import * as adminApi from '../../api/admin';

interface Category {
  id: string;
  name: string;
  icon: string;
  jobCount: number;
  createdAt: string;
}


const iconOptions = [
  'code', 'heart', 'dollar', 'book', 'megaphone', 'palette',
  'settings', 'cart', 'users', 'clipboard', 'scale', 'folder',
];

const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    code: <span className="text-2xl">&#60;/&#62;</span>,
    heart: <span className="text-2xl">&#9829;</span>,
    dollar: <span className="text-2xl">$</span>,
    book: <span className="text-2xl">&#128218;</span>,
    megaphone: <span className="text-2xl">&#128227;</span>,
    palette: <span className="text-2xl">&#127912;</span>,
    settings: <span className="text-2xl">&#9881;</span>,
    cart: <span className="text-2xl">&#128722;</span>,
    users: <span className="text-2xl">&#128101;</span>,
    clipboard: <span className="text-2xl">&#128203;</span>,
    scale: <span className="text-2xl">&#9878;</span>,
    folder: <span className="text-2xl">&#128193;</span>,
  };
  return icons[iconName] || <span className="text-2xl">{iconName[0]}</span>;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: 'code' });

  useEffect(() => {
    adminApi.getCategories().then((res) => {
      const list: any[] = res.data?.data ?? res.data ?? [];
      setCategories(list.map((c: any) => ({
        id: c._id ?? c.id,
        name: c.name ?? '',
        icon: c.icon ?? 'code',
        jobCount: c.job_count ?? 0,
        createdAt: c.created_at ?? c.createdAt ?? '',
      })));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, formData);
        setCategories((prev) => prev.map((c) => c.id === editingCategory.id ? { ...c, ...formData } : c));
      } else {
        const res = await adminApi.createCategory(formData);
        const created = res.data?.data ?? res.data ?? {};
        setCategories((prev) => [...prev, { id: created._id ?? created.id ?? Date.now().toString(), ...formData, jobCount: 0, createdAt: new Date().toISOString() }]);
      }
    } catch {}
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', icon: 'code' });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, icon: category.icon });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await adminApi.deleteCategory(deletingCategory.id);
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
    } catch {}
    setIsDeleteModalOpen(false);
    setDeletingCategory(null);
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Job Categories</h1>
          <p className="text-gray-600 mt-1">Manage job categories for the platform</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', icon: 'code' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium shadow-lg shadow-orange-200"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </motion.div>

      {/* Categories Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {categories.map((category) => (
          <motion.div
            key={category.id}
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center">
                <span className="text-orange-600">
                  {getIconComponent(category.icon)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => {
                    setDeletingCategory(category);
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mt-4">{category.name}</h3>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Briefcase className="w-4 h-4" />
              {category.jobCount} jobs
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Created {new Date(category.createdAt).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Add/Edit Modal */}
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
            className="bg-white rounded-2xl max-w-md w-full"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Technology"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        formData.icon === icon
                          ? 'bg-orange-100 border-2 border-orange-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      {getIconComponent(icon)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingCategory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Delete Category
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete <strong>{deletingCategory.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}