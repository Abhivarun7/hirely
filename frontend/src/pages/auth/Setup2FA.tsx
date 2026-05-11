import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Smartphone, Copy, CheckCircle, AlertCircle, Key } from 'lucide-react';
import { authEndpoints } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const setup2FASchema = z.object({
  code: z.string().length(6, 'Please enter the 6-digit code').regex(/^\d+$/, 'Code must contain only numbers'),
});

type Setup2FAForm = z.infer<typeof setup2FASchema>;


export default function Setup2FA() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [secretReady, setSecretReady] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const requestSecret = async (password: string) => {
    setSetupError(null);
    setSetupLoading(true);
    try {
      const res = await authEndpoints.setupTOTP(password);
      const d = res.data?.data ?? res.data ?? {};
      setQrCodeUrl(d.qr_code_url ?? d.qrCodeUrl ?? d.qr_url ?? '');
      setSecretKey(d.secret ?? d.manual_entry_key ?? '');
      setBackupCodes(d.backup_codes ?? d.backupCodes ?? []);
      setSecretReady(true);
    } catch (err: any) {
      setSetupError(
        err?.response?.data?.message ??
          'Could not start 2FA setup. Check your password and try again.'
      );
    } finally {
      setSetupLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Setup2FAForm>({
    resolver: zodResolver(setup2FASchema),
  });

  const onSubmit = async (data: Setup2FAForm) => {
    setError(null);
    try {
      await authEndpoints.verifyTOTP(data.code);
      setIsVerified(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
    }
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFinish = () => {
    const role = user?.role ?? '';
    if (role === 'admin' || role === 'super_admin' || role === 'moderator') {
      navigate('/admin/dashboard');
    } else if (role === 'company') {
      navigate('/company/dashboard');
    } else {
      navigate('/seeker/dashboard');
    }
  };

  if (!secretReady) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-6 sm:p-8 lg:p-12 max-w-md mx-auto w-full"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm it's you</h2>
          <p className="text-gray-600">
            Enter your current password to start setting up two-factor authentication.
          </p>
        </div>

        {setupError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{setupError}</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (setupPassword) requestSecret(setupPassword);
          }}
          className="space-y-5"
        >
          <input
            type="password"
            autoComplete="current-password"
            value={setupPassword}
            onChange={(e) => setSetupPassword(e.target.value)}
            placeholder="Current password"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
          />
          <button
            type="submit"
            disabled={!setupPassword || setupLoading}
            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
          >
            {setupLoading ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </motion.div>
    );
  }

  if (isVerified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-6 sm:p-8 lg:p-12 text-center max-w-md mx-auto w-full"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">2FA Enabled!</h2>
        <p className="text-gray-600 mb-6">
          Two-factor authentication has been successfully set up on your account.
        </p>

        {!showBackupCodes ? (
          <button
            onClick={() => setShowBackupCodes(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-50 text-orange-700 font-semibold rounded-xl hover:bg-orange-100 transition-all mb-4"
          >
            <Key className="w-5 h-5" />
            View backup codes
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gray-50 rounded-xl"
          >
            <p className="text-sm text-gray-600 mb-3 text-left">
              Save these backup codes in a secure place. You can use them to access your account if you lose your phone.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <button
                  key={index}
                  onClick={() => handleCopyCode(code, index)}
                  className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono hover:bg-gray-50 transition-all"
                >
                  <span>{code}</span>
                  {copiedIndex === index ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <button
          onClick={handleFinish}
          className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-lg shadow-orange-200"
        >
          Go to Dashboard
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-6 sm:p-8 lg:p-12 max-w-md mx-auto w-full"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Set up 2FA</h2>
        <p className="text-gray-600">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </p>
      </div>

      <div className="flex flex-col items-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-white border-2 border-orange-100 rounded-2xl shadow-lg"
        >
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="QR Code for 2FA setup"
              className="w-48 h-48"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-xl">
              <Smartphone className="w-12 h-12 text-gray-400 animate-pulse" />
            </div>
          )}
        </motion.div>
        {secretKey && (
          <p className="mt-4 text-sm text-gray-500">
            Or enter this code manually: <span className="font-mono font-semibold text-gray-700">{secretKey}</span>
          </p>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1.5 text-center">
            Enter the 6-digit code from your app
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
            {...register('code')}
          />
          {errors.code && (
            <p className="mt-1.5 text-sm text-red-600 text-center">{errors.code.message}</p>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={isSubmitting}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
        >
          {isSubmitting ? 'Verifying...' : 'Verify and enable'}
        </motion.button>
      </form>
    </motion.div>
  );
}
