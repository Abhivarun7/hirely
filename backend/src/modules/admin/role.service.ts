import mongoose from 'mongoose';
import { Role, User } from '../../models/index.js';
import { isValidPermission } from '../../constants/permissions.js';
import { invalidatePermissionCache } from '../../middleware/requirePermission.js';

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

export class RoleService {
  async list(): Promise<unknown[]> {
    return Role.find().sort({ is_system: -1, name: 1 }).lean();
  }

  async getById(id: string): Promise<unknown | null> {
    return Role.findById(id).lean();
  }

  async create(input: CreateRoleInput): Promise<unknown> {
    const cleaned = this.sanitizePermissions(input.permissions);
    const exists = await Role.findOne({ name: input.name.trim() });
    if (exists) throw new Error('A role with this name already exists');

    const role = await Role.create({
      name: input.name.trim(),
      description: input.description?.trim(),
      permissions: cleaned,
      is_system: false,
    });
    return role.toObject();
  }

  async update(id: string, input: UpdateRoleInput): Promise<unknown | null> {
    const role = await Role.findById(id);
    if (!role) throw new Error('Role not found');
    if (role.is_system) throw new Error('System roles cannot be modified');

    if (input.name !== undefined) {
      const newName = input.name.trim();
      if (newName !== role.name) {
        const exists = await Role.findOne({ name: newName, _id: { $ne: role._id } });
        if (exists) throw new Error('A role with this name already exists');
        role.name = newName;
      }
    }
    if (input.description !== undefined) role.description = input.description.trim();
    if (input.permissions !== undefined) {
      role.permissions = this.sanitizePermissions(input.permissions);
    }
    await role.save();

    // Invalidate every cached perm set — any admin assigned this role just
    // gained or lost permissions.
    invalidatePermissionCache();
    return role.toObject();
  }

  async remove(id: string): Promise<void> {
    const role = await Role.findById(id);
    if (!role) throw new Error('Role not found');
    if (role.is_system) throw new Error('System roles cannot be deleted');

    const inUse = await User.countDocuments({ admin_role_id: role._id });
    if (inUse > 0) {
      throw new Error(
        `Role is assigned to ${inUse} admin${inUse === 1 ? '' : 's'}. Reassign them first.`
      );
    }

    await Role.deleteOne({ _id: role._id });
    invalidatePermissionCache();
  }

  /**
   * Validate role _id and return the underlying document. Used by admin
   * create/update flows so we can fail fast with a clear error.
   */
  async loadOrThrow(id: string): Promise<{ _id: mongoose.Types.ObjectId; name: string; permissions: string[] }> {
    if (!mongoose.isValidObjectId(id)) throw new Error('Invalid role id');
    const role = await Role.findById(id).select('_id name permissions').lean();
    if (!role) throw new Error('Role not found');
    return role as { _id: mongoose.Types.ObjectId; name: string; permissions: string[] };
  }

  private sanitizePermissions(perms: string[]): string[] {
    const cleaned = Array.from(
      new Set(perms.filter((p) => typeof p === 'string' && p.length > 0).map((p) => p.trim()))
    );
    const invalid = cleaned.filter((p) => !isValidPermission(p));
    if (invalid.length > 0) {
      throw new Error(`Unknown permissions: ${invalid.join(', ')}`);
    }
    return cleaned;
  }
}

export const roleService = new RoleService();
export default roleService;
