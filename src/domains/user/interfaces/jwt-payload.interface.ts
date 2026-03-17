/**
 * @fileoverview JWT payload interface
 * @description Interface for JWT token payload structure
 */

/**
 * JWT payload interface for authenticated requests
 */
export interface IJwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
