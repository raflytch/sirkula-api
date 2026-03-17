/**
 * @fileoverview Webhook authentication guard
 * @description Guard for validating x-sha-key header for webhook endpoints
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AppConfigService } from '../../config/config.service';

/**
 * Webhook authentication guard
 * @description Validates x-sha-key header against SHA_WEBHOOK_SECRET env variable
 */
@Injectable()
export class WebhookGuard implements CanActivate {
  constructor(private readonly configService: AppConfigService) {}

  /**
   * Validate webhook request
   * @param {ExecutionContext} context - Execution context
   * @returns {boolean} True if valid, throws UnauthorizedException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const shaKey = request.headers['x-sha-key'] as string;

    const expectedSecret = this.configService.shaWebhookSecret;

    if (!expectedSecret) {
      throw new UnauthorizedException(
        'Webhook secret not configured on server',
      );
    }

    if (!shaKey) {
      throw new UnauthorizedException('Missing x-sha-key header');
    }

    if (shaKey !== expectedSecret) {
      throw new UnauthorizedException('Invalid x-sha-key');
    }

    return true;
  }
}
