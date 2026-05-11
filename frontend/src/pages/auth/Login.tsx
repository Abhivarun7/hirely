import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { authEndpoints } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

interface FloatingChip {
  icon: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  position: { top?: string; bottom?: string; left?: string; right?: string };
  rotate: string;
}

const floatingChips: FloatingChip[] = [
  { icon: 'work', size: 'lg', position: { top: '8%', left: '8%' }, rotate: '12deg' },
  { icon: 'corporate_fare', size: 'xl', position: { top: '24%', right: '10%' }, rotate: '-12deg' },
  { icon: 'school', size: 'md', position: { bottom: '32%', left: '14%' }, rotate: '6deg' },
  { icon: 'location_on', size: 'sm', position: { top: '60%', right: '16%' }, rotate: '-6deg' },
];

const sizeMap = {
  sm: 'w-12 h-12 rounded-lg text-xl',
  md: 'w-14 h-14 rounded-xl text-2xl',
  lg: 'w-16 h-16 rounded-2xl text-3xl',
  xl: 'w-20 h-20 rounded-3xl text-4xl',
};

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setAccessToken } = useAuthStore();
  const returnTo = (location.state as { from?: string } | null)?.from ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: true },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const normalized = { ...data, email: data.email.trim().toLowerCase() };
      const response = await authEndpoints.login(normalized);
      const payload = (response.data as any).data ?? response.data;
      const user = payload.user;
      setUser({ id: user.id ?? user._id, email: user.email, role: user.role });
      setAccessToken(payload.access_token ?? '');
      if (returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }
      const role = user.role;
      if (role === 'super_admin' || role === 'moderator' || role === 'support_admin' || role === 'analytics_admin') {
        navigate('/admin/dashboard');
      } else if (role === 'company_owner' || role === 'hr_manager' || role === 'recruiter' || role === 'viewer') {
        navigate('/company/dashboard');
      } else if (role === 'employment_official') {
        navigate('/official/dashboard');
      } else {
        navigate('/seeker/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ??
          err.response?.data?.data?.message ??
          'Invalid email or password. Please try again.'
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch"
    >
      {/* Left Hero */}
      <section className="hidden lg:flex relative glass-primary-deep rounded-3xl overflow-hidden order-2 lg:order-1 flex-col justify-between p-10 min-h-[640px]">
        {/* Noise grain */}
        <div className="noise-overlay" />

        {/* Floating 3-D icon chips */}
        <div className="absolute inset-0 pointer-events-none">
          {floatingChips.map((chip, i) => (
            <motion.div
              key={i}
              className={`floating-icon-3d absolute flex items-center justify-center text-white ${sizeMap[chip.size]}`}
              style={{ ...chip.position, transform: `rotate(${chip.rotate})` }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [-12, 12, -12], opacity: 1 }}
              transition={{ duration: 7, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>
                {chip.icon}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Top corner glow */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        {/* Headline block */}
        <div className="relative z-10 space-y-5 max-w-md">
          <motion.span
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/20 border border-white/40 backdrop-blur-xl shadow-lg"
          >
            <span className="text-xs font-bold tracking-widest uppercase text-white">Welcome back</span>
          </motion.span>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl xl:text-5xl font-black leading-[1.05] tracking-tight text-white text-glow"
          >
            Your next career<br />chapter is one<br />sign-in away.
          </motion.h1>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-base text-white/90 max-w-sm leading-relaxed"
          >
            Join thousands of professionals using AI-driven insights to land their dream roles at top-tier companies.
          </motion.p>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-4 pt-8 border-t border-white/20"
        >
          <Stat label="Active jobs" value="12k+" />
          <Stat label="Top Companies" value="450+" />
          <Stat className="hidden md:block" label="Daily Matches" value="1.2k" />
        </motion.div>
      </section>

      {/* Right Form */}
      <section className="flex flex-col justify-center order-1 lg:order-2">
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card-extreme rounded-3xl p-8 md:p-12"
        >
          <div className="mb-8">
            <motion.h2
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl md:text-4xl font-bold text-[#1b1b1e] mb-2"
            >
              Sign in
            </motion.h2>
            <motion.p
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-base text-[#5d5e60]"
            >
              Enter your credentials to access your talent dashboard.
            </motion.p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <motion.div
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <label htmlFor="email" className="block text-sm font-semibold text-[#1b1b1e]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8e7164]" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="input-etched w-full pl-12 pr-4 py-4 rounded-xl text-[#1b1b1e] placeholder:text-[#8e7164]"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-semibold text-[#1b1b1e]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-[#a04100] hover:underline transition-all"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8e7164]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-etched w-full pl-12 pr-12 py-4 rounded-xl text-[#1b1b1e] placeholder:text-[#8e7164]"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#8e7164] hover:text-[#a04100] hover:bg-white/40 transition-all"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </motion.div>

            {/* Remember me */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex items-center gap-2"
            >
              <input
                id="remember"
                type="checkbox"
                className="w-5 h-5 rounded-md border-white/60 bg-white/60 text-[#ff6b00] focus:ring-[#ff6b00]/40 cursor-pointer"
                {...register('remember')}
              />
              <label htmlFor="remember" className="text-sm text-[#5d5e60] cursor-pointer select-none">
                Keep me signed in for 30 days
              </label>
            </motion.div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full py-4 bg-[#ff6b00] text-white font-bold text-base rounded-xl neon-glow transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </motion.button>
          </form>

          {/* Sign up footer */}
          <motion.p
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center text-sm text-[#5d5e60]"
          >
            New to Hirely?{' '}
            <Link to="/register" className="text-[#a04100] font-semibold hover:underline">
              Sign up for free
            </Link>
          </motion.p>
        </motion.div>
      </section>
    </motion.div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div
      className={`bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-md shadow-lg ${className ?? ''}`}
    >
      <p className="text-[10px] text-white/70 uppercase tracking-widest mb-1 font-semibold">{label}</p>
      <p className="text-2xl xl:text-3xl text-white font-bold">{value}</p>
    </div>
  );
}
