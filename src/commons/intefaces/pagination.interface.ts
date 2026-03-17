/**
 * @fileoverview Pagination interfaces for standardized API responses
 * @description Provides interfaces for pagination metadata, options, and results
 */

/**
 * Pagination metadata interface
 * @description Contains information about the current page and total records
 */
export interface IPaginationMeta {
  /**
   * Total number of items without pagination
   */
  total: number;

  /**
   * Current page number (1-based)
   */
  page: number;

  /**
   * Number of items per page
   */
  limit: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Whether there is a previous page
   */
  hasPreviousPage: boolean;

  /**
   * Whether there is a next page
   */
  hasNextPage: boolean;
}

/**
 * Pagination options interface
 * @description Options for querying paginated data
 */
export interface IPaginationOptions {
  /**
   * Page number to retrieve (1-based)
   * @default 1
   */
  page?: number;

  /**
   * Number of items per page
   * @default 10
   */
  limit?: number;

  /**
   * Field to sort by
   * @example 'created_at', 'name'
   */
  sortBy?: string;

  /**
   * Sort order direction
   */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result interface
 * @template T - Type of items in the data array
 * @description Contains data array and pagination metadata
 */
export interface IPaginatedResult<T> {
  /**
   * Array of queried data
   */
  data: T[];

  /**
   * Pagination metadata
   */
  meta: IPaginationMeta;
}
