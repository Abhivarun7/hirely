import { Router } from 'express';
import { trackingController } from './tracking.controller.js';

/**
 * Public tracking endpoints used by outbound emails. No auth — the token in
 * the URL is the only credential. Tokens are 32+ hex chars from
 * crypto.randomBytes so guessing is infeasible, and the worst-case impact of
 * a guessed token is nudging an analytics counter.
 */

const router = Router();

router.get('/invite/:token/open.gif', (req, res, next) =>
  trackingController.openPixel(req, res).catch(next)
);

router.get('/invite/:token/click', (req, res, next) =>
  trackingController.clickRedirect(req, res).catch(next)
);

export default router;
