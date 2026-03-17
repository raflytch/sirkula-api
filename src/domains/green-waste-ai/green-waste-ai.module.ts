/**
 * @fileoverview Green Waste AI Module
 * @description Module for green action management with AI verification
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GreenWasteAiController } from './green-waste-ai.controller';
import { GreenWasteAiService } from './green-waste-ai.service';
import { GreenWasteAiRepository } from './green-waste-ai.repository';
import { GeocodingModule } from '../../libs/geocoding/geocoding.module';

/**
 * Green Waste AI Module
 * @description Provides green action CRUD operations with AI verification
 */
@Module({
  imports: [
    /**
     * Configure Multer for file uploads
     * Uses memory storage for processing before Cloudinary upload
     */
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max (for videos)
      },
    }),
    GeocodingModule,
  ],
  controllers: [GreenWasteAiController],
  providers: [GreenWasteAiService, GreenWasteAiRepository],
  exports: [GreenWasteAiService],
})
export class GreenWasteAiModule {}
