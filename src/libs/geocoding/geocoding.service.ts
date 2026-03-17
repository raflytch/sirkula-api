/**
 * @fileoverview Reverse Geocoding Service
 * @description Service for converting coordinates to location information using OpenStreetMap Nominatim
 */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Interface for location information from reverse geocoding
 */
export interface ILocationInfo {
  locationName: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Geocoding Service
 * @description Uses OpenStreetMap Nominatim API for reverse geocoding
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org';

  /**
   * Reverse geocode coordinates to location information
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {Promise<ILocationInfo>} Location information
   * @throws {Error} If reverse geocoding fails
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ILocationInfo> {
    try {
      this.logger.log(
        `Reverse geocoding coordinates: ${latitude}, ${longitude}`,
      );

      const response = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
          'accept-language': 'id', // Prefer Indonesian language
        },
        headers: {
          'User-Agent': 'Sirkula-App/1.0', // Required by Nominatim usage policy
        },
        timeout: 5000, // 5 second timeout
      });

      if (!response.data || !response.data.address) {
        throw new Error('Invalid response from Nominatim API');
      }

      const address = response.data.address;
      const displayName = response.data.display_name;

      // Extract location information from address components
      const locationInfo: ILocationInfo = {
        // Use the most specific location name available
        locationName:
          address.road ||
          address.neighbourhood ||
          address.suburb ||
          address.village ||
          address.town ||
          displayName.split(',')[0] ||
          'Unknown Location',

        // District/Kelurahan
        district:
          address.suburb ||
          address.neighbourhood ||
          address.village ||
          address.quarter ||
          undefined,

        // City
        city:
          address.city ||
          address.town ||
          address.municipality ||
          address.county ||
          undefined,

        // State/Province
        state: address.state || address.province || undefined,

        // Country
        country: address.country || undefined,
      };

      this.logger.log(`Successfully geocoded: ${JSON.stringify(locationInfo)}`);

      return locationInfo;
    } catch (error) {
      this.logger.error(
        `Reverse geocoding failed: ${error.message}`,
        error.stack,
      );

      // Return fallback location info if geocoding fails
      return {
        locationName: 'Unknown Location',
        district: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
      };
    }
  }

  /**
   * Validate coordinates
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {boolean} True if coordinates are valid
   */
  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    );
  }
}
