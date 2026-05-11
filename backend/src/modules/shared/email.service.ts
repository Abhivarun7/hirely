import nodemailer, { Transporter } from 'nodemailer';
import pino from 'pino';
import config from '../../config/env.js';

const logger = pino({ name: 'email' });

/**
 * Direct-send email service backed by nodemailer.
 *
 * Earlier this module produced jobs on a BullMQ queue that a separate worker
 * drained. That added an extra failure surface (worker liveness, Redis
 * availability, opaque retries) and made dev/test mail debugging painful
 * because the worker logs were detached from the request lifecycle.
 *
 * The service now opens a single SMTP connection lazily and sends inline via
 * nodemailer. Callers `await` the send and exceptions surface in the request
 * logs immediately. Failures are caught and logged here so that a flaky SMTP
 * provider never blocks a user-visible action (signup, invite, etc.) — the
 * email is best-effort.
 */

let transporter: Transporter | null = null;
let warnedAboutMissingConfig = false;

/**
 * Build (or return the cached) nodemailer transport from env. Returns null if
 * SMTP isn't configured — callers will log + skip rather than crash.
 */
function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    if (!warnedAboutMissingConfig) {
      logger.warn(
        'SMTP not fully configured (need SMTP_HOST, SMTP_USER, SMTP_PASS). Outbound mail is disabled.'
      );
      warnedAboutMissingConfig = true;
    }
    return null;
  }

  const port = config.SMTP_PORT ?? 587;
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port,
    // Implicit TLS on 465; STARTTLS on 587/25.
    secure: port === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  return transporter;
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

