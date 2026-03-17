/**
 * @fileoverview Voucher module
 * @description Module for voucher CRUD and redemption operations
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { VoucherRepository } from './voucher.repository';

/**
 * Voucher module
 * @description Provides voucher management for UMKM and redemption for WARGA
 */
@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [VoucherController],
  providers: [VoucherService, VoucherRepository],
  exports: [VoucherService],
})
export class VoucherModule {}
