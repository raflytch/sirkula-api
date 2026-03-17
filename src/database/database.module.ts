/**
 * @fileoverview Database module configuration
 * @description Global module that provides DatabaseService using Prisma ORM
 */

import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * Global database module
 * @description Exports DatabaseService for use across all modules
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
