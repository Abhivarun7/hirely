import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Mail,
  MoreVertical,
  Crown,
  User,
  Shield,
  X,
  Clock,
  UserMinus,
} from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';
import { companyEndpoints } from '../../api/company';

// Mirror the backend User.role enum for invitable team members. The earlier
// 'admin' label was rejected by the backend's zod schema (which expects
// hr_manager/recruiter/viewer) and by the Mongoose enum on User.role, so
// invites silently 400'd before this fix.
type CompanyRole = 'company_owner' | 'hr_manager' | 'recruiter' | 'viewer';
type InvitableRole = Exclude<CompanyRole, 'company_owner'>;

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: CompanyRole;
  status: 'active' | 'pending';
  avatar?: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: InvitableRole;
  sentAt: string;
}


const getRoleConfig = (role: CompanyRole) => {
  switch (role) {
    case 'company_owner':
      return { label: 'Owner', color: 'text-amber-700 bg-amber-50', icon: Crown };
    case 'hr_manager':
      return { label: 'HR Manager', color: 'text-purple-600 bg-purple-50', icon: Crown };
    case 'recruiter':
      return { label: 'Recruiter', color: 'text-blue-600 bg-blue-50', icon: User };
    case 'viewer':
      return { label: 'Viewer', color: 'text-gray-600 bg-gray-100', icon: Shield };
    default:
      return { label: role, color: 'text-gray-600 bg-gray-100', icon: User };
  }
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
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export default function Team() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ email: string; role: InvitableRole }>({
    email: '',
    role: 'viewer',
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    companyEndpoints.getTeam().then((res: any) => {
      const members: any[] = res.data?.data ?? res.data ?? [];
      const active = members.filter((m: any) => m.is_active);
      const pending = members.filter((m: any) => !m.is_active);
      setTeamMembers(active.map((m: any) => ({
        id: m._id ?? m.id,
        email: m.email,
        name: m.first_name ? `${m.first_name} ${m.last_name}` : m.email,
        role: m.role as CompanyRole,
        status: 'active',
        avatar: m.email.substring(0, 2).toUpperCase(),
      })));
      setPendingInvitations(pending.map((m: any) => ({
        id: m._id ?? m.id,
        email: m.email,
        role: m.role as InvitableRole,
        sentAt: m.createdAt ?? new Date().toISOString(),
      })));
    }).catch(() => {});
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviting(true);
    try {
      const res: any = await companyEndpoints.inviteMember({ email: inviteForm.email, role: inviteForm.role });
      // Backend returns the placeholder User; use its real id so subsequent
      // "Revoke" actions hit DELETE /company/team/:memberId with the right id.
      const created: any = res.data?.data ?? res.data ?? {};
      const newInvite: PendingInvitation = {
        id: (created._id ?? created.id ?? '').toString() || `pending-${Date.now()}`,
        email: inviteForm.email,
        role: inviteForm.role,
        sentAt: created.createdAt ?? new Date().toISOString(),
      };
      setPendingInvitations((prev) => [...prev, newInvite]);
      setInviteForm({ email: '', role: 'viewer' });
      setIsInviteModalOpen(false);
    } catch (err: any) {
      setInviteError(
        err?.response?.data?.message ?? 'Could not send invite. Try a different email.'
      );
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: CompanyRole) => {
    if (newRole === 'company_owner') return; // not an invitable/changeable role
    try {
      await companyEndpoints.updateMemberRole(id, newRole as InvitableRole);
      setTeamMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
    } catch {
      // revert on error handled by not updating state
    }
    setActiveMenu(null);
  };

  const handleRemoveMember = async (id: string) => {
    try {
      await companyEndpoints.removeMember(id);
      setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    } catch {
      // keep member in list on error
    }
    setActiveMenu(null);
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      await companyEndpoints.removeMember(id);
    } catch {
      // ignore
    }
    setPendingInvitations((prev) => prev.filter((inv) => inv.id !== id));
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600 mt-1">Manage your team members and invitations</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </motion.div>

      {/* Team Members List */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Team Members ({teamMembers.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {teamMembers.map((member) => {
              const roleConfig = getRoleConfig(member.role);
              const RoleIcon = roleConfig.icon;
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-bold">
                      {member.avatar || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">{member.name}</h3>
                        {member.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${roleConfig.color}`}>
                        <RoleIcon className="w-3.5 h-3.5" />
                        {roleConfig.label}
                      </span>
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeMenu === member.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Change Role</div>
                              {member.role === 'company_owner' ? (
                                <p className="px-3 py-2 text-xs text-gray-400 italic">
                                  Owner role cannot be changed
                                </p>
                              ) : (
                                (['hr_manager', 'recruiter', 'viewer'] as const).map((role) => (
                                  <button
                                    key={role}
                                    onClick={() => handleRoleChange(member.id, role)}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${member.role === role ? 'text-orange-600' : 'text-gray-700'}`}
                                  >
                                    {role === 'hr_manager' && <Crown className="w-4 h-4" />}
                                    {role === 'recruiter' && <User className="w-4 h-4" />}
                                    {role === 'viewer' && <Shield className="w-4 h-4" />}
                                    {getRoleConfig(role).label}
                                  </button>
                                ))
                              )}
                              <div className="border-t border-gray-100 mt-2 pt-2">
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <UserMinus className="w-4 h-4" />
                                  Remove Member
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-orange-500" />
                Pending Invitations ({pendingInvitations.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingInvitations.map((invitation) => {
                const roleConfig = getRoleConfig(invitation.role);
                const RoleIcon = roleConfig.icon;
                return (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{invitation.email}</p>
                        <p className="text-sm text-gray-500">
                          Sent {new Date(invitation.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${roleConfig.color}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {roleConfig.label}
                        </span>
                        <button
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsInviteModalOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
              <button onClick={() => setIsInviteModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="colleague@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as InvitableRole })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                >
                  <option value="hr_manager">HR Manager — manage company, jobs, and team scoping</option>
                  <option value="recruiter">Recruiter — manage jobs and applicants</option>
                  <option value="viewer">Viewer — read-only access</option>
                </select>
              </div>

              {inviteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {inviteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={inviting}>
                  <Mail className="w-4 h-4 mr-2" />
                  {inviting ? 'Sending…' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
