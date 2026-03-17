/**
 * @fileoverview Roles decorator for role-based access control
 * @description Decorator to specify required roles for protected routes
 */

import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for roles
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator
 * @param {...string[]} roles - Required roles for access
 * @returns {ReturnType<typeof SetMetadata>} Metadata decorator
 * @example
 * ```typescript
 * @Roles('ADMIN', 'DLH')
 * @Get('users')
 * async getUsers() {}
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
