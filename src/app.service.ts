/**
 * @fileoverview Main application service for Sirkula
 * @description Provides core application information and health checks
 */

import { Injectable } from '@nestjs/common';

/**
 * Interface representing application information
 */
export interface IAppInfo {
  name: string;
  tagline: string;
  version: string;
  description: string;
  apiDocs: string;
}

@Injectable()
export class AppService {
  /**
   * Get basic application information
   * @returns {IAppInfo} Application info object
   */
  getAppInfo(): IAppInfo {
    return {
      name: 'Sirkula',
      tagline: 'Sense Every Action, Reward Every Impact',
      version: '1.0.0',
      description:
        'Platform untuk mendorong aksi hijau di masyarakat dengan memberikan reward berupa voucher dari UMKM lokal.',
      apiDocs: '/api-docs',
    };
  }
}
