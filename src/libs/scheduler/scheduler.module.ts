/**
 * @fileoverview Scheduler module
 * @description Global module for scheduled tasks across Indonesia timezones
 */

import { Global, Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

/**
 * Global Scheduler module
 * @description Exports SchedulerService for use across all modules
 */
@Global()
@Module({
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
