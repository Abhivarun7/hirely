import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { uploadTicketAttachments } from '../../middleware/upload.js';
import { supportController } from './support.controller.js';
import {
  createTicketSchema,
  listMyTicketsSchema,
  ticketIdParamSchema,
  replyToMyTicketSchema,
} from './support.schema.js';

const router = Router();

/**
 * Authenticated support endpoints — any logged-in user (seeker, company
 * member, employment official, even admins) can raise a ticket about their
 * own account. Admin-side ticket management lives under /admin/tickets.
 */

router.post('/tickets', authenticate, validate(createTicketSchema), (req, res, next) =>
  supportController.createTicket(req, res).catch(next)
);

router.get('/tickets', authenticate, validate(listMyTicketsSchema), (req, res, next) =>
  supportController.listMyTickets(req, res).catch(next)
);

router.get('/tickets/:ticketId', authenticate, validate(ticketIdParamSchema), (req, res, next) =>
  supportController.getMyTicket(req, res).catch(next)
);

router.post(
  '/tickets/:ticketId/messages',
  authenticate,
  validate(replyToMyTicketSchema),
  (req, res, next) => supportController.replyToMyTicket(req, res).catch(next)
);

// File uploads — multer parses multipart, controller returns the URLs the
// client then sends back inside a /messages POST as the attachments array.
router.post(
  '/tickets/:ticketId/attachments',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    uploadTicketAttachments(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        res.status(400).json({ status: 'error', code: 'UPLOAD_ERROR', message });
        return;
      }
      next();
    });
  },
  (req, res, next) => supportController.uploadAttachments(req, res).catch(next)
);

export default router;
