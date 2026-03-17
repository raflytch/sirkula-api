/**
 * @fileoverview Quiz Controller
 * @description API endpoints for green action education quiz.
 * correctAnswer is NEVER present in any response — it lives server-side only.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { JwtPayload } from '../../commons/strategies/jwt.strategy';
import { QuizService } from './quiz.service';
import { SubmitQuizDto, QueryQuizHistoryDto } from './dto';

@ApiTags('Quiz Edukasi Green Actions')
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate materi & quiz green actions',
    description:
      'Menghasilkan materi edukasi dan 10 soal pilihan ganda (4 opsi) tentang green actions menggunakan Gemini AI. ' +
      'Jawaban benar TIDAK disertakan dalam response — disimpan server-side. ' +
      'Gunakan quizId yang dikembalikan untuk submit jawaban.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz berhasil di-generate',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Quiz berhasil di-generate' },
        data: {
          type: 'object',
          properties: {
            quizId: { type: 'string', example: 'uuid-quiz-session' },
            material: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'Mengenal Pengelolaan Sampah Rumah Tangga' },
                content: { type: 'string', example: 'Pengelolaan sampah rumah tangga adalah...' },
                keyPoints: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Pisahkan sampah organik dan anorganik', 'Gunakan prinsip 3R'],
                },
              },
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  questionNumber: { type: 'number', example: 1 },
                  question: { type: 'string', example: 'Apa kepanjangan dari 3R dalam pengelolaan sampah?' },
                  options: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['Reduce, Reuse, Recycle', 'Run, Rest, Repeat', 'Read, React, Resolve', 'Reduce, React, Reuse'],
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Gagal generate quiz dari AI' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Token tidak valid atau kadaluarsa' })
  async generateQuiz(@CurrentUser() user: JwtPayload) {
    const data = await this.quizService.generateQuiz(user.sub);

    return {
      statusCode: HttpStatus.OK,
      message: 'Quiz berhasil di-generate',
      data,
    };
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit jawaban quiz',
    description:
      'Mengirimkan jawaban quiz berdasarkan quizId. ' +
      'Backend memvalidasi jawaban terhadap answer key yang tersimpan di server. ' +
      '1 jawaban benar = 5 poin.',
  })
  @ApiBody({ type: SubmitQuizDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quiz berhasil disubmit dan dinilai',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 201 },
        message: { type: 'string', example: 'Quiz berhasil disubmit' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-quiz-history' },
            userId: { type: 'string', example: 'uuid-user' },
            score: { type: 'number', example: 80 },
            totalQuestions: { type: 'number', example: 10 },
            correctAnswers: { type: 'number', example: 8 },
            points: { type: 'number', example: 40 },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  questionNumber: { type: 'number', example: 1 },
                  question: { type: 'string', example: 'Apa kepanjangan dari 3R?' },
                  selectedAnswer: { type: 'number', example: 0 },
                  correctAnswer: { type: 'number', example: 0 },
                  isCorrect: { type: 'boolean', example: true },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Jawaban tidak valid atau session kadaluarsa' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Quiz session tidak ditemukan' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Token tidak valid atau kadaluarsa' })
  async submitQuiz(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitQuizDto,
  ) {
    const result = await this.quizService.submitQuiz(user.sub, dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Quiz berhasil disubmit',
      data: result,
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Riwayat quiz user',
    description: 'Mendapatkan daftar riwayat quiz dengan paginasi',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Nomor halaman (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Jumlah per halaman (default: 10)', example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Riwayat quiz berhasil diambil',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Riwayat quiz berhasil diambil' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              score: { type: 'number', example: 80 },
              totalQuestions: { type: 'number', example: 10 },
              correctAnswers: { type: 'number', example: 8 },
              points: { type: 'number', example: 40 },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 1 },
            hasPreviousPage: { type: 'boolean', example: false },
            hasNextPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Token tidak valid atau kadaluarsa' })
  async getHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryQuizHistoryDto,
  ) {
    const result = await this.quizService.getHistory(user.sub, query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Riwayat quiz berhasil diambil',
      data: result.data,
      meta: result.meta,
    };
  }
}
