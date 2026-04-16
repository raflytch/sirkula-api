/**
 * @fileoverview Chunked Upload DTOs
 * @description DTOs for initializing and uploading chunks for large file uploads
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

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
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  @IsNotEmpty({ message: 'MIME type is required' })
  @IsString({ message: 'MIME type must be a string' })
  mimeType: string;

  @ApiProperty({
    description: 'Total file size in bytes',
    example: 5242880,
    minimum: 1,
    maximum: 10485760,
  })
  @IsNotEmpty({ message: 'Total size is required' })
  @IsInt({ message: 'Total size must be an integer' })
  @Min(1, { message: 'Total size must be at least 1 byte' })
  @Max(10 * 1024 * 1024, { message: 'Total size must not exceed 10MB' })
  totalSize: number;

  @ApiProperty({
    description: 'Total number of chunks to be uploaded',
    example: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsNotEmpty({ message: 'Total chunks is required' })
  @IsInt({ message: 'Total chunks must be an integer' })
  @Min(1, { message: 'At least 1 chunk is required' })
  @Max(20, { message: 'Maximum 20 chunks allowed' })
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
    description: 'Base64-encoded chunk data (max ~1MB raw)',
    example: '/9j/4AAQSkZJRgABAQ...',
  })
  @IsNotEmpty({ message: 'Chunk data is required' })
  @IsString({ message: 'Chunk data must be a base64 string' })
  data: string;
}
