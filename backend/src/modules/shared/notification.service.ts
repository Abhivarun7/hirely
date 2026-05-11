import { Notification } from '../../models/Notification.js';
import { User, Role } from '../../models/index.js';
import { Types } from 'mongoose';
import { emitNotification } from '../../realtime/socket.js';
import {
  SYSTEM_ROLE_PERMISSIONS,
  type SystemRoleName,
} from '../../constants/permissions.js';

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export const notificationService = {
  async notify(
    userId: string,
    type: string,
    title: string,
    body?: string,
    link?: string
  ): Promise<void> {
    const doc = await Notification.create({
      user_id: new Types.ObjectId(userId),
      type,
      title,
      body,
      link,
    });
    emitNotification(userId, doc.toObject());
  },

  async notifyMany(
    userIds: string[],
    type: string,
    title: string,
    body?: string,
    link?: string
  ): Promise<void> {
    if (userIds.length === 0) return;
    const docs = await Notification.insertMany(
      userIds.map((userId) => ({
        user_id: new Types.ObjectId(userId),
        type,
        title,
        body,
        link,
      }))
    );
    for (const doc of docs) {
      emitNotification(doc.user_id.toString(), doc.toObject());
    }
  },

  /**
   * Fan out a notification to every admin that has the given permission —
   * either via a custom Role mapping or a legacy system-role default. Used
   * for unassigned ticket events ("a user replied, somebody pick this up").
   */
  async notifyAdminsWithPermission(
    permission: string,
    input: Omit<NotifyInput, 'userId'>
  ): Promise<void> {
    const userIds = await findAdminsWithPermission(permission);
    if (userIds.length === 0) return;
    await this.notifyMany(userIds, input.type, input.title, input.body, input.link);
  },

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      user_id: new Types.ObjectId(userId),
      is_read: false,
    });
  },

  async getUnreadNotifications(userId: string, limit: number = 20) {
    return Notification.find({
      user_id: new Types.ObjectId(userId),
      is_read: false,
    })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();
  },
};

async function findAdminsWithPermission(permission: string): Promise<string[]> {
  // 1. Custom roles whose permission list contains the target.
  const roles = await Role.find({ permissions: permission }).select('_id').lean();
  const roleIds = roles.map((r) => r._id);

  // 2. Legacy system roles that grant this permission by default.
  const legacyRoles: SystemRoleName[] = (
    Object.keys(SYSTEM_ROLE_PERMISSIONS) as SystemRoleName[]
  ).filter((name) => SYSTEM_ROLE_PERMISSIONS[name].includes(permission));

  const orClauses: Array<Record<string, unknown>> = [
    { extra_permissions: permission },
  ];
  if (roleIds.length > 0) orClauses.push({ admin_role_id: { $in: roleIds } });
  if (legacyRoles.length > 0) {
    orClauses.push({ role: { $in: legacyRoles }, admin_role_id: { $exists: false } });
  }

  const users = await User.find({ is_active: true, $or: orClauses })
    .select('_id')
    .lean();

  return users.map((u) => u._id.toString());
}

export default notificationService;
