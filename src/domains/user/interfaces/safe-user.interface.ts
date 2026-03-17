/**
 * @fileoverview Safe user interface
 * @description User response interface without sensitive data
 */

import { UserRole } from '@prisma/client';

/**
 * Safe user response interface (without sensitive data)
 * @description Excludes password_hash from response
 * @remarks UMKM fields are only included when user role is UMKM
 */
export interface ISafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  googleId?: string | null;
  totalPoints: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // UMKM-specific fields (only present when role === 'UMKM')
  umkmName?: string | null;
  umkmDescription?: string | null;
  umkmLogoUrl?: string | null;
  umkmAddress?: string | null;
  umkmCategory?: string | null;
}
