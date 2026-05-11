import { z } from 'zod';

const latLngRefinement = (
  data: { latitude?: number; longitude?: number }
): boolean => {
  const hasLat = data.latitude != null;
  const hasLng = data.longitude != null;
  return hasLat === hasLng;
};

const createBody = z
  .object({
    email: z.string().email().max(255),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    designation: z.string().min(1).max(150),
    phone: z.string().max(20).optional(),
    email_alt: z.string().email().max(255).optional(),
    employee_code: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    search_radius_km: z.coerce.number().min(1).max(1000).default(100),
    avatar_url: z.string().max(1024).optional(),
  })
  .refine(latLngRefinement, {
    message: 'latitude and longitude must be provided together',
    path: ['latitude'],
  });

const updateBody = z
  .object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    designation: z.string().min(1).max(150).optional(),
    phone: z.string().max(20).optional(),
    email_alt: z.string().email().max(255).optional(),
    employee_code: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    search_radius_km: z.coerce.number().min(1).max(1000).optional(),
    avatar_url: z.string().max(1024).optional(),
  })
  .refine(latLngRefinement, {
    message: 'latitude and longitude must be provided together',
    path: ['latitude'],
  });

const listQuery = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
  city: z.string().optional(),
});

const officialIdParams = z.object({ officialId: z.string().min(1) });

export const createOfficialSchema = { body: createBody };
export const updateOfficialSchema = { body: updateBody, params: officialIdParams };
export const listOfficialsSchema = { query: listQuery };
export const officialIdSchema = { params: officialIdParams };

export type CreateOfficialInput = z.infer<typeof createBody>;
export type UpdateOfficialInput = z.infer<typeof updateBody>;
