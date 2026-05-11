import {
  Company,
  User,
  Job,
  JobCategory,
  SkillTag,
  SupportTicket,
  TicketMessage,
  AuditLog,
  SystemConfig,
  Application,
  Role,
} from '../../models/index.js';
import { ApprovalStatus, JobStatus, UserRole } from '../../types/index.js';
import { Queue } from 'bullmq';
import { redis } from '../../config/redis.js';
import { isValidPermission, type SystemRoleName } from '../../constants/permissions.js';
import { invalidatePermissionCache } from '../../middleware/requirePermission.js';
import { emailService } from '../shared/email.service.js';
import { emitTicketMessage, emitTicketStatus } from '../../realtime/socket.js';
import { enrichMessageSender, enrichMessageSenders } from '../shared/senderName.js';
import { notificationService } from '../shared/notification.service.js';

const SYSTEM_ROLE_NAMES = new Set<SystemRoleName>([
  'super_admin',
  'moderator',
  'support_admin',
  'analytics_admin',
]);

/**
 * Map a Role record to the User.role enum used for portal routing. System
 * roles map by name; custom roles default to 'support_admin' so the holder
 * still has access to /admin/*. Permissions are what actually gate behavior.
 */
function deriveEnumRole(roleName: string): UserRole {
  return SYSTEM_ROLE_NAMES.has(roleName as SystemRoleName)
    ? (roleName as UserRole)
    : 'support_admin';
}

function sanitizeExtraPermissions(perms: string[] | undefined): string[] | undefined {
  if (!perms) return undefined;
  const cleaned = Array.from(new Set(perms.map((p) => p.trim()).filter(Boolean)));
  const invalid = cleaned.filter((p) => !isValidPermission(p));
  if (invalid.length > 0) {
    throw new Error(`Unknown permissions: ${invalid.join(', ')}`);
  }
  return cleaned;
}

const eventQueue = new Queue('events', { connection: redis });

export class AdminService {
  // ============ Company Management ============

  async getCompanies(filters: {
    page?: number;
    limit?: number;
    status?: ApprovalStatus;
    search?: string;
  }): Promise<{ companies: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.status) {
      query.approval_status = filters.status;
    }
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { slug: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [companies, total] = await Promise.all([
      Company.find(query)
        .select('-registration_docs')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query),
    ]);

