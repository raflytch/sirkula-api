/**
 * @fileoverview Roles guard for role-based access control
 * @description Guard that checks user roles for protected routes
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Roles guard for RBAC
 * @implements CanActivate
 * @description Validates user role against required roles for route
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Initialize guard with reflector
   * @param {Reflector} reflector - NestJS reflector for metadata
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Check if user has required role
   * @param {ExecutionContext} context - Execution context
   * @returns {boolean} True if user has required role
   * @throws {ForbiddenException} If user lacks required role
   */
  canActivate(context: ExecutionContext): boolean {
    /**
     * Get required roles from decorator metadata
     */
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    /**
     * If no roles required, allow access
     */
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    /**
     * Get user from request (set by JwtAuthGuard)
     */
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    /**
     * Check if user role matches any required role
     */
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
