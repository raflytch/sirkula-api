/**
 * @fileoverview Google OAuth Guard
 * @description Guard for Google OAuth authentication routes
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Google OAuth Guard
 * @description Triggers Google OAuth flow
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  /**
   * Allow the request to proceed through Google OAuth
   * @param {ExecutionContext} context - Execution context
   * @returns {Promise<boolean>} Whether to allow the request
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activate = (await super.canActivate(context)) as boolean;
    return activate;
  }
}
