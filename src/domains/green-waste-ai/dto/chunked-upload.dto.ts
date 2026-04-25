/**
 * @fileoverview Chunked Upload DTOs
 * @description DTOs for initializing and uploading chunks for large file uploads
 */

import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  Matches,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for initializing a chunked upload session
 */
export class InitChunkedUploadDto {
  @ApiProperty({
    description: 'Original file name',
    example: 'green-action-proof.jpg',
  })
  @IsNotEmpty({ message: 'File name is required' })
  @IsString({ message: 'File name must be a string' })
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file (video only for chunked upload)',
    example: 'video/mp4',
  })
  @IsNotEmpty({ message: 'MIME type is required' })
  @IsString({ message: 'MIME type must be a string' })
  @Matches(/^video\//, {
    message: 'Chunked upload only supports video MIME types',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Total video size in bytes (>1.2MB and <=15MB)',
    example: 5242880,
    minimum: Math.floor(1.2 * 1024 * 1024) + 1,
    maximum: 15728640,
  })
  @IsNotEmpty({ message: 'Total size is required' })
  @IsInt({ message: 'Total size must be an integer' })
  @Min(Math.floor(1.2 * 1024 * 1024) + 1, {
    message: 'Video size must be greater than 1.2MB for chunked upload',
  })
  @Max(15 * 1024 * 1024, { message: 'Video size must not exceed 15MB' })
  totalSize: number;

  @ApiProperty({
    description: 'Total number of chunks to be uploaded',
    example: 5,
    minimum: 1,
    maximum: 40,
  })
  @IsNotEmpty({ message: 'Total chunks is required' })
  @IsInt({ message: 'Total chunks must be an integer' })
  @Min(1, { message: 'At least 1 chunk is required' })
  @Max(40, { message: 'Maximum 40 chunks allowed' })
  totalChunks: number;
}

/**
 * DTO for uploading a single chunk
 */
export class UploadChunkDto {
  @ApiProperty({
    description: 'Upload session ID from init endpoint',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty({ message: 'Upload ID is required' })
  @IsUUID('4', { message: 'Upload ID must be a valid UUID' })
  uploadId: string;

  @ApiProperty({
    description: 'Zero-based index of this chunk',
    example: 0,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'Chunk index is required' })
  @IsInt({ message: 'Chunk index must be an integer' })
  @Min(0, { message: 'Chunk index must be >= 0' })
  chunkIndex: number;

  @ApiProperty({
    description: 'Base64-encoded chunk data (max 512KB raw)',
    example: '/9j/4AAQSkZJRgABAQ...',
  })
  @IsNotEmpty({ message: 'Chunk data is required' })
  @IsString({ message: 'Chunk data must be a base64 string' })
  data: string;
}
