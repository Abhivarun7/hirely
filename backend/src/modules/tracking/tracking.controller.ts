import { Request, Response } from 'express';
import { JobInvite } from '../../models/index.js';
import config from '../../config/env.js';

// 1x1 transparent GIF (43 bytes). Embedded as base64 so we don't need a
// binary asset on disk.
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

function isValidToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{16,128}$/i.test(token);
}

function safeJobUrl(jobId: string): string {
  // jobId comes from the JobInvite document, so it's already validated as an
  // ObjectId — just guard against any future-string edge cases by escaping.
  const clean = jobId.replace(/[^a-fA-F0-9]/g, '');
  return `${config.FRONTEND_URL}/jobs/${clean}`;
}

export class TrackingController {
  /**
   * GET /api/v1/track/invite/:token/open.gif
   *
   * Returns a 1x1 transparent GIF and records the open. We swallow all errors
   * so a corrupt token never breaks email rendering.
   */
  async openPixel(req: Request, res: Response): Promise<void> {
    const token = req.params.token;
    try {
      if (isValidToken(token)) {
        await JobInvite.updateOne(
          { token },
          {
            $inc: { open_count: 1 },
            $set: {
              opened_at: new Date(),
              // Only flip status forward, never backward. Mongo doesn't have a
              // simple "max" operator across enum strings, so we use a filter:
              // only set status to 'opened' if it's still 'sent'.
            },
          }
        );
        // Promote 'sent' → 'opened' (don't downgrade clicked/applied)
        await JobInvite.updateOne(
          { token, status: 'sent' },
          { $set: { status: 'opened' } }
        );
      }
    } catch (err) {
      console.error('[tracking] openPixel error:', err);
    }
    res
      .status(200)
      .setHeader('Content-Type', 'image/gif')
      .setHeader('Content-Length', PIXEL_GIF.length.toString())
      .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      .setHeader('Pragma', 'no-cache')
      .end(PIXEL_GIF);
  }

  /**
   * GET /api/v1/track/invite/:token/click
   *
   * Records the click and 302-redirects to the public job page. If the token
   * is invalid we still send the user to the home/jobs feed instead of an
   * error page — better UX than dead-ending the recipient.
   */
  async clickRedirect(req: Request, res: Response): Promise<void> {
    const token = req.params.token;
    if (!isValidToken(token)) {
      res.redirect(302, `${config.FRONTEND_URL}/jobs`);
      return;
    }
    try {
      const invite = await JobInvite.findOneAndUpdate(
        { token },
        {
          $inc: { click_count: 1 },
          $set: { clicked_at: new Date() },
        },
        { new: true, projection: { job_id: 1, status: 1 } }
      ).lean();

      if (!invite) {
        res.redirect(302, `${config.FRONTEND_URL}/jobs`);
        return;
      }

      // Promote sent/opened → clicked (don't downgrade applied)
      if (invite.status === 'sent' || invite.status === 'opened') {
        await JobInvite.updateOne(
          { token, status: { $in: ['sent', 'opened'] } },
          { $set: { status: 'clicked' } }
        );
      }

      res.redirect(302, safeJobUrl(invite.job_id.toString()));
    } catch (err) {
      console.error('[tracking] clickRedirect error:', err);
      res.redirect(302, `${config.FRONTEND_URL}/jobs`);
    }
  }
}

export const trackingController = new TrackingController();
export default trackingController;
