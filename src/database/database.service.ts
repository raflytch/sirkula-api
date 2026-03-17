/**
 * @fileoverview Database service using Prisma ORM
 * @description Extends PrismaClient for direct database access with lifecycle management
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Database service that extends Prisma Client
 * @extends PrismaClient
 * @implements OnModuleInit
 * @implements OnModuleDestroy
 */
@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * PostgreSQL connection pool
   */
  private pool: Pool;

  /**
   * Initialize Prisma Client with PostgreSQL adapter
   */
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [
        { emit: 'stdout', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    this.pool = pool;
  }

  /**
   * Connect to database when module initializes
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  /**
   * Disconnect from database when module is destroyed
   * @returns {Promise<void>}
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    console.log('🔌 Database disconnected');
  }
}
