import mongoose from 'mongoose';
import {
  User,
  SeekerProfile,
  EmploymentOfficialProfile,
} from '../../models/index.js';

/**
 * Resolve a friendly display name for a User. Looks up the role-specific
 * profile (SeekerProfile / EmploymentOfficialProfile) for first_name +
 * last_name; for users without a name profile (company members, admins) it
 * humanizes the email's local part — "alex.mercer@hirely.com" → "Alex Mercer".
 *
 * Falls back to the raw email if nothing else is available.
 */
function humanizeEmail(email: string): string {
  const local = (email ?? '').split('@')[0] ?? '';
  const parts = local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return parts.join(' ') || email || 'User';
}

export interface SenderInfo {
  _id: string;
  email?: string;
  role?: string;
  display_name: string;
}

/**
 * Enrich an array of TicketMessage-like documents (lean or hydrated) by
 * attaching display_name to each sender_id. Mutates and returns a plain copy
 * with the populated sender_id object replaced.
 */
export async function enrichMessageSenders<
  T extends { sender_id: unknown }
>(messages: T[]): Promise<Array<T & { sender_id: SenderInfo }>> {
  if (messages.length === 0) return messages as Array<T & { sender_id: SenderInfo }>;

  const senderIds = Array.from(
    new Set(
      messages
        .map((m) => extractSenderId(m.sender_id))
        .filter((id): id is string => Boolean(id))
    )
  );

  const users = await User.find({ _id: { $in: senderIds } })
    .select('_id email role first_name last_name seeker_profile_id official_profile_id')
    .lean();

  // Pull names from the role-specific profile in two parallel queries.
  const seekerProfileIds = users
    .filter((u) => u.role === 'job_seeker' && u.seeker_profile_id)
    .map((u) => u.seeker_profile_id!);
  const officialProfileIds = users
    .filter((u) => u.role === 'employment_official' && u.official_profile_id)
    .map((u) => u.official_profile_id!);

  const [seekers, officials] = await Promise.all([
    seekerProfileIds.length
      ? SeekerProfile.find({ _id: { $in: seekerProfileIds } })
          .select('_id first_name last_name')
          .lean()
      : Promise.resolve([] as Array<{ _id: mongoose.Types.ObjectId; first_name?: string; last_name?: string }>),
    officialProfileIds.length
      ? EmploymentOfficialProfile.find({ _id: { $in: officialProfileIds } })
          .select('_id first_name last_name')
          .lean()
      : Promise.resolve([] as Array<{ _id: mongoose.Types.ObjectId; first_name?: string; last_name?: string }>),
  ]);

  const seekersById = new Map(seekers.map((p) => [p._id.toString(), p]));
  const officialsById = new Map(officials.map((p) => [p._id.toString(), p]));

  const senderById = new Map<string, SenderInfo>();
  for (const u of users) {
    const userId = u._id.toString();
    let name = '';

    // Admins (and any other role) may have first_name/last_name set directly
    // on the User document — prefer those before falling through to
    // role-specific profile lookups.
    if (u.first_name || u.last_name) {
      name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    }

    if (!name && u.role === 'job_seeker' && u.seeker_profile_id) {
      const sp = seekersById.get(u.seeker_profile_id.toString());
      if (sp) name = `${sp.first_name ?? ''} ${sp.last_name ?? ''}`.trim();
    } else if (!name && u.role === 'employment_official' && u.official_profile_id) {
      const op = officialsById.get(u.official_profile_id.toString());
      if (op) name = `${op.first_name ?? ''} ${op.last_name ?? ''}`.trim();
    }

    if (!name) name = humanizeEmail(u.email ?? '');

    senderById.set(userId, {
      _id: userId,
      email: u.email,
      role: u.role,
      display_name: name,
    });
  }

  return messages.map((m) => {
    const id = extractSenderId(m.sender_id);
    const info = id
      ? senderById.get(id) ?? {
          _id: id,
          email: typeof m.sender_id === 'object' ? (m.sender_id as { email?: string })?.email : undefined,
          role: typeof m.sender_id === 'object' ? (m.sender_id as { role?: string })?.role : undefined,
          display_name: humanizeEmail(
            (typeof m.sender_id === 'object' ? (m.sender_id as { email?: string })?.email : '') ?? ''
          ),
        }
      : ({
          _id: '',
          display_name: 'User',
        } as SenderInfo);
    return { ...(m as T), sender_id: info };
  }) as Array<T & { sender_id: SenderInfo }>;
}

export async function enrichMessageSender<T extends { sender_id: unknown }>(
  message: T
): Promise<T & { sender_id: SenderInfo }> {
  const [enriched] = await enrichMessageSenders([message]);
  return enriched;
}

function extractSenderId(sender: unknown): string | null {
  if (!sender) return null;
  if (typeof sender === 'string') return sender;
  if (typeof sender === 'object') {
    const obj = sender as { _id?: unknown; toString?: () => string };
    if (obj._id) return String(obj._id);
    if (sender instanceof mongoose.Types.ObjectId) return sender.toString();
  }
  return null;
}
