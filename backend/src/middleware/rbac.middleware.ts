import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../modules/users/user.model.js';
import { ResponseUtil } from '../utils/apiResponse.js';

export type Permission =
  | 'users:manage'
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete'
  | 'activities:read'
  | 'activities:create'
  | 'billing:read'
  | 'billing:create'
  | 'preferences:read'
  | 'preferences:update'
  | 'import:execute'
  | 'audit:read';

// Centralized permission mapping per role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    'users:manage',
    'customers:read',
    'customers:create',
    'customers:update',
    'customers:delete',
    'activities:read',
    'activities:create',
    'billing:read',
    'billing:create',
    'preferences:read',
    'preferences:update',
    'import:execute',
    'audit:read'
  ],
  [UserRole.MARKETING_MANAGER]: [
    'customers:read',
    'customers:create',
    'customers:update',
    'activities:read',
    'activities:create',
    'billing:read',
    'preferences:read',
    'preferences:update',
    'import:execute'
  ],
  [UserRole.COMPLIANCE_REVIEWER]: [
    'customers:read',
    'activities:read',
    'billing:read',
    'preferences:read',
    'preferences:update',
    'audit:read'
  ]
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseUtil.error(res, 'Authentication required', 'UNAUTHENTICATED', undefined, 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      ResponseUtil.error(
        res,
        `Access denied. Role '${req.user.role}' is not authorized for this resource.`,
        'FORBIDDEN',
        undefined,
        403
      );
      return;
    }

    next();
  };
};

export const authorizePermissions = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseUtil.error(res, 'Authentication required', 'UNAUTHENTICATED', undefined, 401);
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      ResponseUtil.error(
        res,
        'Access denied. Insufficient permissions for this operation.',
        'FORBIDDEN',
        { required: requiredPermissions },
        403
      );
      return;
    }

    next();
  };
};
