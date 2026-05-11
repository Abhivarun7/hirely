import { z } from 'zod';

// ============ Company Management Schemas ============

export const getCompaniesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'suspended', 'banned']).optional(),
    search: z.string().optional(),
  }),
});

export const getCompanyByIdSchema = z.object({
  params: z.object({ companyId: z.string().min(1) }),
});

export const approveCompanySchema = z.object({
  params: z.object({ companyId: z.string().min(1) }),
  body: z.object({
    notes: z.string().optional(),
  }).optional(),
});

export const rejectCompanySchema = z.object({
  params: z.object({ companyId: z.string().min(1) }),
  body: z.object({
    reason: z.string().min(1),
  }),
});

export const suspendCompanySchema = z.object({
  params: z.object({ companyId: z.string().min(1) }),
  body: z.object({
    reason: z.string().optional(),
  }).optional(),
});

export const banCompanySchema = z.object({
  params: z.object({ companyId: z.string().min(1) }),
  body: z.object({
    reason: z.string().min(1),
  }),
});

// ============ User Management Schemas ============

export const getUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    role: z.string().optional(),
    is_banned: z.coerce.boolean().optional(),
    search: z.string().optional(),
  }),
});

export const getUserByIdSchema = z.object({
  params: z.object({ userId: z.string().min(1) }),
});

export const suspendUserSchema = z.object({
  params: z.object({ userId: z.string().min(1) }),
  body: z.object({
    reason: z.string().optional(),
  }).optional(),
});

export const banUserSchema = z.object({
  params: z.object({ userId: z.string().min(1) }),
  body: z.object({
    reason: z.string().min(1),
  }),
});

export const impersonateUserSchema = z.object({
  params: z.object({ userId: z.string().min(1) }),
});

export const getUserApplicationsSchema = z.object({
  params: z.object({ userId: z.string().min(1) }),
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

// ============ Content Moderation Schemas ============

export const getJobsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    status: z.string().optional(),
    company_id: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const getJobByIdSchema = z.object({
  params: z.object({ jobId: z.string().min(1) }),
});

export const removeJobSchema = z.object({
  params: z.object({ jobId: z.string().min(1) }),
  body: z.object({
    reason: z.string().min(1),
  }),
});

// ============ Category Schemas ============

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    slug: z.string().max(100).optional(),
    icon_url: z.string().url().optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().max(100).optional(),
    icon_url: z.string().url().optional(),
    is_active: z.boolean().optional(),
  }),
});

export const deleteCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// ============ Skill Tag Schemas ============

export const createSkillTagSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    slug: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
  }),
});

export const updateSkillTagSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    is_active: z.boolean().optional(),
  }),
});

export const deleteSkillTagSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const mergeSkillTagSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    target_id: z.string().min(1),
  }),
});

// ============ Support Ticket Schemas ============

export const getTicketsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  }),
});

export const getTicketByIdSchema = z.object({
  params: z.object({ ticketId: z.string().min(1) }),
});

export const assignTicketSchema = z.object({
  params: z.object({ ticketId: z.string().min(1) }),
  body: z.object({
    assigned_to: z.string().min(1),
  }),
});

export const updateTicketStatusSchema = z.object({
  params: z.object({ ticketId: z.string().min(1) }),
  body: z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  }),
});

const ticketAttachmentZ = z.object({
  url: z.string().min(1),
  filename: z.string().min(1).max(255),
  mime: z.string().min(1).max(100),
  size: z.number().int().min(0),
});

export const replyTicketSchema = z.object({
  params: z.object({ ticketId: z.string().min(1) }),
  body: z
    .object({
      message: z.string().max(5000).optional(),
      attachments: z.array(ticketAttachmentZ).max(5).optional(),
    })
    .refine(
      (val) => (val.message?.trim().length ?? 0) > 0 || (val.attachments?.length ?? 0) > 0,
      { message: 'Provide a message or at least one attachment' }
    ),
});

// ============ Analytics Schemas ============

export const analyticsQuerySchema = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', '365d']).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
  }),
});

// ============ Audit Log Schemas ============

export const getAuditLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    actor_id: z.string().optional(),
    action: z.string().optional(),
    entity_type: z.string().optional(),
    entity_id: z.string().optional(),
  }),
});

// ============ System Config Schemas ============

export const getConfigSchema = z.object({
  query: z.object({
    keys: z.string().optional(), // comma-separated list of keys
  }),
});

export const updateConfigSchema = z.object({
  body: z.object({
    key: z.string().min(1).max(100),
    value: z.unknown(),
  }),
});

// ============ Admin Account Schemas ============

const adminProfileFields = {
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  employee_id: z.string().max(50).optional(),
  avatar_url: z.string().max(2048).optional(),
};

export const createAdminSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role_id: z.string().min(1),
    extra_permissions: z.array(z.string()).optional(),
    ...adminProfileFields,
  }),
});

export const updateAdminSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    role_id: z.string().min(1).optional(),
    extra_permissions: z.array(z.string()).optional(),
    is_active: z.boolean().optional(),
    ...adminProfileFields,
  }),
});

export const deleteAdminSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    permissions: z.array(z.string()).default([]),
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    permissions: z.array(z.string()).optional(),
  }),
});

export const deleteRoleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
