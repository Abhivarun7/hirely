import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Building2,
  Globe,
  Linkedin,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';
import { companyEndpoints } from '../../api/company';
import { API_BASE_URL } from '../../api/client';

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
const resolveAsset = (url?: string) =>
  !url ? '' : /^https?:\/\//i.test(url) ? url : `${ASSET_BASE_URL}${url}`;

interface ProfileForm {
  name: string;
  description: string;
  industry: string;
  size: string;        // backend: company_size
  website: string;     // backend: website_url
  linkedIn: string;    // backend: linkedin_url
  logo: string;        // backend: logo_url
  verified: boolean;   // backend: approval_status === 'approved'
}

const emptyProfile: ProfileForm = {
  name: '',
  description: '',
  industry: '',
  size: '',
  website: '',
  linkedIn: '',
  logo: '',
  verified: false,
};

// Industry options must match the values stored in Company.industry. Anything
// outside this list won't round-trip through the form.
const industries = [
  '',
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Media',
  'Transportation',
  'Real Estate',
  'Other',
];

// Sizes must match the Company.company_size enum on the backend
// (`'1-10' | '11-50' | '51-200' | '201-500' | '500+'`). The earlier list
// included `501-1000`, `1001-5000`, `5000+` — none of those would save.
const companySizes = ['', '1-10', '11-50', '51-200', '201-500', '500+'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileForm>(emptyProfile);
  const [savedData, setSavedData] = useState<ProfileForm>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    companyEndpoints
      .getProfile()
      .then((res: any) => {
        // Backend wraps every response in { status, data }. The typed client
        // pretends `res.data` is the entity directly, so unwrap defensively.
        const p: any = res.data?.data ?? res.data ?? {};
        const mapped: ProfileForm = {
          name: p.name ?? '',
          description: p.description ?? '',
          industry: p.industry ?? '',
          // Read the backend field names — earlier code looked for `p.size`
          // and `p.website` which don't exist on Company, leaving these
          // blank on every load.
          size: p.company_size ?? '',
          website: p.website_url ?? '',
          linkedIn: p.linkedin_url ?? '',
          logo: p.logo_url ?? '',
          verified: p.approval_status === 'approved',
        };
        setFormData(mapped);
        setSavedData(mapped);
      })
      .catch((err: any) => {
        setLoadError(
          err?.response?.data?.message ?? 'Could not load company profile.'
        );
      });
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      // Map form fields back to backend names. Only send keys the backend
      // schema accepts; otherwise saves silently drop fields.
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        industry: formData.industry || undefined,
        company_size: formData.size || undefined,
        website_url: formData.website || undefined,
        linkedin_url: formData.linkedIn || undefined,
        logo_url: formData.logo || undefined,
      };
      await companyEndpoints.updateProfile(payload as any);
      setSavedData(formData);
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.message ?? 'Could not save changes. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(savedData);
    setSaveError(null);
    setIsEditing(false);
  };

  const logoUrl = resolveAsset(formData.logo);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Profile</h1>
          <p className="text-gray-600 mt-1">Manage your company information</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="primary">
            Edit Profile
          </Button>
        )}
      </motion.div>

      {loadError && (
        <motion.div variants={itemVariants}>
          <Card className="bg-red-50 border-red-100">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{loadError}</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Verification Status */}
      <motion.div variants={itemVariants}>
        <Card className={`${formData.verified ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.verified ? 'bg-green-100' : 'bg-yellow-100'}`}
            >
              {formData.verified ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${formData.verified ? 'text-green-800' : 'text-yellow-800'}`}>
                {formData.verified ? 'Company Verified' : 'Verification Pending'}
              </h3>
              <p className={`text-sm ${formData.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                {formData.verified
                  ? 'Your company has been approved by Hirely. Job listings show a verified badge.'
                  : 'Your company is awaiting admin approval. This usually takes 1–2 business days.'}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Profile Form */}
      <motion.div variants={itemVariants}>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo */}
            <div className="flex flex-col items-center sm:flex-row gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 text-3xl font-bold overflow-hidden border-2 border-dashed border-orange-200">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={formData.name || 'Company logo'}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Building2 className="w-12 h-12 text-orange-300" />
                  )}
                </div>
              </div>
              <div className="flex-1 w-full text-center sm:text-left">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 justify-center sm:justify-start">
                  <ImageIcon className="w-4 h-4 text-orange-500" />
                  Company Logo URL
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Paste a public image URL (square images render best, ~200×200px).
                </p>
                {isEditing && (
                  <div className="mt-3 max-w-md mx-auto sm:mx-0">
                    <Input
                      type="url"
                      name="logo"
                      value={formData.logo}
                      onChange={handleInputChange}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              {isEditing ? (
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter company name"
                  required
                />
              ) : (
                <p className="text-gray-900 py-2">{formData.name || '—'}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              {isEditing ? (
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                  placeholder="Describe your company…"
                />
              ) : (
                <p className="text-gray-900 py-2 whitespace-pre-line">
                  {formData.description || '—'}
                </p>
              )}
            </div>

            {/* Industry & Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                {isEditing ? (
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                  >
                    {industries.map((ind) => (
                      <option key={ind || 'none'} value={ind}>
                        {ind || 'Select an industry'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 py-2">{formData.industry || '—'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                {isEditing ? (
                  <select
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                  >
                    {companySizes.map((size) => (
                      <option key={size || 'none'} value={size}>
                        {size ? `${size} employees` : 'Select a size'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 py-2">
                    {formData.size ? `${formData.size} employees` : '—'}
                  </p>
                )}
              </div>
            </div>

            {/* Website & LinkedIn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Website
                </label>
                {isEditing ? (
                  <Input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                  />
                ) : formData.website ? (
                  <a
                    href={formData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 py-2 inline-block break-all"
                  >
                    {formData.website}
                  </a>
                ) : (
                  <p className="text-gray-400 py-2">—</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Linkedin className="w-4 h-4 inline mr-1" />
                  LinkedIn
                </label>
                {isEditing ? (
                  <Input
                    type="url"
                    name="linkedIn"
                    value={formData.linkedIn}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/company/…"
                  />
                ) : formData.linkedIn ? (
                  <a
                    href={formData.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 py-2 inline-block break-all"
                  >
                    {formData.linkedIn}
                  </a>
                ) : (
                  <p className="text-gray-400 py-2">—</p>
                )}
              </div>
            </div>

            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            )}
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
