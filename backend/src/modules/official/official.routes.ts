import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { uploadResume } from '../../middleware/upload.js';
import { officialController } from './official.controller.js';
import { officialSchemas } from './official.schema.js';

const router = Router();

router.use(authenticate, authorize('employment_official'));

router.get('/me', (req, res, next) => officialController.getMe(req, res).catch(next));
router.put('/me', validate(officialSchemas.updateMe), (req, res, next) =>
  officialController.updateMe(req, res).catch(next)
);

router.get('/jobs/nearby', validate(officialSchemas.nearbyJobs), (req, res, next) =>
  officialController.nearbyJobs(req, res).catch(next)
);

router.get('/candidates', validate(officialSchemas.candidates), (req, res, next) =>
  officialController.candidates(req, res).catch(next)
);

router.get('/candidates/:id', validate(officialSchemas.candidateId), (req, res, next) =>
  officialController.getCandidate(req, res).catch(next)
);

router.post(
  '/candidates/walk-in',
  uploadResume,
  validate(officialSchemas.walkIn),
  (req, res, next) => officialController.createWalkIn(req, res).catch(next)
);

router.post('/push', validate(officialSchemas.push), (req, res, next) =>
  officialController.push(req, res).catch(next)
);

router.get('/pushes', (req, res, next) => officialController.listPushes(req, res).catch(next));

router.get('/hires/nearby', validate(officialSchemas.hires), (req, res, next) =>
  officialController.nearbyHires(req, res).catch(next)
);

export default router;
