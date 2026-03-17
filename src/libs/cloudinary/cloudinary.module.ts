/**
 * @fileoverview Cloudinary module configuration
 * @description Module for Cloudinary file upload service
 */

import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

/**
 * Cloudinary module
 * @description Global module providing Cloudinary upload services
 */
@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
