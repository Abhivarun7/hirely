import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate.js';
import { User, Role } from '../models/index.js';
import {
  SYSTEM_ROLE_PERMISSIONS,
  type SystemRoleName,
} from '../constants/permissions.js';

declare module './authenticate.js' {
  interface JwtPayload {
    permissions?: string[];
  }
}

const SYSTEM_ROLE_NAMES = new Set<SystemRoleName>([
  'super_admin',
  'moderator',
  'support_admin',
  'analytics_admin',
]);

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export async function getEffectivePermissions(userId: string): Promise<Set<string>> {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) return cached.permissions;

  const user = await User.findById(userId)
    .select('role admin_role_id extra_permissions')
    .lean();
  if (!user) return new Set();

  const perms = new Set<string>();

  if (user.admin_role_id) {
    const role = await Role.findById(user.admin_role_id).select('permissions').lean();
    if (role?.permissions) {
      for (const p of role.permissions) perms.add(p);
    }
  } else if (SYSTEM_ROLE_NAMES.has(user.role as SystemRoleName)) {
    // Legacy admin (predates Role model) — fall back to the system mapping.
    for (const p of SYSTEM_ROLE_PERMISSIONS[user.role as SystemRoleName]) perms.add(p);
  }

  if (user.extra_permissions) {
    for (const p of user.extra_permissions) perms.add(p);
  }

  cache.set(userId, { permissions: perms, expiresAt: now + CACHE_TTL_MS });
  return perms;
}

export function invalidatePermissionCache(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export function requirePermission(...required: string[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    try {
      const perms = await getEffectivePermissions(req.user.sub);
      const missing = required.filter((p) => !perms.has(p));
      if (missing.length > 0) {
        res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
          missing,
        });
        return;
      }
      req.user.permissions = Array.from(perms);
      next();
    } catch (err) {
      console.error('[requirePermission] failed:', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to authorize request',
      });
    }
  };
}

export default requirePermission;
