import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { homeController } from './home.controller.js';

const router = Router();

router.get(
  '/feed',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => homeController.getFeed(req, res).catch(next)
);

router.post(
  '/dismiss',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => homeController.dismiss(req, res).catch(next)
);

router.post(
  '/track',
  authenticate,
  authorize('job_seeker'),
  (req, res, next) => homeController.track(req, res).catch(next)
);

export default router;
