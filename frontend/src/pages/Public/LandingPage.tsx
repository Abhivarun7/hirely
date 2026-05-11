import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Briefcase, Building2, Users, TrendingUp, MapPin, ArrowRight, Heart, Share2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const floatingIcons = [
  { Icon: Briefcase, delay: 0, x: '8%', y: '15%' },
  { Icon: Building2, delay: 0.7, x: '85%', y: '12%' },
  { Icon: Users, delay: 1.4, x: '15%', y: '75%' },
  { Icon: MapPin, delay: 2.1, x: '80%', y: '80%' },
  { Icon: TrendingUp, delay: 2.8, x: '60%', y: '8%' },
  { Icon: Heart, delay: 3.5, x: '40%', y: '85%' },
];

const features = [
  {
    icon: Briefcase,
    title: 'Smart Matching',
    description: 'Our AI-powered algorithm matches you with jobs that fit your skills and preferences.',
  },
  {
    icon: ArrowRight,
    title: 'Easy Apply',
    description: 'Apply to multiple jobs with a single click. Your profile does the heavy lifting.',
  },
  {
    icon: TrendingUp,
    title: 'Real-time Updates',
    description: 'Get instant notifications when your application status changes.',
  },
];

const stats = [
  { value: '10,000+', label: 'Jobs' },
  { value: '5,000+', label: 'Companies' },
  { value: '100,000+', label: 'Applications' },
];

const footerLinks = {
  jobSeekers: [
    { label: 'Browse Jobs', href: '/jobs' },
    { label: 'Companies', href: '/companies' },
    { label: 'Salary Guide', href: '/salary' },
  ],
  employers: [
    { label: 'Post a Job', href: '/post-job' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Recruiting Solutions', href: '/solutions' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

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
    transition: { duration: 0.5 },
  },
};

const floatAnimation = {
  y: [-15, 15, -15],
  rotate: [0, 8, -8, 0],
};

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const { user, isAuthenticated } = useAuthStore();

  // Determine user role
  const isSeeker = isAuthenticated && user?.role === 'job_seeker';
  const isCompanyUser = isAuthenticated && ['company_owner', 'hr_manager', 'recruiter', 'viewer'].includes(user?.role ?? '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to job search with query params
    window.location.href = `/jobs?q=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(location)}`;
  };

  // Dynamic paths based on auth state
  const getDashboardPath = () => {
    if (isSeeker) return '/seeker/dashboard';
    if (isCompanyUser) return '/company/dashboard';
    return '/';
  };

  const getJobsPath = () => {
    if (isSeeker) return '/seeker/jobs';
    return '/jobs';
  };

  const getPostJobPath = () => {
    if (isCompanyUser) return '/company/jobs/create';
    return '/login';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Hirely</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to={getJobsPath()} className="text-gray-600 hover:text-orange-600 font-medium transition-colors">
                Find Jobs
              </Link>
              <Link to="/companies" className="text-gray-600 hover:text-orange-600 font-medium transition-colors">
                Companies
              </Link>
              <Link to={getPostJobPath()} className="text-gray-600 hover:text-orange-600 font-medium transition-colors">
                For Employers
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link to={getDashboardPath()}>
                  <Button>
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">dashboard</span>
                      Dashboard
                    </span>
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link to="/register">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400 min-h-[600px] flex items-center">
        {/* Animated Floating Icons */}
        <div className="absolute inset-0 pointer-events-none">
          {floatingIcons.map(({ Icon, delay, x, y }, index) => (
            <motion.div
              key={index}
              className="absolute text-white/15"
              style={{ left: x, top: y }}
              animate={floatAnimation}
              transition={{
                duration: 7,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Icon className="w-20 h-20 lg:w-28 lg:h-28" />
            </motion.div>
          ))}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Find Your Dream Job
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-xl text-white/90 mb-10 max-w-2xl mx-auto"
            >
              Discover opportunities that match your skills and aspirations. Your next career move is just a click away.
            </motion.p>

            {/* Search Bar */}
            <motion.form
              variants={itemVariants}
              onSubmit={handleSearch}
              className="max-w-3xl mx-auto bg-white rounded-2xl p-2 shadow-2xl"
            >
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Job title or keyword"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-0 focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="City, state, or remote"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-0 focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 placeholder-gray-400"
                  />
                </div>
                <Button type="submit" className="px-8 py-4">
                  Search
                </Button>
              </div>
            </motion.form>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
            >
              <Link to={getJobsPath()}>
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg">
                  Find Jobs
                </Button>
              </Link>
              <Link to={getPostJobPath()}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10"
                >
                  Post a Job
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-orange-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 text-lg">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Hirely?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Everything you need to land your next opportunity
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl hover:shadow-orange-100/50 transition-shadow duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-orange-600 to-orange-500">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Take the Next Step?
          </h2>
          <p className="text-white/90 text-lg mb-8">
            Join thousands of job seekers who have found their perfect match on Hirely.
          </p>
          {isAuthenticated ? (
            <Link to={getDashboardPath()}>
              <Button
                size="lg"
                className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg px-10"
              >
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button
                size="lg"
                className="bg-white text-orange-600 hover:bg-orange-50 shadow-lg px-10"
              >
                Create Free Account
              </Button>
            </Link>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Hirely</span>
              </Link>
              <p className="text-sm leading-relaxed">
                Connecting talent with opportunities. Your journey to career success starts here.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-3">
                {footerLinks.jobSeekers.map((link, index) => (
                  <li key={index}>
                    <Link to={link.href} className="hover:text-orange-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">For Employers</h4>
              <ul className="space-y-3">
                {footerLinks.employers.map((link, index) => (
                  <li key={index}>
                    <Link to={link.href} className="hover:text-orange-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link, index) => (
                  <li key={index}>
                    <Link to={link.href} className="hover:text-orange-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              2026 Hirely. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <button className="hover:text-orange-400 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="hover:text-orange-400 transition-colors">
                <Bookmark className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}