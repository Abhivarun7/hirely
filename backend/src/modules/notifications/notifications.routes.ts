import { Router, Response } from 'express';
import { Types } from 'mongoose';
import authenticate, { AuthenticatedRequest } from '../../middleware/authenticate.js';
import { Notification } from '../../models/index.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const filter = { user_id: new Types.ObjectId(userId) };
    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, is_read: false }),
    ]);
    res.json({
      status: 'success',
      data: items,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error('[notifications.list]', err);
    res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to list notifications' });
  }
});

router.get('/unread-count', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }
  try {
    const count = await Notification.countDocuments({
      user_id: new Types.ObjectId(userId),
      is_read: false,
    });
    res.json({ status: 'success', data: { count } });
  } catch (err) {
    console.error('[notifications.unread-count]', err);
    res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to count notifications' });
  }
});

router.put('/read-all', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }
  try {
    await Notification.updateMany(
      { user_id: new Types.ObjectId(userId), is_read: false },
      { $set: { is_read: true } }
    );
    res.json({ status: 'success', message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[notifications.read-all]', err);
    res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to mark all notifications as read' });
  }
});

router.put('/:id/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ status: 'error', code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: new Types.ObjectId(userId) },
      { $set: { is_read: true } },
      { new: true }
    ).lean();
    if (!updated) {
      res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Notification not found' });
      return;
    }
    res.json({ status: 'success', data: updated });
  } catch (err) {
    console.error('[notifications.mark-read]', err);
    res.status(500).json({ status: 'error', code: 'INTERNAL_ERROR', message: 'Failed to mark notification as read' });
  }
});

export default router;