async function sendInternal(opts: SendOptions): Promise<void> {
  const t = getTransporter();
  if (!t) return; // SMTP not configured — silent no-op (already warned once)

  try {
    const info = await t.sendMail({
      from: opts.from || `"Hirely" <${config.SMTP_USER}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo || config.SMTP_USER,
    });
    logger.info({ to: opts.to, subject: opts.subject, messageId: info.messageId }, 'email sent');
  } catch (err) {
    // Don't propagate — most callers (signup, invite, status changes) treat
    // mail as fire-and-forget. They've already done the user-facing action.
    logger.error({ err, to: opts.to, subject: opts.subject }, 'email send failed');
  }
}

export const emailService = {
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await sendInternal({ to, subject, html });
  },

  async sendVerificationEmail(user: { email: string; firstName?: string }, token: string): Promise<void> {
    const verifyUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;
    const html = `
      <h1>Welcome to Hirely!</h1>
      <p>Hi ${user.firstName || 'there'},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verifyUrl}" style="display:inline-block;background:#F97316;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
      <p>- The Hirely Team</p>
    `;
    await sendInternal({ to: user.email, subject: 'Verify your Hirely account', html });
  },

  async sendPasswordResetEmail(user: { email: string; firstName?: string }, token: string): Promise<void> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password/${token}`;
    const html = `
      <h1>Reset Your Password</h1>
      <p>Hi ${user.firstName || 'there'},</p>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <a href="${resetUrl}" style="display:inline-block;background:#F97316;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      <p>- The Hirely Team</p>
    `;
    await sendInternal({ to: user.email, subject: 'Reset your Hirely password', html });
  },

  async sendOfficialWelcomeEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<void> {
    const setupUrl = `${config.FRONTEND_URL}/reset-password/${resetToken}`;
    const html = `
      <h1>Welcome to Hirely, ${firstName}!</h1>
      <p>An admin has set up an Employment Official account for you on Hirely.</p>
      <p>Click below to set your password and sign in:</p>
      <a href="${setupUrl}" style="display:inline-block;background:#F97316;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">Set your password</a>
      <p>This link expires in 1 hour. If it expires, ask your admin to resend it.</p>
      <p>- The Hirely Team</p>
    `;
    await sendInternal({ to: email, subject: 'Set up your Hirely Official account', html });
  },

  async sendTeamInviteEmail(
    email: string,
    companyName: string,
    inviterName: string,
    token: string
  ): Promise<void> {
    const inviteUrl = `${config.FRONTEND_URL}/accept-invite?token=${token}`;
    const html = `
      <h1>You've been invited to join ${companyName} on Hirely</h1>
      <p>${inviterName} has invited you to join their team on Hirely.</p>
      <p>Click the button below to accept the invitation and set up your account:</p>
      <a href="${inviteUrl}" style="display:inline-block;background:#F97316;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">Accept Invitation</a>
      <p>This link expires in 7 days.</p>
      <p>- The Hirely Team</p>
    `;
    await sendInternal({ to: email, subject: `You've been invited to join ${companyName}`, html });
  },

  async sendInterviewInviteEmail(params: {
    to: string;
    candidateName?: string;
    jobTitle: string;
    companyName: string;
    interviewDate: Date;
    format: 'video' | 'phone' | 'in_person';
    locationOrLink?: string;
    notes?: string;
  }): Promise<void> {
    const formatLabel: Record<string, string> = {
      video: 'Video call',
      phone: 'Phone call',
      in_person: 'In-person',
    };
    const dateStr = params.interviewDate.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
    const linkBlock = params.locationOrLink
      ? params.format === 'video'
        ? `<p><strong>Meeting link:</strong> <a href="${params.locationOrLink}">${params.locationOrLink}</a></p>`
        : `<p><strong>Location:</strong> ${params.locationOrLink}</p>`
      : '';
    const notesBlock = params.notes ? `<p><strong>Notes:</strong> ${params.notes}</p>` : '';
    const html = `
      <h1>Interview scheduled — ${params.jobTitle}</h1>
      <p>Hi ${params.candidateName || 'there'},</p>
      <p>${params.companyName} has scheduled an interview with you for the <strong>${params.jobTitle}</strong> role.</p>
      <p><strong>When:</strong> ${dateStr}</p>
      <p><strong>Format:</strong> ${formatLabel[params.format] ?? params.format}</p>
      ${linkBlock}
      ${notesBlock}
      <p>Please reply to this email if you need to reschedule.</p>
      <p>- The Hirely Team</p>
    `;
    await sendInternal({
      to: params.to,
      subject: `Interview scheduled: ${params.jobTitle} at ${params.companyName}`,
      html,
    });
  },

  async sendOfferExtendedEmail(params: {
    to: string;
    candidateName?: string;
    jobTitle: string;
    companyName: string;
    note?: string;
  }): Promise<void> {
    const noteBlock = params.note ? `<p>${params.note}</p>` : '';
    const html = `
      <h1>You've received an offer from ${params.companyName}!</h1>
      <p>Hi ${params.candidateName || 'there'},</p>
      <p>Congratulations — ${params.companyName} has extended an offer for the <strong>${params.jobTitle}</strong> role.</p>
      ${noteBlock}
      <p>The hiring team will be in touch with the formal offer letter and next steps.</p>
      <p>- The Hirely Team</p>
    `;
    await sendInternal({
      to: params.to,
      subject: `Offer extended: ${params.jobTitle} at ${params.companyName}`,
      html,
    });
  },

  async sendCandidateMatchInviteEmail(params: {
    to: string;
    candidateName?: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    inviterEmail?: string;
    inviterName?: string;
    personalMessage?: string;
    matchScore?: number;
    /** Tracked redirect URL — opens recorded as "clicked", then 302 to the
     * job page. If omitted (e.g. backfill), falls back to the direct job URL. */
    clickUrl?: string;
    /** 1x1 tracking pixel URL embedded as <img>. If omitted, no pixel. */
    openPixelUrl?: string;
  }): Promise<void> {
    const fallbackJobUrl = `${config.FRONTEND_URL}/jobs/${params.jobId}`;
    const ctaUrl = params.clickUrl || fallbackJobUrl;
    const introBy = params.inviterName?.trim() || params.inviterEmail || params.companyName;
    const personal = params.personalMessage
      ? `<p style="background:#fef3ec;padding:12px 16px;border-radius:8px;border-left:4px solid #ff6b00;white-space:pre-wrap;">${escapeHtml(params.personalMessage)}</p>`
      : '';
    const scoreBadge =
      typeof params.matchScore === 'number'
        ? `<p style="color:#5d5e60;font-size:13px;">AI match score: <strong>${params.matchScore}/100</strong></p>`
        : '';
    const pixel = params.openPixelUrl
      ? `<img src="${params.openPixelUrl}" width="1" height="1" alt="" style="display:block;border:0;" />`
      : '';
    const html = `
      <h1>${escapeHtml(params.companyName)} thinks you're a great fit</h1>
      <p>Hi ${escapeHtml(params.candidateName || 'there')},</p>
      <p>${escapeHtml(introBy)} from <strong>${escapeHtml(params.companyName)}</strong> reviewed your profile and would love for you to apply for the <strong>${escapeHtml(params.jobTitle)}</strong> role.</p>
      ${scoreBadge}
      ${personal}
      <p>Open the role and, if it sounds like a fit, apply directly:</p>
      <a href="${ctaUrl}" style="display:inline-block;background:#F97316;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">View &amp; apply for ${escapeHtml(params.jobTitle)}</a>
      <p style="margin-top:24px;color:#5d5e60;font-size:13px;">You're receiving this because your Hirely profile matched a role at ${escapeHtml(params.companyName)}. To stop receiving match invites, set your profile visibility to "hidden" in your settings.</p>
      <p>- The Hirely Team</p>
      ${pixel}
    `;
    await sendInternal({
      to: params.to,
      subject: `${params.companyName} invited you to apply: ${params.jobTitle}`,
      html,
      replyTo: params.inviterEmail,
    });
  },

  async sendTicketCreatedEmail(params: {
    to: string;
    ticketId: string;
    subject: string;
    description: string;
  }): Promise<void> {
    const ticketUrl = `${config.FRONTEND_URL}/support/tickets/${params.ticketId}`;
    const html = `
      <h1>We received your support request</h1>
      <p>Thanks for reaching out — your ticket is in our queue and an admin will respond shortly.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 12px 6px 0;color:#5d5e60;font-size:12px;text-transform:uppercase;">Ticket #</td><td style="padding:6px 0;font-family:monospace;">${params.ticketId.slice(-8)}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#5d5e60;font-size:12px;text-transform:uppercase;">Subject</td><td style="padding:6px 0;"><strong>${escapeHtml(params.subject)}</strong></td></tr>
      </table>
      <p style="background:#fef3ec;padding:12px 16px;border-radius:8px;border-left:4px solid #ff6b00;white-space:pre-wrap;">${escapeHtml(params.description)}</p>
      <p>You'll get an email reply when we respond. You can also view the conversation:</p>
      <a href="${ticketUrl}" style="display:inline-block;background:#F97316;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">View ticket</a>
      <p style="margin-top:24px;">- The Hirely Support Team</p>
    `;
    await sendInternal({
      to: params.to,
      subject: `[Hirely Support] We've received your ticket — ${params.subject}`,
      html,
    });
  },

  async sendTicketReplyEmail(params: {
    to: string;
    ticketId: string;
    subject: string;
    replyMessage: string;
    replierEmail?: string;
  }): Promise<void> {
    const ticketUrl = `${config.FRONTEND_URL}/support/tickets/${params.ticketId}`;
    const fromBlock = params.replierEmail
      ? `<p style="color:#5d5e60;font-size:13px;">From <strong>${escapeHtml(params.replierEmail)}</strong> on the Hirely Support team:</p>`
      : '';
    const html = `
      <h1>New reply on your support ticket</h1>
      <p>Subject: <strong>${escapeHtml(params.subject)}</strong></p>
      ${fromBlock}
      <p style="background:#fef3ec;padding:12px 16px;border-radius:8px;border-left:4px solid #ff6b00;white-space:pre-wrap;">${escapeHtml(params.replyMessage)}</p>
      <p>Continue the conversation in your dashboard:</p>
      <a href="${ticketUrl}" style="display:inline-block;background:#F97316;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">Reply to this ticket</a>
      <p style="margin-top:24px;">- The Hirely Support Team</p>
    `;
    await sendInternal({
      to: params.to,
      subject: `[Hirely Support] New reply — ${params.subject}`,
      html,
    });
  },

  async sendTicketClosedEmail(params: {
    to: string;
    ticketId: string;
    subject: string;
    finalStatus: 'resolved' | 'closed';
    closedByEmail?: string;
  }): Promise<void> {
    const ticketUrl = `${config.FRONTEND_URL}/support/tickets/${params.ticketId}`;
    const headline =
      params.finalStatus === 'resolved'
        ? 'Your ticket has been marked as resolved'
        : 'Your ticket has been closed';
    const reopenBlock =
      params.finalStatus === 'resolved'
        ? '<p>If your issue is not actually resolved, just reply to this ticket and we\'ll re-open it.</p>'
        : '<p>If you still need help, please open a new ticket from your dashboard.</p>';
    const closerBlock = params.closedByEmail
      ? `<p style="color:#5d5e60;font-size:13px;">Closed by ${escapeHtml(params.closedByEmail)}.</p>`
      : '';
    const html = `
      <h1>${headline}</h1>
      <p>Subject: <strong>${escapeHtml(params.subject)}</strong></p>
      ${closerBlock}
      ${reopenBlock}
      <a href="${ticketUrl}" style="display:inline-block;background:#F97316;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">View ticket</a>
      <p style="margin-top:24px;">- The Hirely Support Team</p>
    `;
    await sendInternal({
      to: params.to,
      subject: `[Hirely Support] ${headline} — ${params.subject}`,
      html,
    });
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
