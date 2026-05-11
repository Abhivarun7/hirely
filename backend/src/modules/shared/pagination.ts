export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function parsePageParam(param: string | undefined, defaultValue: number = 1): number {
  const parsed = parseInt(param || '', 10);
  return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
}

export function parseLimitParam(param: string | undefined, defaultValue: number = 20, max: number = 100): number {
  const parsed = parseInt(param || '', 10);
  if (isNaN(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, max);
}