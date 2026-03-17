/**
 * @fileoverview JWT Passport strategy
 * @description Strategy for validating JWT tokens in requests
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/config.service';

/**
 * JWT payload interface
 * @description Structure of decoded JWT token
 */
export interface JwtPayload {
  /**
   * User ID (subject)
   */
  sub: string;

  /**
   * User email
   */
  email: string;

  /**
   * User role
   */
  role: string;

  /**
   * Token issued at timestamp
   */
  iat?: number;

  /**
   * Token expiration timestamp
   */
  exp?: number;
}

/**
 * JWT strategy for Passport
 * @extends PassportStrategy
 * @description Validates JWT tokens from Authorization header
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Initialize JWT strategy with configuration
   * @param {AppConfigService} configService - Configuration service
   */
  constructor(private readonly configService: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  /**
   * Validate JWT payload
   * @param {JwtPayload} payload - Decoded JWT payload
   * @returns {JwtPayload} Validated payload (attached to request.user)
   * @throws {UnauthorizedException} If payload is invalid
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
