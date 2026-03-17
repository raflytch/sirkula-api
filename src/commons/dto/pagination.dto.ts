/**
 * @fileoverview Pagination DTO for query parameters
 * @description Reusable DTO for pagination across all domains
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Sort order enum
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Pagination DTO for request query parameters
 * @description Used as query parameter in controllers
 */
export class PaginationDto {
  /**
   * Page number (1-based)
   * @default 1
   */
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  /**
   * Number of items per page
   * @default 10
   * @minimum 1
   * @maximum 100
   */
  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 10;

  /**
   * Field to sort by
   * @default 'created_at'
   */
  @ApiPropertyOptional({
    description: 'Field to sort by',
    default: 'created_at',
    example: 'created_at',
  })
  @IsOptional()
  @IsString({ message: 'SortBy must be a string' })
  sortBy?: string = 'created_at';

  /**
   * Sort order direction
   * @default 'desc'
   */
  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'SortOrder must be asc or desc' })
  sortOrder?: SortOrder = SortOrder.DESC;

  /**
   * Get offset for database query
   * @returns {number} Skip value = (page - 1) * limit
   */
  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 10);
  }

  /**
   * Get take value for database query
   * @returns {number} Same as limit
   */
  get take(): number {
    return this.limit ?? 10;
  }
}
