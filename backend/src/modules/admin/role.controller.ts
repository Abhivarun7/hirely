import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { roleService } from './role.service.js';
import {
  PERMISSION_CATALOG,
  ALL_PERMISSIONS,
  SYSTEM_ROLE_DESCRIPTIONS,
} from '../../constants/permissions.js';

export class RoleController {
  async getCatalog(_req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({
      status: 'success',
      data: {
        catalog: PERMISSION_CATALOG,
        all: ALL_PERMISSIONS,
        systemRoleDescriptions: SYSTEM_ROLE_DESCRIPTIONS,
      },
    });
  }

  async list(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const roles = await roleService.list();
    res.json({ status: 'success', data: roles });
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const role = await roleService.getById(req.params.id);
    if (!role) {
      res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Role not found' });
      return;
    }
    res.json({ status: 'success', data: role });
  }

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, description, permissions } = req.body ?? {};
      const role = await roleService.create({
        name,
        description,
        permissions: Array.isArray(permissions) ? permissions : [],
      });
      res.status(201).json({ status: 'success', data: role });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create role';
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const role = await roleService.update(req.params.id, req.body ?? {});
      res.json({ status: 'success', data: role });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role';
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }

  async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await roleService.remove(req.params.id);
      res.json({ status: 'success', message: 'Role deleted' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete role';
      res.status(400).json({ status: 'error', code: 'ERROR', message });
    }
  }
}

export const roleController = new RoleController();
export default roleController;
