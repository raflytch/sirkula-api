/**
 * @fileoverview Pagination helper functions
 * @description Utility functions for creating pagination metadata and results
 */

import {
  IPaginatedResult,
  IPaginationMeta,
  IPaginationOptions,
} from '../intefaces/pagination.interface';

/**
 * Create pagination metadata from query results
 * @param {number} total - Total number of items without pagination
 * @param {IPaginationOptions} options - Pagination options used in query
 * @returns {IPaginationMeta} Pagination metadata object
 */
export function createPaginationMeta(
  total: number,
  options: IPaginationOptions,
): IPaginationMeta {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

/**
 * Create complete paginated result with data and meta
 * @template T - Type of items in data array
 * @param {T[]} data - Array of queried data
 * @param {number} total - Total number of items without pagination
 * @param {IPaginationOptions} options - Pagination options used in query
 * @returns {IPaginatedResult<T>} Complete paginated result
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  options: IPaginationOptions,
): IPaginatedResult<T> {
  return {
    data,
    meta: createPaginationMeta(total, options),
  };
}

/**
 * Convert pagination options to Prisma query options
 * @param {IPaginationOptions} options - Pagination options from DTO
 * @returns {object} Object with skip, take, and orderBy for Prisma
 */
export function toPrismaQueryOptions(options: IPaginationOptions) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const sortBy = options.sortBy ?? 'created_at';
  const sortOrder = options.sortOrder ?? 'desc';

  return {
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
  };
}
