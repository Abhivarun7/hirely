import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate.js';

type UserRole =
  | 'job_seeker'
  | 'company_owner'
  | 'hr_manager'
  | 'recruiter'
  | 'viewer'
  | 'super_admin'
  | 'moderator'
  | 'support_admin'
  | 'analytics_admin'
  | 'employment_official';

export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
}

export default authorize;
