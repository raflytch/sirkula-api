/**
 * @fileoverview Create Green Action DTO
 * @description DTO for creating a new green action with AI verification
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  GreenActionCategory,
  GreenCommunitySubCategory,
  GreenConsumptionSubCategory,
  GreenHomeSubCategory,
  GreenWasteSubCategory,
} from '../enums/green-action.enum';

/**
 * DTO for creating a new green action
 * @description Validates input data for green action creation
 */
export class CreateGreenActionDto {
  /**
   * Main category of the green action
   * @example "PILAH_SAMPAH"
   */
  @ApiProperty({
    description: 'Kategori utama aksi hijau',
    enum: GreenActionCategory,
    example: GreenActionCategory.PILAH_SAMPAH,
  })
  @IsNotEmpty({ message: 'Category is required' })
  @IsEnum(GreenActionCategory, { message: 'Invalid green action category' })
  category: GreenActionCategory;

  /**
   * Sub-category of the green action
   * @example "SAMPAH_ORGANIK"
   */
  @ApiProperty({
    description: 'Sub-kategori aksi hijau',
    example: 'SAMPAH_ORGANIK',
  })
  @IsNotEmpty({ message: 'Sub-category is required' })
  @IsString({ message: 'Sub-category must be a string' })
  subCategory: string;

  /**
   * Optional description of the action
   * @example "I sorted organic and inorganic waste at home"
   */
  @ApiPropertyOptional({
    description: 'Optional description of the action',
    example: 'I sorted organic and inorganic waste at home',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  /**
   * Quantity of the action (e.g. weight in kg, number of items, number of trees)
   * @example 5.5
   */
  @ApiProperty({
    description: 'Kuantitas aksi (misal: berat dalam kg, jumlah item)',
    example: 5.5,
    minimum: 0.01,
  })
  @IsNotEmpty({ message: 'Quantity is required' })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0.01, { message: 'Quantity must be greater than 0' })
  quantity: number;

  /**
   * Optional action type for more detail (e.g. "kg", "pohon", "item")
   * @example "kg"
   */
  @ApiPropertyOptional({
    description: 'Tipe aksi / satuan (misal: kg, pohon, item)',
    example: 'kg',
  })
  @IsOptional()
  @IsString({ message: 'Action type must be a string' })
  actionType?: string;

  /**
   * Latitude coordinate for map pinpoint (required for reverse geocoding)
   * @example -6.2
   */
  @ApiProperty({
    description: 'Latitude coordinate (-90 to 90)',
    example: -6.2,
    minimum: -90,
    maximum: 90,
  })
  @IsNotEmpty({ message: 'Latitude is required' })
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude: number;

  /**
   * Longitude coordinate for map pinpoint (required for reverse geocoding)
   * @example 106.816666
   */
  @ApiProperty({
    description: 'Longitude coordinate (-180 to 180)',
    example: 106.816666,
    minimum: -180,
    maximum: 180,
  })
  @IsNotEmpty({ message: 'Longitude is required' })
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude: number;

  /**
   * Upload ID from chunked upload session (alternative to direct file upload).
   * Use this only for video uploads larger than 1.2MB
   * that were uploaded through chunked endpoints.
   */
  @ApiPropertyOptional({
    description:
      'Upload ID dari chunked upload (khusus video >1.2MB sampai 15MB, chunk 512KB)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID('4', { message: 'mediaUploadId must be a valid UUID' })
  mediaUploadId?: string;
}

/**
 * DTO for Pilah Sampah action creation
 * @description Specific DTO for Pilah Sampah category
 */
export class CreateGreenWasteActionDto extends CreateGreenActionDto {
  /**
   * Sub-category for Pilah Sampah
   */
  @ApiProperty({
    description: 'Sub-kategori Pilah Sampah',
    enum: GreenWasteSubCategory,
    example: GreenWasteSubCategory.SAMPAH_ORGANIK,
  })
  @IsNotEmpty({ message: 'Sub-category is required' })
  @IsEnum(GreenWasteSubCategory, {
    message: 'Invalid Pilah Sampah sub-category',
  })
  declare subCategory: GreenWasteSubCategory;
}

/**
 * DTO for Green Home action creation
 * @description Specific DTO for Green Home category
 */
export class CreateGreenHomeActionDto extends CreateGreenActionDto {
  /**
   * Sub-category for Green Home
   */
  @ApiProperty({
    description: 'Sub-category for Green Home',
    enum: GreenHomeSubCategory,
    example: GreenHomeSubCategory.TANAM_POHON_BARU,
  })
  @IsNotEmpty({ message: 'Sub-category is required' })
  @IsEnum(GreenHomeSubCategory, { message: 'Invalid Green Home sub-category' })
  declare subCategory: GreenHomeSubCategory;
}

/**
 * DTO for Konsumsi Hijau action creation
 * @description Specific DTO for Konsumsi Hijau category
 */
export class CreateGreenConsumptionActionDto extends CreateGreenActionDto {
  /**
   * Sub-category for Konsumsi Hijau
   */
  @ApiProperty({
    description: 'Sub-kategori Konsumsi Hijau',
    enum: GreenConsumptionSubCategory,
    example: GreenConsumptionSubCategory.PRODUK_ORGANIK,
  })
  @IsNotEmpty({ message: 'Sub-category is required' })
  @IsEnum(GreenConsumptionSubCategory, {
    message: 'Invalid Konsumsi Hijau sub-category',
  })
  declare subCategory: GreenConsumptionSubCategory;
}

/**
 * DTO for Aksi Kolektif action creation
 * @description Specific DTO for Aksi Kolektif category
 */
export class CreateGreenCommunityActionDto extends CreateGreenActionDto {
  /**
   * Sub-category for Aksi Kolektif
   */
  @ApiProperty({
    description: 'Sub-kategori Aksi Kolektif',
    enum: GreenCommunitySubCategory,
    example: GreenCommunitySubCategory.KERJA_BAKTI,
  })
  @IsNotEmpty({ message: 'Sub-category is required' })
  @IsEnum(GreenCommunitySubCategory, {
    message: 'Invalid Aksi Kolektif sub-category',
  })
  declare subCategory: GreenCommunitySubCategory;
}
