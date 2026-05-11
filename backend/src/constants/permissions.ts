/**
 * Permission catalog. Permissions are encoded as `<resource>:<action>` strings.
 * The catalog drives both the UI matrix (admin role editor) and the backend
 * authorization checks via requirePermission().
 *
 * To add a new resource or action, edit PERMISSION_CATALOG and update
 * SYSTEM_ROLE_PERMISSIONS so the system roles (super_admin, moderator,
 * support_admin, analytics_admin) keep their expected powers.
 */

export const PERMISSION_CATALOG = {
  companies: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'suspend', 'ban'],
  users: ['view', 'edit', 'suspend', 'ban'],
  jobs_moderation: ['view', 'remove'],
  job_categories: ['view', 'create', 'edit', 'delete'],
  skill_tags: ['view', 'create', 'edit', 'delete', 'merge'],
  tickets: ['view', 'assign', 'edit', 'reply'],
  ticket_templates: ['view', 'create', 'edit', 'delete'],
  analytics: ['view'],
  audit_logs: ['view'],
  system_config: ['view', 'edit'],
  admins: ['view', 'create', 'edit', 'delete'],
  roles: ['view', 'create', 'edit', 'delete'],
  seekers: ['view'],
  ai_features: ['view'],
  officials: ['view', 'create', 'edit', 'deactivate', 'reactivate', 'resend_welcome'],
} as const;

export type ResourceKey = keyof typeof PERMISSION_CATALOG;

export const ALL_PERMISSIONS: string[] = Object.entries(PERMISSION_CATALOG).flatMap(
  ([resource, actions]) => (actions as readonly string[]).map((a) => `${resource}:${a}`)
);

const ALL_PERMS_SET = new Set(ALL_PERMISSIONS);

export function isValidPermission(p: string): boolean {
  return ALL_PERMS_SET.has(p);
}

export type SystemRoleName = 'super_admin' | 'moderator' | 'support_admin' | 'analytics_admin';

/**
 * What each system role implicitly granted before the new permission system
 * existed. Mirrors the authorize(...) calls in admin.routes.ts so the
 * migration is behavior-preserving.
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleName, string[]> = {
  super_admin: [...ALL_PERMISSIONS],
  moderator: [
    'companies:view',
    'companies:approve',
    'jobs_moderation:view',
    'jobs_moderation:remove',
    'job_categories:view',
    'job_categories:create',
    'job_categories:edit',
    'job_categories:delete',
    'skill_tags:view',
    'skill_tags:create',
    'skill_tags:edit',
    'skill_tags:delete',
    'skill_tags:merge',
    'seekers:view',
    'ai_features:view',
  ],
  support_admin: [
    'users:view',
    'tickets:view',
    'tickets:assign',
    'tickets:edit',
    'tickets:reply',
    'ticket_templates:view',
    'ticket_templates:create',
    'ticket_templates:edit',
    'ticket_templates:delete',
    'seekers:view',
    'ai_features:view',
  ],
  analytics_admin: ['analytics:view'],
};

export const SYSTEM_ROLE_DESCRIPTIONS: Record<SystemRoleName, string> = {
  super_admin: 'Full platform control. Can manage admins, roles, system configuration, and all moderation surfaces.',
  moderator: 'Approves companies, removes offending jobs, manages categories and skill tags.',
  support_admin: 'Customer-support agent. Reads user accounts, works the ticket queue, looks up seekers.',
  analytics_admin: 'Read-only analytics dashboards.',
};
