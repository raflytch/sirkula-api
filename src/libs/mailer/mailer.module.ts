/**
 * @fileoverview Mailer module configuration
 * @description Global module that provides MailerService for email OTP verification
 */

import { Global, Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

/**
 * Global Mailer module
 * @description Exports MailerService for use across all modules
 */
@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
