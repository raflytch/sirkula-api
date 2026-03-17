/**
 * @fileoverview API response interfaces for standardized responses
 * @description Provides interfaces for consistent API response format
 */

import { IPaginationMeta } from './pagination.interface';

/**
 * Standard API response interface
 * @template T - Type of data in the response
 * @description All API responses follow this format
 */
export interface IApiResponse<T = any> {
  /**
   * HTTP status code
   * @example 200, 201, 400, 404, 500
   */
  statusCode: number;

  /**
   * Response message
   * @example 'Success', 'Created', 'Not found'
   */
  message: string;

  /**
   * Response data
   */
  data?: T;

  /**
   * Pagination metadata (only for paginated responses)
   */
  meta?: IPaginationMeta;
}

/**
 * Paginated API response interface
 * @template T - Type of items in the data array
 * @extends IApiResponse
 */
export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  /**
   * Array of data items
   */
  data: T[];

  /**
   * Pagination metadata (required)
   */
  meta: IPaginationMeta;
}
