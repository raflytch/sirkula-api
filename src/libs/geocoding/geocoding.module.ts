/**
 * @fileoverview Geocoding Module
 * @description Module for reverse geocoding services using OpenStreetMap
 */

import { Module } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';

/**
 * Geocoding Module
 * @description Provides geocoding services for location resolution
 */
@Module({
  providers: [GeocodingService],
  exports: [GeocodingService],
})
export class GeocodingModule {}
