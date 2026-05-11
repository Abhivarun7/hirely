import mongoose from 'mongoose';
import { TicketTemplate } from '../../models/index.js';

const DEFAULT_TEMPLATES: Array<{ name: string; content: string }> = [
  {
    name: 'Looking into this',
    content:
      "Thanks for reaching out — we've received your ticket and a teammate is looking into this now. We'll follow up shortly.",
  },
  {
    name: 'Need a screenshot',
    content:
      'Could you share a screenshot of what you\'re seeing? It would help us reproduce the issue and get to a fix faster.',
  },
  {
    name: 'Need more details',
    content:
      'To help us track this down, could you share: \n• What you were trying to do\n• What you expected to happen\n• What actually happened\n• The exact time it occurred (with timezone)',
  },
  {
    name: 'Issue reproduced',
    content:
      "We've reproduced the issue on our side and have flagged it for the engineering team. We'll keep you posted with updates here.",
  },
  {
    name: 'Marking resolved',
    content:
      'This should be working now. Please give it another try and let us know — we\'ll keep this open for 24 hours in case anything else comes up.',
  },
  {
    name: 'Closing — please open new ticket if needed',
    content:
      "We're closing this ticket since there hasn't been a reply for a while. If the issue comes back, please open a new ticket and we'll dig back in. Thanks!",
  },
];

export class TicketTemplateService {
  async list(activeOnly = false): Promise<unknown[]> {
    const query = activeOnly ? { is_active: true } : {};
    return TicketTemplate.find(query).sort({ name: 1 }).lean();
  }

  async create(input: { name: string; content: string; createdBy: string }): Promise<unknown> {
    const exists = await TicketTemplate.findOne({ name: input.name.trim() });
    if (exists) throw new Error('A template with this name already exists');
    const tpl = await TicketTemplate.create({
      name: input.name.trim(),
      content: input.content.trim(),
      is_active: true,
      created_by: new mongoose.Types.ObjectId(input.createdBy),
    });
    return tpl.toObject();
  }

  async update(
    id: string,
    input: { name?: string; content?: string; is_active?: boolean }
  ): Promise<unknown> {
    const tpl = await TicketTemplate.findById(id);
    if (!tpl) throw new Error('Template not found');
    if (input.name !== undefined) {
      const newName = input.name.trim();
      if (newName !== tpl.name) {
        const exists = await TicketTemplate.findOne({ name: newName, _id: { $ne: tpl._id } });
        if (exists) throw new Error('A template with this name already exists');
        tpl.name = newName;
      }
    }
    if (input.content !== undefined) tpl.content = input.content.trim();
    if (input.is_active !== undefined) tpl.is_active = input.is_active;
    await tpl.save();
    return tpl.toObject();
  }

  async remove(id: string): Promise<void> {
    const result = await TicketTemplate.deleteOne({ _id: id });
    if (result.deletedCount === 0) throw new Error('Template not found');
  }

  async seedDefaults(): Promise<{ added: number }> {
    let added = 0;
    for (const t of DEFAULT_TEMPLATES) {
      const exists = await TicketTemplate.findOne({ name: t.name });
      if (!exists) {
        await TicketTemplate.create({ ...t, is_active: true });
        added++;
      }
    }
    return { added };
  }
}

export const ticketTemplateService = new TicketTemplateService();
export default ticketTemplateService;
