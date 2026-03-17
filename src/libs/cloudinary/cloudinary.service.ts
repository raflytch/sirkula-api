/**
 * @fileoverview Cloudinary service for file uploads
 * @description Handles image and video upload operations to Cloudinary CDN
 */

import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { AppConfigService } from '../../config/config.service';

/**
 * Upload result interface
 * @description Standard response from Cloudinary uploads
 */
export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  resourceType: 'image' | 'video' | 'raw';
  duration?: number; // For videos
}

/**
 * Upload options interface
 * @description Options for customizing uploads
 */
export interface UploadOptions {
  folder?: string;
  transformation?: object;
  resourceType?: 'image' | 'video' | 'auto';
  maxFileSize?: number; // in bytes
}

/**
 * Cloudinary service
 * @description Service for managing file uploads to Cloudinary CDN
 */
@Injectable()
export class CloudinaryService implements OnModuleInit {
  /**
   * Default max file sizes
   */
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Allowed image MIME types
   */
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  /**
   * Allowed video MIME types
   */
  private readonly ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/mpeg',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
  ];

  /**
   * Initialize service with config
   * @param {AppConfigService} configService - Configuration service
   */
  constructor(private readonly configService: AppConfigService) {}

  /**
   * Configure Cloudinary on module initialization
   */
  onModuleInit(): void {
    cloudinary.config({
      cloud_name: this.configService.cloudinaryCloudName,
      api_key: this.configService.cloudinaryApiKey,
      api_secret: this.configService.cloudinaryApiSecret,
    });
  }

  /**
   * Upload image to Cloudinary
   * @param {Express.Multer.File} file - File from multer
   * @param {UploadOptions} options - Upload options
   * @returns {Promise<UploadResult>} Upload result with URL and metadata
   */
  async uploadImage(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    /**
     * Validate file type
     */
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    /**
     * Validate file size
     */
    const maxSize = options.maxFileSize || this.MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${maxSize / (1024 * 1024)}MB)`,
      );
    }

    return this.uploadToCloudinary(file, {
      ...options,
      resourceType: 'image',
    });
  }

  /**
   * Upload video to Cloudinary
   * @param {Express.Multer.File} file - File from multer
   * @param {UploadOptions} options - Upload options
   * @returns {Promise<UploadResult>} Upload result with URL and metadata
   */
  async uploadVideo(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    /**
     * Validate file type
     */
    if (!this.ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_VIDEO_TYPES.join(', ')}`,
      );
    }

    /**
     * Validate file size
     */
    const maxSize = options.maxFileSize || this.MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${maxSize / (1024 * 1024)}MB)`,
      );
    }

    return this.uploadToCloudinary(file, {
      ...options,
      resourceType: 'video',
    });
  }

  /**
   * Upload avatar image with optimized settings
   * @param {Express.Multer.File} file - File from multer
   * @returns {Promise<UploadResult>} Upload result
   */
  async uploadAvatar(file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadImage(file, {
      folder: 'sirkula/avatars',
      transformation: {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'webp',
      },
      maxFileSize: 5 * 1024 * 1024, // 5MB for avatars
    });
  }

  /**
   * Upload UMKM logo with optimized settings
   * @param {Express.Multer.File} file - File from multer
   * @returns {Promise<UploadResult>} Upload result
   */
  async uploadUmkmLogo(file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadImage(file, {
      folder: 'sirkula/umkm-logos',
      transformation: {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 'auto',
        format: 'webp',
      },
      maxFileSize: 5 * 1024 * 1024, // 5MB for logos
    });
  }

  /**
   * Upload green action proof image
   * @param {Express.Multer.File} file - File from multer
   * @returns {Promise<UploadResult>} Upload result
   */
  async uploadActionProof(file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadImage(file, {
      folder: 'sirkula/action-proofs',
      transformation: {
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto',
        format: 'webp',
      },
    });
  }

  /**
   * Upload green action video proof
   * @param {Express.Multer.File} file - File from multer
   * @returns {Promise<UploadResult>} Upload result
   */
  async uploadActionVideo(file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadVideo(file, {
      folder: 'sirkula/action-videos',
      transformation: {
        width: 1280,
        height: 720,
        crop: 'limit',
        quality: 'auto',
      },
    });
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Public ID of the file
   * @param {string} resourceType - Type of resource (image/video)
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Internal method to upload file to Cloudinary
   * @param {Express.Multer.File} file - File from multer
   * @param {UploadOptions} options - Upload options
   * @returns {Promise<UploadResult>} Upload result
   */
  private async uploadToCloudinary(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'sirkula',
          resource_type: options.resourceType || 'auto',
          transformation: options.transformation,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new BadRequestException(`Upload failed: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new BadRequestException('Upload failed: No result'));
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            resourceType: result.resource_type as 'image' | 'video' | 'raw',
            duration: result.duration,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
