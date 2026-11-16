import { PaginationMeta } from '../types/index.js';

export interface PaginationQueryOptions {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 1 | -1;
  search?: string;
}

export const getPaginationParams = (
  query: Record<string, unknown>,
  defaultSortBy = 'createdAt',
  defaultSortOrder: 1 | -1 = -1
): PaginationQueryOptions => {
  const page = Math.max(1, parseInt(String(query.page || 1), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20), 10) || 20));
  const skip = (page - 1) * limit;

  const sortBy = typeof query.sortBy === 'string' && query.sortBy.trim() ? query.sortBy.trim() : defaultSortBy;
  const rawOrder = String(query.sortOrder || '').toLowerCase();
  const sortOrder: 1 | -1 = rawOrder === 'asc' || rawOrder === '1' ? 1 : defaultSortOrder;

  const search = typeof query.search === 'string' && query.search.trim() ? query.search.trim() : undefined;

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    search
  };
};

export const getPaginationMeta = (
  totalRecords: number,
  page: number,
  limit: number
): PaginationMeta => {
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  return {
    page,
    limit,
    totalRecords,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};
