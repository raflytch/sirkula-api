/**
 * @fileoverview Response interceptor for standardizing API responses
 * @description Transforms all responses to format: { statusCode, message, data, meta? }
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { IApiResponse } from '../intefaces/response.interface';
import { IPaginationMeta } from '../intefaces/pagination.interface';

/**
 * Interface for paginated response data
 * @template T - Type of items in data array
 */
interface PaginatedData<T> {
  data: T[];
  meta: IPaginationMeta;
}

/**
 * Type guard to check if response is paginated
 * @template T - Type of items
 * @param {unknown} obj - Object to check
 * @returns {boolean} True if object has data array and meta
 */
function isPaginatedData<T>(obj: unknown): obj is PaginatedData<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj &&
    'meta' in obj &&
    Array.isArray((obj as PaginatedData<T>).data)
  );
}

/**
 * Response interceptor for standardizing API responses
 * @template T - Type of response data
 * @implements {NestInterceptor}
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  IApiResponse<T>
> {
  /**
   * Intercept and transform response to standard format
   * @param {ExecutionContext} context - Execution context
   * @param {CallHandler} next - Next handler
   * @returns {Observable<IApiResponse<T>>} Transformed response
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<IApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        const statusCode = response.statusCode;

        /**
         * If response already has correct format, return as is
         */
        if (
          typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          'data' in data
        ) {
          return data as IApiResponse<T>;
        }

        /**
         * If response is paginated, include meta
         */
        if (isPaginatedData<T>(data)) {
          return {
            statusCode,
            message: 'Success',
            data: data.data as unknown as T,
            meta: data.meta,
          };
        }

        /**
         * Default response wrapper
         */
        return {
          statusCode,
          message: 'Success',
          data: data as T,
        };
      }),
    );
  }
}
