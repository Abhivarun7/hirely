import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { authEndpoints } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

/**
 * Lands the recipient of a team invite email. The link looks like
 *   ${FRONTEND_URL}/accept-invite?token=<jwt>
 * and is generated in `backend/src/modules/shared/email.service.ts`.
 *
 * Flow:
 *   1. Read token from query string. Missing/empty → render an error state.
 *   2. Ask the user to set a password (the placeholder User created by the
 *      inviter has password_hash='PENDING_INVITE' — this overwrites it).
 *   3. POST /auth/accept-invite. The backend marks the invite JTI consumed,
 *      activates the User, and returns access + refresh tokens.
 *   4. Persist the access token in the auth store and route into the company
 *      dashboard.
 */
export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();

  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Surface a clear error immediately when the link is missing the token.
  useEffect(() => {
    if (!token) setError('This invite link is missing a token. Ask the sender to resend.');
  }, [token]);

  function validate(): string | null {
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setSubmitting(true);
    try {
      const res = await authEndpoints.acceptInvite(token, password);
      const payload = (res.data as any).data ?? res.data;
      const u = payload.user;
      setUser({ id: u.id ?? u._id, email: u.email, role: u.role });
      setAccessToken(payload.access_token ?? '');
      setAccepted(true);
      // Brief success state before routing — feels more deliberate than a
      // hard redirect that flashes for a frame.
      setTimeout(() => navigate('/company/dashboard'), 1200);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'Could not accept this invite. The link may have expired or been used already.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-8 lg:p-12 text-center max-w-md mx-auto w-full"
      >
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the team!</h2>
        <p className="text-gray-600">Taking you to your dashboard…</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 overflow-hidden max-w-md mx-auto w-full"
    >
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 px-8 py-8 text-white text-center">
        <Building2 className="w-10 h-10 mx-auto mb-2" />
        <h1 className="text-2xl font-bold">Join your team</h1>
        <p className="text-orange-100 text-sm mt-1">Set a password to finish creating your account</p>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!token || submitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat password"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={!token || submitting}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!token || submitting}
          className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {submitting ? 'Creating account…' : 'Accept invitation'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-600 hover:text-orange-700 font-semibold">
            Sign in
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