    return {
      companies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getCompanyById(companyId: string): Promise<unknown> {
    return Company.findById(companyId).select('-registration_docs').lean();
  }

  async getCompanyJobs(companyId: string, page = 1, limit = 20): Promise<{ jobs: unknown[]; pagination: unknown }> {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find({ company_id: companyId })
        .populate('category_id', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments({ company_id: companyId }),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getCompanyTeam(companyId: string): Promise<unknown[]> {
    return User.find({ company_id: companyId })
      .select('-password_hash -totp_secret')
      .lean();
  }

  async approveCompany(companyId: string, adminId: string, notes?: string): Promise<unknown> {
    const company = await Company.findById(companyId);
    if (!company) throw new Error('Company not found');

    const oldStatus = company.approval_status;
    company.approval_status = 'approved';
    company.approved_by = adminId as unknown as typeof company.approved_by;
    company.approved_at = new Date();
    await company.save();

    await this.createAuditLog(
      adminId,
      'super_admin',
      'company.approved',
      'Company',
      companyId,
      { approval_status: oldStatus },
      { approval_status: 'approved', notes }
    );

    // Activate all company users
    await User.updateMany(
      { company_id: companyId },
      { $set: { is_active: true } }
    );

    return company;
  }

  async rejectCompany(companyId: string, adminId: string, reason: string): Promise<unknown> {
    const company = await Company.findById(companyId);
    if (!company) throw new Error('Company not found');

    const oldStatus = company.approval_status;
    company.approval_status = 'rejected';
    company.rejection_reason = reason;
    await company.save();

    await this.createAuditLog(
      adminId,
      'super_admin',
      'company.rejected',
      'Company',
      companyId,
      { approval_status: oldStatus },
      { approval_status: 'rejected', reason }
    );

    return company;
  }

  async suspendCompany(companyId: string, adminId: string, reason?: string): Promise<unknown> {
    const company = await Company.findById(companyId);
    if (!company) throw new Error('Company not found');

    const oldStatus = company.approval_status;
    company.approval_status = 'suspended';
    await company.save();

    await this.createAuditLog(
      adminId,
      'super_admin',
      'company.suspended',
      'Company',
      companyId,
      { approval_status: oldStatus },
      { approval_status: 'suspended', reason }
    );

    // Deactivate all company users but don't delete
    await User.updateMany(
      { company_id: companyId },
      { $set: { is_active: false } }
    );

    // Close all active jobs
    await Job.updateMany(
      { company_id: companyId, status: 'active' },
      { $set: { status: 'closed' } }
    );

    return company;
  }

  async banCompany(companyId: string, adminId: string, reason: string): Promise<unknown> {
    const company = await Company.findById(companyId);
    if (!company) throw new Error('Company not found');

    const oldStatus = company.approval_status;
    company.approval_status = 'banned';
    await company.save();

    await this.createAuditLog(
      adminId,
      'super_admin',
      'company.banned',
      'Company',
      companyId,
      { approval_status: oldStatus },
      { approval_status: 'banned', reason }
    );

    // Deactivate all company users and revoke refresh tokens
    await User.updateMany(
      { company_id: companyId },
      { $set: { is_active: false, is_banned: true } }
    );

    // Close all jobs
    await Job.updateMany(
      { company_id: companyId },
      { $set: { status: 'removed' } }
    );

    return company;
  }

  // ============ User Management ============

  async getUsers(filters: {
    page?: number;
    limit?: number;
    role?: string;
    is_banned?: boolean;
    search?: string;
  }): Promise<{ users: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.role) {
      query.role = filters.role;
    }
    if (filters.is_banned !== undefined) {
      query.is_banned = filters.is_banned;
    }
    if (filters.search) {
      query.$or = [
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password_hash -totp_secret')
        .populate('company_id', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getUserById(userId: string): Promise<unknown> {
    return User.findById(userId)
      .select('-password_hash -totp_secret')
      .populate('company_id', 'name slug')
      .lean();
  }

  async getUserApplications(userId: string, page = 1, limit = 20): Promise<{ applications: unknown[]; pagination: unknown }> {
    const user = await User.findById(userId);
    if (!user || !user.seeker_profile_id) throw new Error('User not found');

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      Application.find({ seeker_id: user.seeker_profile_id })
        .populate('job_id', 'title locations')
        .sort({ applied_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments({ seeker_id: user.seeker_profile_id }),
    ]);

    return {
      applications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async suspendUser(userId: string, adminId: string, reason?: string): Promise<unknown> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const wasActive = user.is_active;
    user.is_active = false;
    await user.save();

    await this.createAuditLog(
      adminId,
      'super_admin',
      'user.suspended',
      'User',
      userId,
      { is_active: wasActive },
      { is_active: false, reason }
    );

    return user;
  }

  async banUser(userId: string, adminId: string, reason: string): Promise<unknown> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.is_active = false;
    user.is_banned = true;
    user.ban_reason = reason;
    await user.save();

    await this.createAuditLog(
      adminId,
      'super_admin',
      'user.banned',
      'User',
      userId,
      { is_banned: false },
      { is_banned: true, reason }
    );

    return user;
  }

  // ============ Content Moderation ============

  async getJobs(filters: {
    page?: number;
    limit?: number;
    status?: JobStatus;
    company_id?: string;
    search?: string;
  }): Promise<{ jobs: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.company_id) {
      query.company_id = filters.company_id;
    }
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('company_id', 'name slug')
        .populate('category_id', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getJobById(jobId: string): Promise<unknown> {
    return Job.findById(jobId)
      .populate('company_id', 'name slug')
      .populate('category_id', 'name slug')
      .lean();
  }

  async removeJob(jobId: string, adminId: string, reason: string): Promise<unknown> {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');

    const oldStatus = job.status;
    job.status = 'removed';
    await job.save();

    await this.createAuditLog(
      adminId,
      'super_admin',
      'job.removed',
      'Job',
      jobId,
      { status: oldStatus },
      { status: 'removed', reason }
    );

    return job;
  }

  // ============ Categories ============

  async getCategories(): Promise<unknown[]> {
    return JobCategory.find().sort({ name: 1 }).lean();
  }

  async createCategory(data: { name: string; slug?: string; icon_url?: string }, adminId: string): Promise<unknown> {
    const category = await JobCategory.create(data);

    await this.createAuditLog(
      adminId,
      'moderator',
      'category.created',
      'JobCategory',
      category._id.toString(),
      undefined,
      { name: category.name }
    );

    return category;
  }

  async updateCategory(
    categoryId: string,
    data: { name?: string; slug?: string; icon_url?: string; is_active?: boolean },
    adminId: string
  ): Promise<unknown> {
    const oldCategory = await JobCategory.findById(categoryId);
    if (!oldCategory) throw new Error('Category not found');

    const category = await JobCategory.findByIdAndUpdate(
      categoryId,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    await this.createAuditLog(
      adminId,
      'moderator',
      'category.updated',
      'JobCategory',
      categoryId,
      oldCategory,
      category
    );

    return category;
  }

  async deleteCategory(categoryId: string, adminId: string): Promise<boolean> {
    const category = await JobCategory.findById(categoryId);
    if (!category) throw new Error('Category not found');

    // Check if category is in use
    const jobsCount = await Job.countDocuments({ category_id: categoryId });
    if (jobsCount > 0) {
      throw new Error('Cannot delete category that is in use by jobs');
    }

    await JobCategory.deleteOne({ _id: categoryId });

    await this.createAuditLog(
      adminId,
      'moderator',
      'category.deleted',
      'JobCategory',
      categoryId,
      { name: category.name },
      undefined
    );

    return true;
  }

  // ============ Skill Tags ============

  async getSkillTags(): Promise<unknown[]> {
    return SkillTag.find().sort({ name: 1 }).lean();
  }

  async createSkillTag(data: { name: string; slug?: string; category?: string }, adminId: string): Promise<unknown> {
    const skillTag = await SkillTag.create(data);

    await this.createAuditLog(
      adminId,
      'moderator',
      'skill_tag.created',
      'SkillTag',
      skillTag._id.toString(),
      undefined,
      { name: skillTag.name }
    );

    return skillTag;
  }

  async updateSkillTag(
    skillTagId: string,
    data: { name?: string; slug?: string; category?: string; is_active?: boolean },
    adminId: string
  ): Promise<unknown> {
    const oldTag = await SkillTag.findById(skillTagId);
    if (!oldTag) throw new Error('Skill tag not found');

    const skillTag = await SkillTag.findByIdAndUpdate(
      skillTagId,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    await this.createAuditLog(
      adminId,
      'moderator',
      'skill_tag.updated',
      'SkillTag',
      skillTagId,
      oldTag,
      skillTag
    );

    return skillTag;
  }

  async deleteSkillTag(skillTagId: string, adminId: string): Promise<boolean> {
    const skillTag = await SkillTag.findById(skillTagId);
    if (!skillTag) throw new Error('Skill tag not found');

    await SkillTag.deleteOne({ _id: skillTagId });

    await this.createAuditLog(
      adminId,
      'moderator',
      'skill_tag.deleted',
      'SkillTag',
      skillTagId,
      { name: skillTag.name },
      undefined
    );

    return true;
  }

  async mergeSkillTag(sourceId: string, targetId: string, adminId: string): Promise<unknown> {
    const sourceTag = await SkillTag.findById(sourceId);
    if (!sourceTag) throw new Error('Source skill tag not found');

    const targetTag = await SkillTag.findById(targetId);
    if (!targetTag) throw new Error('Target skill tag not found');

    // Update all references from source to target
    // This would require updating seeker_skills and job_skills collections
    // For now, we'll just delete the source and let the target remain

    await SkillTag.deleteOne({ _id: sourceId });

    await this.createAuditLog(
      adminId,
      'moderator',
      'skill_tag.merged',
      'SkillTag',
      sourceId,
      { name: sourceTag.name },
      { merged_into: targetTag.name }
    );

    return targetTag;
  }

  // ============ Support Tickets ============

  async getTickets(filters: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ tickets: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.status) {
      query.status = filters.status;
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('submitted_by', 'email')
        .populate('assigned_to', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getTicketById(ticketId: string): Promise<unknown> {
    const ticket = await SupportTicket.findById(ticketId)
      .populate('submitted_by', 'email')
      .populate('assigned_to', 'email')
      .lean();

    if (!ticket) throw new Error('Ticket not found');

    const rawMessages = await TicketMessage.find({ ticket_id: ticketId })
      .populate('sender_id', 'email role')
      .sort({ sent_at: 1 })
      .lean();
    const messages = await enrichMessageSenders(rawMessages);

    // Enrich the submitter so the detail header can render a real name.
    let submittedBy: unknown = ticket.submitted_by;
    if (submittedBy && typeof submittedBy === 'object') {
      const enriched = await enrichMessageSender({ sender_id: submittedBy });
      submittedBy = enriched.sender_id;
    }

    return {
      ...ticket,
      submitted_by: submittedBy,
      messages,
    };
  }

  async assignTicket(ticketId: string, assignedTo: string, adminId: string): Promise<unknown> {
    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { $set: { assigned_to: assignedTo, status: 'in_progress' } },
      { new: true }
    ).lean();

    if (!ticket) throw new Error('Ticket not found');

    await this.createAuditLog(
      adminId,
      'support_admin',
      'ticket.assigned',
      'SupportTicket',
      ticketId,
      undefined,
      { assigned_to: assignedTo }
    );

    return ticket;
  }

  async updateTicketStatus(ticketId: string, status: string, adminId: string): Promise<unknown> {
    const oldTicket = await SupportTicket.findById(ticketId);
    if (!oldTicket) throw new Error('Ticket not found');

    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { $set: { status } },
      { new: true }
    ).lean();

    await this.createAuditLog(
      adminId,
      'support_admin',
      'ticket.status_changed',
      'SupportTicket',
      ticketId,
      { status: oldTicket.status },
      { status }
    );

    // Push status change to anyone in the ticket room (admin and submitter
    // browser tabs both update without needing to refresh).
    if (oldTicket.status !== status) {
      emitTicketStatus(ticketId, status);

      // In-app notification to the submitter for every transition.
      if (oldTicket.submitted_by) {
        void (async () => {
          try {
            const submitter = await User.findById(oldTicket.submitted_by)
              .select('role')
              .lean();
            await notificationService.notify(
              oldTicket.submitted_by.toString(),
              'ticket.status',
              `Ticket "${oldTicket.subject}" is now ${status.replace('_', ' ')}`,
              undefined,
              supportLinkForRole(submitter?.role, ticketId)
            );
          } catch (err) {
            console.error('[admin.updateTicketStatus] failed to push notification:', err);
          }
        })();
      }
    }

    // Notify the submitter when the ticket transitions into resolved or closed
    // (and only on the actual transition, not on a no-op set).
    if (
      (status === 'resolved' || status === 'closed') &&
      oldTicket.status !== status
    ) {
      void (async () => {
        try {
          const submitter = await User.findById(oldTicket.submitted_by).select('email').lean();
          const closer = await User.findById(adminId).select('email').lean();
          if (submitter?.email) {
            await emailService.sendTicketClosedEmail({
              to: submitter.email,
              ticketId,
              subject: oldTicket.subject,
              finalStatus: status,
              closedByEmail: closer?.email,
            });
          }
        } catch (err) {
          console.error('[admin.updateTicketStatus] failed to send close email:', err);
        }
      })();
    }

    return ticket;
  }

  async replyTicket(
    ticketId: string,
    senderId: string,
    message: string,
    attachments?: Array<{ url: string; filename: string; mime: string; size: number }>
  ): Promise<unknown> {
    const ticket = await SupportTicket.findById(ticketId).select(
      'submitted_by subject status'
    );
    if (!ticket) throw new Error('Ticket not found');

    const trimmed = message?.trim();
    if (!trimmed && (!attachments || attachments.length === 0)) {
      throw new Error('Provide a message or at least one attachment');
    }

    const ticketMessage = await TicketMessage.create({
      ticket_id: ticketId,
      sender_id: senderId,
      message: trimmed,
      attachments: attachments?.length ? attachments : undefined,
    });

    const populated = await ticketMessage.populate('sender_id', 'email role');
    const enriched = await enrichMessageSender(populated.toObject());
    emitTicketMessage(ticketId, enriched);

    // Move open tickets into in_progress on first admin reply.
    if (ticket.status === 'open') {
      await SupportTicket.updateOne({ _id: ticketId }, { $set: { status: 'in_progress' } });
      emitTicketStatus(ticketId, 'in_progress');
    }

    // Notify the submitter — both email + in-app.
    void (async () => {
      try {
        const submitter = await User.findById(ticket.submitted_by).select('email').lean();
        const replier = await User.findById(senderId).select('email').lean();
        if (submitter?.email) {
          await emailService.sendTicketReplyEmail({
            to: submitter.email,
            ticketId,
            subject: ticket.subject,
            replyMessage: message,
            replierEmail: replier?.email,
          });
        }
        if (ticket.submitted_by) {
          const submitterFull = await User.findById(ticket.submitted_by)
            .select('role')
            .lean();
          const preview = trimmed?.slice(0, 200);
          await notificationService.notify(
            ticket.submitted_by.toString(),
            'ticket.reply',
            `Support replied on "${ticket.subject}"`,
            preview,
            supportLinkForRole(submitterFull?.role, ticketId)
          );
        }
      } catch (err) {
        console.error('[admin.replyTicket] failed to notify submitter:', err);
      }
    })();

    return ticketMessage;
  }

  // ============ Analytics ============

  async getOverviewAnalytics(period = '30d'): Promise<unknown> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '365d':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalUsers,
      totalCompanies,
      totalActiveJobs,
      totalApplications,
      recentApplications,
    ] = await Promise.all([
      User.countDocuments(),
      Company.countDocuments({ approval_status: 'approved' }),
      Job.countDocuments({ status: 'active' }),
      Application.countDocuments({ applied_at: { $gte: startDate } }),
      Application.find({ applied_at: { $gte: startDate } })
        .sort({ applied_at: -1 })
        .limit(10)
        .populate('job_id', 'title')
        .lean(),
    ]);

    return {
      totalUsers,
      totalCompanies,
      totalActiveJobs,
      totalApplications,
      recentApplications,
      period,
    };
  }

  async getUserAnalytics(period = '30d'): Promise<unknown[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

    return User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getJobAnalytics(period = '30d'): Promise<unknown[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

    return Job.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getApplicationAnalytics(period = '30d'): Promise<unknown[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

    const [byDate, byStatus] = await Promise.all([
      Application.aggregate([
        { $match: { applied_at: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$applied_at' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Application.aggregate([
        { $match: { applied_at: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return { byDate, byStatus };
  }

  async getCompanyAnalytics(): Promise<unknown[]> {
    return Company.aggregate([
      { $match: { approval_status: 'approved' } },
      {
        $group: {
          _id: '$approval_status',
          count: { $sum: 1 },
        },
      },
    ]);
  }

  // ============ Audit Logs ============

  async getAuditLogs(filters: {
    page?: number;
    limit?: number;
    actor_id?: string;
    action?: string;
    entity_type?: string;
    entity_id?: string;
  }): Promise<{ logs: unknown[]; pagination: unknown }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.actor_id) {
      query.actor_id = filters.actor_id;
    }
    if (filters.action) {
      query.action = { $regex: filters.action, $options: 'i' };
    }
    if (filters.entity_type) {
      query.entity_type = filters.entity_type;
    }
    if (filters.entity_id) {
      query.entity_id = filters.entity_id;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor_id', 'email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ============ System Config ============

  async getConfig(keys?: string): Promise<unknown[] | unknown> {
    const query: Record<string, unknown> = {};
    if (keys) {
      const keyArray = keys.split(',').map((k) => k.trim());
      query.key = { $in: keyArray };
    }

    return SystemConfig.find(query).lean();
  }

  async updateConfig(key: string, value: unknown, adminId: string): Promise<unknown> {
    const oldConfig = await SystemConfig.findOne({ key });

    const config = await SystemConfig.findOneAndUpdate(
      { key },
      { $set: { value, updated_by: adminId } },
      { upsert: true, new: true }
    ).lean();

    await this.createAuditLog(
      adminId,
      'super_admin',
      'config.updated',
      'SystemConfig',
      config?._id?.toString() || key,
      oldConfig?.value,
      value
    );

    return config;
  }

  // ============ Admin Accounts ============

  async getAdmins(page = 1, limit = 20): Promise<{ admins: unknown[]; pagination: unknown }> {
    const skip = (page - 1) * limit;

    const query = {
      role: { $in: ['super_admin', 'moderator', 'support_admin', 'analytics_admin'] },
    };

    const [admins, total] = await Promise.all([
      User.find(query)
        .select('-password_hash -totp_secret')
        .populate('admin_role_id', 'name description permissions is_system')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      admins,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async createAdmin(
    email: string,
    roleId: string,
    adminId: string,
    extraPermissions?: string[],
    profile?: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      employee_id?: string;
      avatar_url?: string;
    }
  ): Promise<unknown> {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const role = await Role.findById(roleId).select('_id name').lean();
    if (!role) throw new Error('Role not found');

    if (profile?.employee_id) {
      const dupe = await User.findOne({ employee_id: profile.employee_id }).select('_id').lean();
      if (dupe) throw new Error('Employee ID is already in use');
    }

    const sanitizedExtras = sanitizeExtraPermissions(extraPermissions);

    const admin = await User.create({
      email: email.toLowerCase(),
      password_hash: 'PENDING_SETUP', // Will be set via invite flow
      role: deriveEnumRole(role.name),
      admin_role_id: role._id,
      extra_permissions: sanitizedExtras,
      first_name: profile?.first_name?.trim(),
      last_name: profile?.last_name?.trim(),
      phone: profile?.phone?.trim(),
      employee_id: profile?.employee_id?.trim(),
      avatar_url: profile?.avatar_url,
      is_active: true,
    });

    await this.createAuditLog(
      adminId,
      'super_admin',
      'admin.created',
      'User',
      admin._id.toString(),
      undefined,
      {
        email,
        role: role.name,
        extra_permissions: sanitizedExtras ?? [],
        first_name: profile?.first_name,
        employee_id: profile?.employee_id,
      }
    );

    return admin;
  }

  async updateAdmin(
    adminId: string,
    data: {
      role_id?: string;
      extra_permissions?: string[];
      is_active?: boolean;
      first_name?: string;
      last_name?: string;
      phone?: string;
      employee_id?: string;
      avatar_url?: string;
    },
    actorId: string
  ): Promise<unknown> {
    const oldAdmin = await User.findById(adminId);
    if (!oldAdmin) throw new Error('Admin not found');

    const update: Record<string, unknown> = {};
    if (data.is_active !== undefined) update.is_active = data.is_active;

    if (data.role_id !== undefined) {
      const role = await Role.findById(data.role_id).select('_id name').lean();
      if (!role) throw new Error('Role not found');
      update.admin_role_id = role._id;
      update.role = deriveEnumRole(role.name);
    }

    if (data.extra_permissions !== undefined) {
      update.extra_permissions = sanitizeExtraPermissions(data.extra_permissions);
    }

    if (data.first_name !== undefined) update.first_name = data.first_name.trim();
    if (data.last_name !== undefined) update.last_name = data.last_name.trim();
    if (data.phone !== undefined) update.phone = data.phone.trim();
    if (data.avatar_url !== undefined) update.avatar_url = data.avatar_url;
    if (data.employee_id !== undefined) {
      const next = data.employee_id.trim();
      if (next && next !== oldAdmin.employee_id) {
        const dupe = await User.findOne({ employee_id: next, _id: { $ne: oldAdmin._id } })
          .select('_id')
          .lean();
        if (dupe) throw new Error('Employee ID is already in use');
      }
      update.employee_id = next || undefined;
    }

    const admin = await User.findByIdAndUpdate(adminId, { $set: update }, { new: true }).select(
      '-password_hash -totp_secret'
    );

    invalidatePermissionCache(adminId);

    await this.createAuditLog(
      actorId,
      'super_admin',
      'admin.updated',
      'User',
      adminId,
      { role: oldAdmin.role, admin_role_id: oldAdmin.admin_role_id?.toString() ?? null },
      update
    );

    return admin;
  }

  async deleteAdmin(adminId: string, actorId: string): Promise<boolean> {
    const admin = await User.findById(adminId);
    if (!admin) throw new Error('Admin not found');

    if (admin.role === 'super_admin') {
      // Check if this is the last super admin
      const superAdminCount = await User.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) {
        throw new Error('Cannot delete the last super admin');
      }
    }

    await User.deleteOne({ _id: adminId });

    await this.createAuditLog(
      actorId,
      'super_admin',
      'admin.deleted',
      'User',
      adminId,
      { email: admin.email },
      undefined
    );

    return true;
  }

  // ============ Helpers ============

  private async createAuditLog(
    actorId: string,
    actorRole: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: unknown,
    newValue?: unknown
  ): Promise<void> {
    try {
      await AuditLog.create({
        actor_id: actorId,
        actor_role: actorRole,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

function supportLinkForRole(role: string | undefined | null, ticketId: string): string {
  const base =
    role === 'company_owner' ||
    role === 'hr_manager' ||
    role === 'recruiter' ||
    role === 'viewer'
      ? '/company/support'
      : '/seeker/support';
  return `${base}?id=${ticketId}`;
}

export const adminService = new AdminService();
export default adminService;
