/**
 * @fileoverview Voucher controller
 * @description REST API endpoints for voucher operations
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { RolesGuard } from '../../commons/guards/roles.guard';
import { Roles } from '../../commons/decorators/roles.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { JwtPayload } from '../../commons/strategies/jwt.strategy';
import { VoucherService } from './voucher.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  QueryVoucherDto,
  QueryMyClaimsDto,
} from './dto';

/**
 * Voucher controller
 * @description Handles voucher CRUD and redemption endpoints
 */
@ApiTags('Vouchers')
@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  /**
   * Get all vouchers (public)
   * @param {QueryVoucherDto} query - Query parameters
   * @returns {Promise<object>} Paginated vouchers
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all vouchers',
    description: 'Get paginated list of active vouchers (public)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vouchers retrieved' })
  async getAllVouchers(@Query() query: QueryVoucherDto) {
    const result = await this.voucherService.getAllVouchers(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Vouchers retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get voucher by ID (public)
   * @param {string} id - Voucher ID
   * @returns {Promise<object>} Voucher details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get voucher by ID',
    description: 'Get voucher details (public)',
  })
  @ApiParam({ name: 'id', description: 'Voucher UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Voucher retrieved' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Voucher not found',
  })
  async getVoucherById(@Param('id', ParseUUIDPipe) id: string) {
    const voucher = await this.voucherService.getVoucherById(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Voucher retrieved successfully',
      data: voucher,
    };
  }

  /**
   * Create voucher (UMKM only)
   * @param {JwtPayload} user - Current user
   * @param {CreateVoucherDto} dto - Voucher data
   * @param {Express.Multer.File} file - Optional image
   * @returns {Promise<object>} Created voucher
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('UMKM')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Create voucher (UMKM)',
    description: 'Create new voucher',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'name',
        'description',
        'pointsRequired',
        'discountType',
        'discountValue',
        'quotaTotal',
        'validFrom',
        'validUntil',
      ],
      properties: {
        name: { type: 'string', example: 'Diskon 20% Kopi Lokal' },
        description: {
          type: 'string',
          example: 'Diskon untuk semua produk kopi',
        },
        pointsRequired: { type: 'integer', example: 100 },
        discountType: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
        discountValue: { type: 'integer', example: 20 },
        quotaTotal: { type: 'integer', example: 50 },
        validFrom: { type: 'string', format: 'date-time' },
        validUntil: { type: 'string', format: 'date-time' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Voucher created' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'UMKM role required',
  })
  async createVoucher(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVoucherDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const voucher = await this.voucherService.createVoucher(
      user.sub,
      dto,
      file,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Voucher created successfully',
      data: voucher,
    };
  }

  /**
   * Get my vouchers (UMKM only)
   * @param {JwtPayload} user - Current user
   * @param {QueryVoucherDto} query - Query parameters
   * @returns {Promise<object>} UMKM's vouchers
   */
  @Get('umkm/my-vouchers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('UMKM')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get my vouchers (UMKM)',
    description: 'Get UMKM own vouchers',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vouchers retrieved' })
  async getMyVouchers(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryVoucherDto,
  ) {
    const result = await this.voucherService.getMyVouchers(user.sub, query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Vouchers retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get UMKM stats (UMKM only)
   * @param {JwtPayload} user - Current user
   * @returns {Promise<object>} UMKM statistics
   */
  @Get('umkm/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('UMKM')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get UMKM stats',
    description: 'Get UMKM voucher statistics',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stats retrieved' })
  async getUmkmStats(@CurrentUser() user: JwtPayload) {
    const stats = await this.voucherService.getUmkmStats(user.sub);
    return {
      statusCode: HttpStatus.OK,
      message: 'Statistics retrieved successfully',
      data: stats,
    };
  }

  /**
   * Get UMKM claims (UMKM only)
   * @param {JwtPayload} user - Current user
   * @param {string} voucherId - Optional voucher filter
   * @param {QueryMyClaimsDto} query - Query parameters
   * @returns {Promise<object>} Claims on UMKM vouchers
   */
  @Get('umkm/claims')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('UMKM')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get UMKM claims',
    description: 'Get claims on UMKM vouchers',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Claims retrieved' })
  async getUmkmClaims(
    @CurrentUser() user: JwtPayload,
    @Query('voucherId') voucherId: string | undefined,
    @Query() query: QueryMyClaimsDto,
  ) {
    const result = await this.voucherService.getUmkmClaims(
      user.sub,
      voucherId,
      query,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Claims retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Use voucher claim (WARGA only)
   * @param {JwtPayload} user - Current user
   * @param {string} claimId - Claim ID
   * @returns {Promise<object>} Used claim
   */
  @Post('warga/claims/:claimId/use')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Use voucher claim (WARGA)',
    description: 'Mark claimed voucher as used',
  })
  @ApiParam({ name: 'claimId', description: 'Claim UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Voucher used successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Voucher already used or expired',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not your voucher claim',
  })
  async useVoucher(
    @CurrentUser() user: JwtPayload,
    @Param('claimId', ParseUUIDPipe) claimId: string,
  ) {
    const claim = await this.voucherService.useVoucher(claimId, user.sub);
    return {
      statusCode: HttpStatus.OK,
      message: 'Voucher used successfully',
      data: claim,
    };
  }

  /**
   * Update voucher (UMKM owner only)
   * @param {JwtPayload} user - Current user
   * @param {string} id - Voucher ID
   * @param {UpdateVoucherDto} dto - Update data
   * @param {Express.Multer.File} file - Optional new image
   * @returns {Promise<object>} Updated voucher
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('UMKM')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Update voucher (UMKM)',
    description: 'Update own voucher',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Voucher UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Voucher updated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not owner' })
  async updateVoucher(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const voucher = await this.voucherService.updateVoucher(
      id,
      user.sub,
      dto,
      file,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Voucher updated successfully',
      data: voucher,
    };
  }

  /**
   * Delete voucher (UMKM owner only)
   * @param {JwtPayload} user - Current user
   * @param {string} id - Voucher ID
   * @returns {Promise<object>} Deletion confirmation
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('UMKM')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete voucher (UMKM)',
    description: 'Delete own voucher',
  })
  @ApiParam({ name: 'id', description: 'Voucher UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Voucher deleted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not owner' })
  async deleteVoucher(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.voucherService.deleteVoucher(id, user.sub);
    return {
      statusCode: HttpStatus.OK,
      message: 'Voucher deleted successfully',
    };
  }

  /**
   * Redeem voucher (WARGA only)
   * @param {JwtPayload} user - Current user
   * @param {string} id - Voucher ID
   * @returns {Promise<object>} Claim details
   */
  @Post(':id/redeem')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Redeem voucher (WARGA)',
    description: 'Redeem voucher with points',
  })
  @ApiParam({ name: 'id', description: 'Voucher UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Voucher redeemed' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Insufficient points',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'WARGA role required',
  })
  async redeemVoucher(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const claim = await this.voucherService.redeemVoucher(user.sub, id);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Voucher redeemed successfully',
      data: claim,
    };
  }

  /**
   * Get my claims (WARGA only)
   * @param {JwtPayload} user - Current user
   * @param {QueryMyClaimsDto} query - Query parameters
   * @returns {Promise<object>} User's claims
   */
  @Get('warga/my-claims')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get my claims (WARGA)',
    description: 'Get user claimed vouchers',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Claims retrieved' })
  async getMyClaims(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryMyClaimsDto,
  ) {
    const result = await this.voucherService.getMyClaims(user.sub, query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Claims retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get my voucher stats (WARGA only)
   * @param {JwtPayload} user - Current user
   * @returns {Promise<object>} User statistics
   */
  @Get('warga/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('WARGA')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get my stats (WARGA)',
    description: 'Get user voucher statistics',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stats retrieved' })
  async getMyStats(@CurrentUser() user: JwtPayload) {
    const stats = await this.voucherService.getUserStats(user.sub);
    return {
      statusCode: HttpStatus.OK,
      message: 'Statistics retrieved successfully',
      data: stats,
    };
  }
}
