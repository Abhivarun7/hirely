import { z } from 'zod';

const updateMeBody = z
  .object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    phone: z.string().max(20).optional(),
    email_alt: z.string().email().max(255).optional(),
    designation: z.string().min(1).max(150).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    avatar_url: z.string().max(1024).optional(),
  })
  .refine(
    (d) => (d.latitude == null) === (d.longitude == null),
    { message: 'latitude and longitude must be provided together', path: ['latitude'] }
  );

const nearbyJobsQuery = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  category_id: z.string().optional(),
});

const candidatesQuery = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  kind: z.enum(['all', 'registered', 'walk_in']).optional(),
});

const walkInBody = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  headline: z.string().max(255).optional(),
  bio: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

const pushBody = z.object({
  seeker_id: z.string().min(1),
  job_id: z.string().min(1),
  resume_id: z.string().min(1).optional(),
  push_note: z.string().max(2000).optional(),
});

const hiresQuery = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const idParams = z.object({ id: z.string().min(1) });

export const officialSchemas = {
  updateMe: { body: updateMeBody },
  nearbyJobs: { query: nearbyJobsQuery },
  candidates: { query: candidatesQuery },
  walkIn: { body: walkInBody },
  push: { body: pushBody },
  hires: { query: hiresQuery },
  candidateId: { params: idParams },
};

export type UpdateMeInput = z.infer<typeof updateMeBody>;
export type WalkInInput = z.infer<typeof walkInBody>;
export type PushInput = z.infer<typeof pushBody>;
