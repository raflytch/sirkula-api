/**
 * @fileoverview Main application controller
 * @description Provides root endpoint for application information
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService, IAppInfo } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Get application information
   * @returns {IAppInfo} Application info with name, tagline, version
   */
  @Get()
  @ApiOperation({
    summary: 'Get Application Info',
    description: 'Mendapatkan informasi dasar aplikasi Sirkula',
  })
  @ApiResponse({
    status: 200,
    description: 'Informasi aplikasi berhasil diambil',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Success' },
        data: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Sirkula' },
            tagline: {
              type: 'string',
              example: 'Sense Every Action, Reward Every Impact',
            },
            version: { type: 'string', example: '1.0.0' },
            description: { type: 'string' },
            apiDocs: { type: 'string', example: '/api-docs' },
          },
        },
      },
    },
  })
  getAppInfo(): IAppInfo {
    return this.appService.getAppInfo();
  }
}
