/**
 * @fileoverview User module configuration
 * @description Module that provides user-related services, repository, and controller
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { JwtStrategy } from '../../commons/strategies/jwt.strategy';
import { GoogleStrategy } from '../../commons/strategies/google.strategy';

/**
 * User module
 * @description Configures authentication and user management
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository, JwtStrategy, GoogleStrategy],
  exports: [UserService, UserRepository],
})
export class UserModule {}
