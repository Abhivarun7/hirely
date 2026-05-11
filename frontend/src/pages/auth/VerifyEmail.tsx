import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, RefreshCw, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { authEndpoints } from '@/api/auth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email') || '';

  // ── Verification flow (token in URL) ──────────────────────────────────────
  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    authEndpoints.verifyEmail(token)
      .then(() => {
        setVerified(true);
        setVerifying(false);
        // Redirect to login after 3 s
        setTimeout(() => navigate('/login'), 3000);
      })
      .catch((err: any) => {
        setVerifyError(
          err.response?.data?.message || 'This verification link is invalid or has expired.'
        );
        setVerifying(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resend flow (no token — came from register page) ──────────────────────
  const [isResent, setIsResent] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async () => {
    setResendError(null);
    setIsResending(true);
    try {
      await authEndpoints.resendVerification(email);
      setIsResent(true);
      setTimeout(() => setIsResent(false), 4000);
    } catch (err: any) {
      setResendError(err.response?.data?.message || 'Failed to resend. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // ── Render: token present ─────────────────────────────────────────────────
  if (token) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-6 sm:p-8 lg:p-12 text-center max-w-md mx-auto w-full"
      >
        {verifying && (
          <>
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email…</h2>
            <p className="text-gray-500 text-sm">Please wait a moment.</p>
          </>
        )}

        {verified && (
          <>
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h2>
            <p className="text-gray-600 mb-6">
              Your account is now active. Redirecting you to login…
            </p>
            <Link
              to="/login"
              className="inline-block py-3 px-6 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-lg shadow-orange-200"
            >
              Go to Login
            </Link>
          </>
        )}

        {verifyError && (
          <>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h2>
            <p className="text-gray-600 mb-6">{verifyError}</p>
            <div className="space-y-3">
              <Link
                to={email ? `/verify-email?email=${encodeURIComponent(email)}` : '/verify-email'}
                className="block py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-lg shadow-orange-200 text-center"
              >
                Request a new link
              </Link>
              <Link
                to="/login"
                className="block py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
              >
                Back to login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    );
  }

  // ── Render: no token — resend / check-your-email page ────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-6 sm:p-8 lg:p-12 text-center max-w-md mx-auto w-full"
    >
      <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mail className="w-10 h-10 text-orange-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h2>
      <p className="text-gray-600 mb-2">We sent a verification link to</p>
      <p className="font-semibold text-gray-900 mb-6">{email || 'your email address'}</p>

      <p className="text-sm text-gray-500 mb-8">
        Click the link in the email to activate your account. Check your spam folder if you don't
        see it within a few minutes.
      </p>

      {resendError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{resendError}</p>
        </motion.div>
      )}

      {isResent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">Verification email sent!</p>
        </motion.div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleResend}
          disabled={isResending || !email}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
        >
          {isResending ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</>
          ) : (
            <><RefreshCw className="w-5 h-5" /> Resend verification email</>
          )}
        </button>

        <Link
          to="/login"
          className="block py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
        >
          Back to login
        </Link>
      </div>
    </motion.div>
  );
}
