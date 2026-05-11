import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/context/ToastContext';
import AuthLayout from '@/components/layout/AuthLayout';
import SeekerLayout from '@/components/layout/SeekerLayout';
import CompanyLayout from '@/components/layout/CompanyLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import OfficialLayout from '@/components/layout/OfficialLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import AcceptInvite from '@/pages/auth/AcceptInvite';
import Setup2FA from '@/pages/auth/Setup2FA';
import LandingPage from '@/pages/Public/LandingPage';
import PublicJobSearch from '@/pages/Public/PublicJobSearch';
import PublicJobDetail from '@/pages/Public/PublicJobDetail';
import { Dashboard, Profile, JobSearch, JobDetail, Applications, SavedJobs, Companies as SeekerCompanies, CompanyDetail as SeekerCompanyDetail } from '@/pages/seeker';
import { Dashboard as CompanyDashboard, Profile as CompanyProfile, Branches, Team, Jobs, JobCreate, JobEdit, Applicants, ApplicantDetail, Insights as CompanyInsights, InvitesSent as CompanyInvitesSent } from '@/pages/company';
import Support from '@/pages/Support';
import { Dashboard as AdminDashboard, Companies, Jobs as AdminJobs, Categories, Skills, Tickets, Analytics, AuditLogs, Admins, Roles as AdminRoles, Settings, AIInsights, Officials as AdminOfficials } from '@/pages/admin';
import AdminLogin from '@/pages/admin/Login';
import { Dashboard as OfficialDashboard, NearbyJobs as OfficialNearbyJobs, Candidates as OfficialCandidates, MyPushes as OfficialMyPushes, LocalHires as OfficialLocalHires, Profile as OfficialProfile } from '@/pages/official';

function App() {
  return (
    <ToastProvider>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/jobs" element={<PublicJobSearch />} />
      <Route path="/jobs/:id" element={<PublicJobDetail />} />

      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/setup-2fa" element={<Setup2FA />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Route>

      {/* Seeker Portal Routes — requires job_seeker role */}
      <Route element={<ProtectedRoute allowedRoles={['job_seeker']} />}>
        <Route element={<SeekerLayout />}>
          <Route path="/seeker/dashboard" element={<Dashboard />} />
          <Route path="/seeker/jobs" element={<JobSearch />} />
          <Route path="/seeker/jobs/:id" element={<JobDetail />} />
          <Route path="/seeker/companies" element={<SeekerCompanies />} />
          <Route path="/seeker/companies/:id" element={<SeekerCompanyDetail />} />
          <Route path="/seeker/applications" element={<Applications />} />
          <Route path="/seeker/saved" element={<SavedJobs />} />
          <Route path="/seeker/profile" element={<Profile />} />
          <Route path="/seeker/support" element={<Support />} />
        </Route>
      </Route>

      {/* Company Portal Routes — requires a company role */}
      <Route element={<ProtectedRoute allowedRoles={['company_owner', 'hr_manager', 'recruiter', 'viewer']} />}>
        <Route element={<CompanyLayout />}>
          <Route path="/company/dashboard" element={<CompanyDashboard />} />
          <Route path="/company/insights" element={<CompanyInsights />} />
          <Route path="/company/insights/invites" element={<CompanyInvitesSent />} />
          <Route path="/company/profile" element={<CompanyProfile />} />
          <Route path="/company/branches" element={<Branches />} />
          <Route path="/company/team" element={<Team />} />
          <Route path="/company/jobs" element={<Jobs />} />
          <Route path="/company/jobs/create" element={<JobCreate />} />
          <Route path="/company/jobs/:id/edit" element={<JobEdit />} />
          <Route path="/company/jobs/:id/applicants" element={<Applicants />} />
          <Route path="/company/applicants" element={<Applicants />} />
          <Route path="/company/applicants/:id" element={<ApplicantDetail />} />
          <Route path="/company/support" element={<Support />} />
        </Route>
      </Route>

      {/* Official Portal Routes — requires employment_official role */}
      <Route element={<ProtectedRoute allowedRoles={['employment_official']} />}>
        <Route element={<OfficialLayout />}>
          <Route path="/official/dashboard" element={<OfficialDashboard />} />
          <Route path="/official/jobs" element={<OfficialNearbyJobs />} />
          <Route path="/official/candidates" element={<OfficialCandidates />} />
          <Route path="/official/pushes" element={<OfficialMyPushes />} />
          <Route path="/official/hires" element={<OfficialLocalHires />} />
          <Route path="/official/profile" element={<OfficialProfile />} />
        </Route>
      </Route>

      {/* Admin Portal Routes — requires an admin role */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin', 'moderator', 'support_admin', 'analytics_admin', 'admin']} loginPath="/admin/login" />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/companies" element={<Companies />} />
          <Route path="/admin/jobs" element={<AdminJobs />} />
          <Route path="/admin/ai-insights" element={<AIInsights />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/skills" element={<Skills />} />
          <Route path="/admin/tickets" element={<Tickets />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/admins" element={<Admins />} />
          <Route path="/admin/roles" element={<AdminRoles />} />
          <Route path="/admin/officials" element={<AdminOfficials />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<div className="p-8 text-center">Page not found</div>} />
    </Routes>
    </ToastProvider>
  );
}

export default App;
