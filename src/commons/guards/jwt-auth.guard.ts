/**
 * @fileoverview JWT authentication guard
 * @description Guard that validates JWT tokens for protected routes
 */

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT authentication guard
 * @extends AuthGuard
 * @description Validates JWT tokens using Passport JWT strategy
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Determine if request can proceed
   * @param {ExecutionContext} context - Execution context
   * @returns {boolean | Promise<boolean> | Observable<boolean>} Authorization result
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  /**
   * Handle request after JWT validation
   * @param {Error} err - Error from JWT validation
   * @param {any} user - Decoded user from JWT
   * @param {any} info - Additional info from Passport
   * @returns {any} User object if valid
   * @throws {UnauthorizedException} If JWT is invalid or expired
   */
  handleRequest<TUser = any>(err: Error, user: TUser, _info: any): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
