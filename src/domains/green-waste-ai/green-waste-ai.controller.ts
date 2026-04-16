/**
 * @fileoverview Green Waste AI Controller
 * @description Controller for green action endpoints with AI verification
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { RolesGuard } from '../../commons/guards/roles.guard';
import { Roles } from '../../commons/decorators/roles.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { JwtPayload } from '../../commons/strategies/jwt.strategy';
import { GreenWasteAiService } from './green-waste-ai.service';
import { GreenWasteAiReportService } from './green-waste-ai-report.service';
import { CreateGreenActionDto } from './dto/create-green-action.dto';
import {
  QueryGreenActionDto,
  AdminQueryGreenActionDto,
} from './dto/query-green-action.dto';

/**
 * Green Waste AI Controller
 * @description Handles all green action related HTTP requests
 */
@ApiTags('Green Actions')
@Controller('green-actions')
export class GreenWasteAiController {
  /**
   * Inject green waste AI service
   * @param {GreenWasteAiService} greenWasteAiService - Green waste AI service
   */
  constructor(
    private readonly greenWasteAiService: GreenWasteAiService,
    private readonly reportService: GreenWasteAiReportService,
  ) {}

  /**
   * Get categories and sub-categories info (public endpoint)
   * @returns {Promise<object>} Categories information
   */
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get categories info',
    description: 'Get all available categories and sub-categories (public)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories info retrieved successfully',
  })
  async getCategoriesInfo() {
    const categories = {
      PILAH_SAMPAH: {
        name: 'Pilah & Olah Sampah',
        description: 'Memilah dan mengolah sampah dengan benar',
        subCategories: [
          {
            id: 'SAMPAH_ORGANIK',
            name: 'Pilah Sampah Organik',
            description: 'Memilah sampah organik/biodegradable',
            criteria:
              'Minimal 2 jenis sampah terdeteksi, tempat sampah terlihat',
            basePoints: 50,
          },
          {
            id: 'SAMPAH_ANORGANIK',
            name: 'Pilah Sampah Anorganik Daur Ulang',
            description:
              'Memilah sampah anorganik yang dapat didaur ulang (plastik, kertas, logam)',
            criteria: 'Minimal 2 jenis sampah anorganik, wadah terpisah',
            basePoints: 50,
          },
          {
            id: 'SAMPAH_B3',
            name: 'Penanganan Sampah Berbahaya (B3)',
            description:
              'Menangani sampah berbahaya (baterai, lampu, obat kedaluwarsa)',
            criteria: 'Barang berbahaya terdeteksi, wadah khusus terlihat',
            basePoints: 70,
          },
        ],
      },
      TANAM_POHON: {
        name: 'Tanam Pohon & Area Hijau',
        description: 'Menanam pohon dan membuat area hijau di rumah',
        subCategories: [
          {
            id: 'TANAM_POHON_BARU',
            name: 'Tanam Pohon/Tanaman Baru',
            description: 'Menanam pohon atau tanaman baru',
            criteria: 'Aktivitas menanam terlihat, tanaman/bibit terdeteksi',
            basePoints: 60,
            bonus: 'Perbandingan sebelum-sesudah: +20 poin',
          },
          {
            id: 'URBAN_FARMING',
            name: 'Urban Farming',
            description: 'Menanam sayuran dalam pot atau hidroponik kecil',
            criteria: 'Kebun urban/setup hidroponik terlihat',
            basePoints: 50,
          },
          {
            id: 'GREEN_CORNER',
            name: 'Mini Green Corner',
            description: 'Membuat sudut hijau mini di rumah',
            criteria: 'Ruang khusus hijau dengan beberapa tanaman',
            basePoints: 40,
          },
        ],
      },
      KONSUMSI_HIJAU: {
        name: 'Produk Organik/Ramah Lingkungan',
        description: 'Menggunakan produk organik atau ramah lingkungan',
        subCategories: [
          {
            id: 'PRODUK_ORGANIK',
            name: 'Produk Organik',
            description: 'Membeli produk organik (sabun, skincare, makanan)',
            criteria: 'Produk organik terlihat, kemasan ramah lingkungan',
            basePoints: 30,
            bonus: 'Produk UMKM terdeteksi: +10 poin',
          },
          {
            id: 'REFILL_STATION',
            name: 'Refill Station/Bulk Store',
            description: 'Belanja di refill station atau toko curah',
            criteria:
              'Refill station/toko curah terlihat, tanpa kemasan plastik',
            basePoints: 35,
          },
          {
            id: 'BARANG_REUSABLE',
            name: 'Pakai Barang Reusable',
            description:
              'Menggunakan tas belanja, tumbler, wadah yang dapat digunakan ulang',
            criteria: 'Barang reusable terlihat (tas, tumbler, wadah)',
            basePoints: 25,
          },
        ],
      },
      AKSI_KOLEKTIF: {
        name: 'Aksi Kolektif',
        description: 'Aksi bersama untuk lingkungan',
        subCategories: [
          {
            id: 'KERJA_BAKTI',
            name: 'Kerja Bakti',
            description: 'Aktivitas kerja bakti komunitas',
            criteria:
              'Aktivitas kerja bakti kelompok, sampah terkumpul terlihat',
            basePoints: 80,
          },
          {
            id: 'BERSIH_SUNGAI',
            name: 'Bersih Sungai',
            description: 'Pembersihan sungai atau badan air',
            criteria: 'Aktivitas bersih sungai, sampah terkumpul',
            basePoints: 90,
          },
        ],
      },
    };

    return {
      statusCode: HttpStatus.OK,
      message: 'Categories info retrieved successfully',
      data: categories,
    };
  }

  /**
   * Submit a new green action with media
   * @param {JwtPayload} user - Current authenticated user
   * @param {CreateGreenActionDto} dto - Green action data
   * @param {Express.Multer.File} file - Media file (image/video)
   * @returns {Promise<object>} Created green action response
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('media'))
  @ApiOperation({
    summary: 'Submit a new green action',
    description:
      'Submit a green action with media (image/video) for AI verification',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Green action data with media file and coordinates (location info auto-generated via reverse geocoding)',
    schema: {
      type: 'object',
      required: [
        'category',
        'subCategory',
        'quantity',
        'latitude',
        'longitude',
        'media',
      ],
      properties: {
        category: {
          type: 'string',
          enum: [
            'PILAH_SAMPAH',
            'TANAM_POHON',
            'KONSUMSI_HIJAU',
            'AKSI_KOLEKTIF',
          ],
          description: 'Kategori utama aksi hijau',
          example: 'AKSI_KOLEKTIF',
        },
        subCategory: {
          type: 'string',
          description: 'Sub-kategori aksi hijau',
          example: 'KERJA_BAKTI',
        },
        description: {
          type: 'string',
          description: 'Optional description of the action',
          example: 'Membersihkan sampah di taman kota',
        },
        quantity: {
          type: 'number',
          format: 'float',
          description: 'Kuantitas aksi (misal: berat dalam kg, jumlah item)',
          example: 5.5,
          minimum: 0.01,
        },
        actionType: {
          type: 'string',
          description: 'Tipe aksi / satuan (opsional, misal: kg, pohon, item)',
          example: 'kg',
        },
        latitude: {
          type: 'number',
          format: 'float',
          description:
            'Latitude coordinate (-90 to 90) - REQUIRED for reverse geocoding',
          example: -6.2,
        },
        longitude: {
          type: 'number',
          format: 'float',
          description:
            'Longitude coordinate (-180 to 180) - REQUIRED for reverse geocoding',
          example: 106.816666,
        },
        media: {
          type: 'string',
          format: 'binary',
          description: 'Image or video file (max 1MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Green action submitted and verified successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 201 },
        message: {
          type: 'string',
          example: 'Green action created successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            userId: { type: 'string', example: 'user-uuid' },
            category: { type: 'string', example: 'AKSI_KOLEKTIF' },
            description: {
              type: 'string',
              example: 'Membersihkan sampah di taman',
            },
            mediaUrl: {
              type: 'string',
              example: 'https://res.cloudinary.com/...',
            },
            mediaType: { type: 'string', example: 'IMAGE' },
            status: { type: 'string', example: 'VERIFIED' },
            aiScore: { type: 'number', example: 85 },
            aiFeedback: {
              type: 'string',
              example: 'Great community cleanup effort!',
            },
            aiLabels: {
              type: 'string',
              example: '["trash_bags","cleanup_tools"]',
            },
            points: { type: 'number', example: 80 },
            locationName: { type: 'string', example: 'Taman Menteng' },
            latitude: { type: 'number', example: -6.2 },
            longitude: { type: 'number', example: 106.816666 },
            district: { type: 'string', example: 'Menteng' },
            city: { type: 'string', example: 'Jakarta Pusat' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or file type',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async submitAction(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGreenActionDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1 * 1024 * 1024,
            message: 'File size must not exceed 1MB',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.greenWasteAiService.submitAction(
      user.sub,
      dto,
      file,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Green action submitted successfully',
      data: result,
    };
  }

  @Get('districts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DLH')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get distinct districts from green actions',
    description:
      'Get list of unique district names from verified green action data. Admin/DLH only.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Districts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Districts retrieved successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              district: { type: 'string', example: 'Menteng' },
              city: { type: 'string', example: 'Jakarta Pusat' },
            },
          },
        },
      },
    },
  })
  async getDistricts() {
    const data = await this.reportService.getDistinctDistricts();

    return {
      statusCode: HttpStatus.OK,
      message: 'Districts retrieved successfully',
      data,
    };
  }

  @Get('reports/pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DLH')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Export district report as PDF',
    description:
      'Generate and download a formal PDF report for a specific district based on real green action data. Admin/DLH only.',
  })
  @ApiQuery({
    name: 'district',
    required: true,
    type: String,
    description: 'District name to generate the report for',
    example: 'Menteng',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF report generated successfully',
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No verified green action data found for the district',
  })
  async getDistrictReportPdf(
    @Query('district') district: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportService.generateDistrictPdf(district);

    const safeFileName = district.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Laporan_Aksi_Hijau_${safeFileName}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get('reports/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DLH')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Export district raw data as Excel',
    description:
      'Generate and download an Excel file with raw green action data for a specific district. Admin/DLH only.',
  })
  @ApiQuery({
    name: 'district',
    required: true,
    type: String,
    description: 'District name to export data for',
    example: 'Menteng',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Excel file generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No green action data found for the district',
  })
  async getDistrictReportExcel(
    @Query('district') district: string,
    @Res() res: Response,
  ) {
    const excelBuffer =
      await this.reportService.generateDistrictExcel(district);

    const safeFileName = district.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Data_Aksi_Hijau_${safeFileName}.xlsx"`,
      'Content-Length': excelBuffer.length,
    });

    res.end(excelBuffer);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get my green actions',
    description:
      'Get paginated list of current user green actions with optional filters for category, status, subcategory, district, and city',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['GREEN_WASTE', 'GREEN_HOME', 'GREEN_CONSUMPTION', 'GREEN_COMMUNITY'],
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_IMPROVEMENT'],
    description: 'Filter by verification status',
  })
  @ApiQuery({
    name: 'subCategory',
    required: false,
    type: String,
    description: 'Filter by sub-category',
    example: 'COMMUNITY_CLEANUP',
  })
  @ApiQuery({
    name: 'district',
    required: false,
    type: String,
    description: 'Filter by district/kelurahan',
    example: 'Menteng',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filter by city',
    example: 'Jakarta Pusat',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Green actions retrieved successfully',
  })
  async getMyActions(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryGreenActionDto,
  ) {
    const result = await this.greenWasteAiService.getUserActions(
      user.sub,
      query,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Green actions retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get current user's green action statistics
   * @param {JwtPayload} user - Current authenticated user
   * @returns {Promise<object>} User statistics
   */
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get my green action statistics',
    description: 'Get statistics of current user green actions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getMyStats(@CurrentUser() user: JwtPayload) {
    const stats = await this.greenWasteAiService.getUserStats(user.sub);

    return {
      statusCode: HttpStatus.OK,
      message: 'Statistics retrieved successfully',
      data: stats,
    };
  }

  /**
   * Get all green actions (admin only) - NO PAGINATION
   * @param {AdminQueryGreenActionDto} query - Query parameters with filters
   * @returns {Promise<object>} All green actions matching filters
   */
  @Get('impact')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get green action impact with AI insight',
    description:
      'Get aggregated impact data (total quantity, total actions, unique districts) with AI-generated narrative insight based on real database data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Impact data with AI insight retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Impact data retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            aggregation: {
              type: 'object',
              properties: {
                totalQuantity: { type: 'number', example: 1250.5 },
                totalActions: { type: 'number', example: 342 },
                totalUniqueDistricts: { type: 'number', example: 15 },
                totalUniqueCities: { type: 'number', example: 4 },
              },
            },
            byDistrict: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  district: { type: 'string', example: 'Menteng' },
                  city: { type: 'string', example: 'Jakarta Pusat' },
                  totalActions: { type: 'number', example: 45 },
                  totalQuantity: { type: 'number', example: 120.5 },
                },
              },
            },
            monthlyTrend: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string', example: '2026-03' },
                  totalActions: { type: 'number', example: 58 },
                  totalQuantity: { type: 'number', example: 200.3 },
                },
              },
            },
            topDistrict: {
              type: 'object',
              nullable: true,
              properties: {
                district: { type: 'string', example: 'Menteng' },
                city: { type: 'string', example: 'Jakarta Pusat' },
                totalActions: { type: 'number', example: 45 },
                totalQuantity: { type: 'number', example: 120.5 },
              },
            },
            insight: {
              type: 'string',
              example:
                'Hingga saat ini, tercatat 342 aksi hijau terverifikasi...',
            },
          },
        },
      },
    },
  })
  async getImpact() {
    const result = await this.greenWasteAiService.getImpactWithInsight();

    return {
      statusCode: HttpStatus.OK,
      message: 'Impact data retrieved successfully',
      data: result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DLH')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all green actions (Admin/DLH only) - No Pagination',
    description:
      'Get ALL green actions with filters: search (location/description/user name), category, status, district, city. All filters are case insensitive. No pagination.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search by location name, description, or user name (case insensitive)',
    example: 'Taman',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['PILAH_SAMPAH', 'TANAM_POHON', 'KONSUMSI_HIJAU', 'AKSI_KOLEKTIF'],
    description: 'Filter by category',
    example: 'PILAH_SAMPAH',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_IMPROVEMENT'],
    description: 'Filter by verification status',
    example: 'VERIFIED',
  })
  @ApiQuery({
    name: 'district',
    required: false,
    type: String,
    description: 'Filter by district/kelurahan (case insensitive)',
    example: 'Menteng',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filter by city (case insensitive)',
    example: 'Jakarta Pusat',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All green actions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Green actions retrieved successfully',
        },
        total: { type: 'number', example: 150 },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              category: { type: 'string' },
              status: { type: 'string' },
              locationName: { type: 'string' },
              district: { type: 'string' },
              city: { type: 'string' },
              points: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - Admin/DLH only',
  })
  async getAllActions(@Query() query: AdminQueryGreenActionDto) {
    const result = await this.greenWasteAiService.getAllActionsForAdmin(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Green actions retrieved successfully',
      total: result.length,
      data: result,
    };
  }

  /**
   * Get all flagged actions pending admin review
   */
  @Get('flagged')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DLH')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get flagged green actions for review',
    description:
      'Get all green actions that were flagged by the anti-cheat system, pending admin review (reviewed_at is null). Admin/DLH only.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flagged actions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Flagged actions retrieved successfully',
        },
        total: { type: 'number', example: 3 },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              userId: { type: 'string', format: 'uuid' },
              user: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string', example: 'Budi Santoso' },
                  email: {
                    type: 'string',
                    example: 'budi@example.com',
                  },
                  avatarUrl: {
                    type: 'string',
                    nullable: true,
                    example: 'https://res.cloudinary.com/...',
                  },
                },
              },
              category: {
                type: 'string',
                example: 'PILAH_SAMPAH',
                enum: [
                  'PILAH_SAMPAH',
                  'TANAM_POHON',
                  'KONSUMSI_HIJAU',
                  'AKSI_KOLEKTIF',
                ],
              },
              description: {
                type: 'string',
                nullable: true,
                example: 'Memilah sampah organik di rumah',
              },
              quantity: { type: 'number', example: 50 },
              actionType: {
                type: 'string',
                nullable: true,
                example: 'kg',
              },
              mediaUrl: {
                type: 'string',
                example: 'https://res.cloudinary.com/...',
              },
              mediaType: {
                type: 'string',
                example: 'IMAGE',
                enum: ['IMAGE', 'VIDEO'],
              },
              status: {
                type: 'string',
                example: 'VERIFIED',
                enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_IMPROVEMENT'],
              },
              aiScore: { type: 'number', nullable: true, example: 82 },
              aiFeedback: {
                type: 'string',
                nullable: true,
                example: 'Terdeteksi aktivitas pilah sampah yang baik.',
              },
              aiLabels: {
                type: 'string',
                nullable: true,
                example: '["trash_organic","bin_green"]',
              },
              points: { type: 'number', example: 50 },
              locationName: {
                type: 'string',
                nullable: true,
                example: 'Perumahan Green Ville',
              },
              latitude: { type: 'number', nullable: true, example: -6.2 },
              longitude: {
                type: 'number',
                nullable: true,
                example: 106.816,
              },
              district: {
                type: 'string',
                nullable: true,
                example: 'Menteng',
              },
              city: {
                type: 'string',
                nullable: true,
                example: 'Jakarta Pusat',
              },
              isFlagged: { type: 'boolean', example: true },
              flagReason: {
                type: 'string',
                nullable: true,
                example:
                  'Anomaly: quantity 50 melebihi 3x rata-rata user (5.2)',
              },
              pointsHeld: { type: 'boolean', example: true },
              reviewedBy: { type: 'string', nullable: true, example: null },
              reviewedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                example: null,
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - Admin/DLH only',
  })
  async getFlaggedActions() {
    const result = await this.greenWasteAiService.getFlaggedActions();

    return {
      statusCode: HttpStatus.OK,
      message: 'Flagged actions retrieved successfully',
      total: result.length,
      data: result,
    };
  }

  /**
   * Approve a flagged action — release held points to user
   */
  @Post('flagged/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DLH')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a flagged green action',
    description:
      'Approve a flagged green action and release held points to the user. Only works on actions where is_flagged=true. Admin/DLH only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Green action UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action approved and points released',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Flagged action approved, points released',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            category: { type: 'string', example: 'PILAH_SAMPAH' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Memilah sampah organik',
            },
            quantity: { type: 'number', example: 5.5 },
            actionType: {
              type: 'string',
              nullable: true,
              example: 'kg',
            },
            mediaUrl: {
              type: 'string',
              example: 'https://res.cloudinary.com/...',
            },
            mediaType: { type: 'string', example: 'IMAGE' },
            status: { type: 'string', example: 'VERIFIED' },
            aiScore: { type: 'number', nullable: true, example: 85 },
            aiFeedback: {
              type: 'string',
              nullable: true,
              example: 'Aktivitas pilah sampah terdeteksi dengan baik.',
            },
            aiLabels: {
              type: 'string',
              nullable: true,
              example: '["trash_organic","bin_green"]',
            },
            points: { type: 'number', example: 50 },
            locationName: {
              type: 'string',
              nullable: true,
              example: 'Taman Menteng',
            },
            latitude: { type: 'number', nullable: true, example: -6.2 },
            longitude: {
              type: 'number',
              nullable: true,
              example: 106.816,
            },
            district: {
              type: 'string',
              nullable: true,
              example: 'Menteng',
            },
            city: {
              type: 'string',
              nullable: true,
              example: 'Jakarta Pusat',
            },
            isFlagged: { type: 'boolean', example: true },
            flagReason: {
              type: 'string',
              nullable: true,
              example: 'Anomaly: quantity melebihi 3x rata-rata',
            },
            pointsHeld: { type: 'boolean', example: false },
            reviewedBy: {
              type: 'string',
              format: 'uuid',
              example: 'admin-uuid-here',
            },
            reviewedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-23T10:30:00.000Z',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Action is not flagged',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Action is not flagged' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - Admin/DLH only',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Green action not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Green action not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async approveFlaggedAction(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.greenWasteAiService.approveFlaggedAction(
      id,
      user.sub,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Flagged action approved, points released',
      data: result,
    };
  }

  /**
   * Reject a flagged action — zero out points, demote trust
   */
  @Post('flagged/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DLH')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a flagged green action',
    description:
      'Reject a flagged green action, zero out points, set status to REJECTED, and potentially downgrade user trust level. Only works on actions where is_flagged=true. Admin/DLH only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Green action UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action rejected, points removed, trust potentially demoted',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Flagged action rejected' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            category: { type: 'string', example: 'PILAH_SAMPAH' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Memilah sampah organik',
            },
            quantity: { type: 'number', example: 50 },
            actionType: {
              type: 'string',
              nullable: true,
              example: 'kg',
            },
            mediaUrl: {
              type: 'string',
              example: 'https://res.cloudinary.com/...',
            },
            mediaType: { type: 'string', example: 'IMAGE' },
            status: { type: 'string', example: 'REJECTED' },
            aiScore: { type: 'number', nullable: true, example: 82 },
            aiFeedback: {
              type: 'string',
              nullable: true,
              example: 'Terdeteksi aktivitas pilah sampah.',
            },
            aiLabels: {
              type: 'string',
              nullable: true,
              example: '["trash_organic"]',
            },
            points: { type: 'number', example: 0 },
            locationName: {
              type: 'string',
              nullable: true,
              example: 'Taman Menteng',
            },
            latitude: { type: 'number', nullable: true, example: -6.2 },
            longitude: {
              type: 'number',
              nullable: true,
              example: 106.816,
            },
            district: {
              type: 'string',
              nullable: true,
              example: 'Menteng',
            },
            city: {
              type: 'string',
              nullable: true,
              example: 'Jakarta Pusat',
            },
            isFlagged: { type: 'boolean', example: true },
            flagReason: {
              type: 'string',
              nullable: true,
              example: 'Anomaly: quantity 50 melebihi 3x rata-rata user',
            },
            pointsHeld: { type: 'boolean', example: false },
            reviewedBy: {
              type: 'string',
              format: 'uuid',
              example: 'admin-uuid-here',
            },
            reviewedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-23T10:30:00.000Z',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Action is not flagged',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Action is not flagged' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - Admin/DLH only',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Green action not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Green action not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async rejectFlaggedAction(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.greenWasteAiService.rejectFlaggedAction(
      id,
      user.sub,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Flagged action rejected',
      data: result,
    };
  }

  /**
   * Get a single green action by ID
   * @param {JwtPayload} user - Current authenticated user
   * @param {string} id - Green action ID
   * @returns {Promise<object>} Green action details
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get green action by ID',
    description: 'Get details of a specific green action',
  })
  @ApiParam({
    name: 'id',
    description: 'Green action UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Green action retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Green action not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getActionById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'DLH';
    const result = await this.greenWasteAiService.getActionById(
      id,
      user.sub,
      isAdmin,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Green action retrieved successfully',
      data: result,
    };
  }

  /**
   * Delete a green action
   * @param {JwtPayload} user - Current authenticated user
   * @param {string} id - Green action ID
   * @returns {Promise<object>} Deletion confirmation
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete green action',
    description: 'Delete a specific green action (own action or admin)',
  })
  @ApiParam({
    name: 'id',
    description: 'Green action UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Green action deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Green action not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async deleteAction(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'DLH';
    await this.greenWasteAiService.deleteAction(id, user.sub, isAdmin);

    return {
      statusCode: HttpStatus.OK,
      message: 'Green action deleted successfully',
    };
  }

  /**
   * Retry verification for a failed action
   * @param {JwtPayload} user - Current authenticated user
   * @param {string} id - Green action ID
   * @returns {Promise<object>} Updated green action
   */
  @Post(':id/retry')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry verification',
    description: 'Retry AI verification for a failed/needs improvement action',
  })
  @ApiParam({
    name: 'id',
    description: 'Green action UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification retry initiated',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Green action not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Action already verified',
  })
  async retryVerification(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.greenWasteAiService.retryVerification(
      id,
      user.sub,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Verification retry initiated',
      data: result,
    };
  }
}
