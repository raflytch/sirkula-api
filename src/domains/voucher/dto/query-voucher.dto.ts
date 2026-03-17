/**
 * @fileoverview Query voucher DTO
 * @description DTOs for querying and filtering vouchers
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../commons/dto/pagination.dto';

/**
 * Query voucher DTO
 * @description Pagination and filtering for voucher list
 */
export class QueryVoucherDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by UMKM ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  umkmId?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum points',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minPoints?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum points',
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxPoints?: number;

  @ApiPropertyOptional({
    description: 'Filter by UMKM category',
    example: 'Kuliner',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Search by voucher name',
    example: 'kopi',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Query my claims DTO
 * @description Query for user's claimed vouchers
 */
export class QueryMyClaimsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by claim status',
    enum: ['PENDING', 'USED', 'EXPIRED'],
    example: 'PENDING',
  })
  @IsOptional()
  @IsString()
  status?: 'PENDING' | 'USED' | 'EXPIRED';
}
