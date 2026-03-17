/**
 * @fileoverview Prisma Database Seed
 * @description Seeds the database with initial DLH and ADMIN accounts
 */

import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create PostgreSQL pool with adapter (same as DatabaseService)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Seed data for DLH and ADMIN users
 */
const seedUsers = [
  {
    email: 'admin@sirkula.id',
    name: 'System Administrator',
    password: 'Admin123456',
    role: UserRole.ADMIN,
  },
  {
    email: 'dlh@sirkula.id',
    name: 'Dinas Lingkungan Hidup',
    password: 'Dlh123456',
    role: UserRole.DLH,
  },
];

/**
 * Hash password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
async function hashPassword(password: string): Promise<string> {
  const SALT_ROUNDS = 12;
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  for (const userData of seedUsers) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(
        `⏭️  User with email ${userData.email} already exists. Skipping...`,
      );
      continue;
    }

    // Hash password and create user
    const passwordHash = await hashPassword(userData.password);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password_hash: passwordHash,
        role: userData.role,
        is_email_verified: true, // Pre-verified for seed accounts
        is_active: true,
      },
    });

    console.log(`✅ Created ${userData.role} user:`);
    console.log(`   📧 Email: ${userData.email}`);
    console.log(`   🔑 Password: ${userData.password}`);
    console.log(`   👤 Name: ${userData.name}`);
    console.log(`   🆔 ID: ${user.id}\n`);
  }

  console.log('✨ Database seed completed successfully!');
  console.log('\n📋 Summary of seed accounts:');
  console.log('─'.repeat(50));

  for (const userData of seedUsers) {
    console.log(`   ${userData.role}:`);
    console.log(`   - Email: ${userData.email}`);
    console.log(`   - Password: ${userData.password}\n`);
  }

  console.log('⚠️  Please change these default passwords in production!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
