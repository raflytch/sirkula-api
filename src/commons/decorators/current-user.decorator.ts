/**
 * @fileoverview Current user decorator
 * @description Decorator to extract current user from request
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Current user decorator
 * @description Extracts authenticated user from request object
 * @returns {any} Current user from JWT payload
 * @example
 * ```typescript
 * @Get('profile')
 * async getProfile(@CurrentUser() user: JwtPayload) {
 *   return this.userService.getProfile(user.sub);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
