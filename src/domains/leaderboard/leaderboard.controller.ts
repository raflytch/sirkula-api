/**
 * @fileoverview Leaderboard controller
 * @description REST API endpoints for leaderboard operations (ALL_TIME based on user.total_points)
 */

import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { WebhookGuard } from '../../commons/guards/webhook.guard';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { JwtPayload } from '../../commons/strategies/jwt.strategy';
import { LeaderboardService } from './leaderboard.service';
import { QueryLeaderboardDto } from './dto';

/**
 * Leaderboard controller
 * @description Handles leaderboard endpoints (ALL_TIME ranking by total_points)
 */
@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * Get leaderboard (public, ALL_TIME)
   * @param {QueryLeaderboardDto} query - Query parameters
   * @returns {Promise<object>} Paginated leaderboard
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get leaderboard',
    description: 'Get paginated ALL_TIME leaderboard based on total_points',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Leaderboard retrieved' })
  async getLeaderboard(@Query() query: QueryLeaderboardDto) {
    const result = await this.leaderboardService.getLeaderboard(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Leaderboard retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get top 3 users (ALL_TIME by total_points)
   * @returns {Promise<object>} Top 3 users
   */
  @Get('top-three')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get top 3 users',
    description: 'Get top 3 users by total points (ALL_TIME)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Top 3 retrieved' })
  async getTopThree() {
    const topThree = await this.leaderboardService.getTopThree();
    return {
      statusCode: HttpStatus.OK,
      message: 'Top 3 users retrieved successfully',
      data: topThree.map((user, index) => ({
        rank: index + 1,
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        totalPoints: user.totalPoints,
        totalActions: user.totalActions,
      })),
    };
  }

  /**
   * Get my rank (authenticated, ALL_TIME)
   * @param {JwtPayload} user - Current user
   * @returns {Promise<object>} User rank info
   */
  @Get('my-rank')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get my rank',
    description: 'Get current user rank in ALL_TIME leaderboard',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rank retrieved' })
  async getMyRank(@CurrentUser() user: JwtPayload) {
    const rank = await this.leaderboardService.getUserRank(user.sub);
    return {
      statusCode: HttpStatus.OK,
      message: 'Your rank retrieved successfully',
      data: rank,
    };
  }

  /**
   * Distribute daily reward to top 3 users (webhook endpoint)
   * @description Called by external scheduler/cron service via webhook
   * @returns {Promise<object>} Reward distribution result
   */
  @Post('distribute-reward')
  @UseGuards(WebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Distribute daily reward (webhook)',
    description:
      'Webhook endpoint to distribute bonus points to top 3 users. Requires x-sha-key header for authentication.',
  })
  @ApiHeader({
    name: 'x-sha-key',
    description: 'Webhook secret key for authentication',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reward distributed successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Daily reward distributed successfully',
        },
        data: {
          type: 'object',
          properties: {
            date: { type: 'string', example: '2025-12-03' },
            timestamp: { type: 'string', example: '2025-12-03T16:59:00.000Z' },
            winners: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  rank: { type: 'number' },
                  totalPoints: { type: 'number' },
                  bonusPoints: { type: 'number' },
                  newTotalPoints: { type: 'number' },
                },
              },
            },
            totalBonusDistributed: { type: 'number', example: 30 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing x-sha-key header',
  })
  async distributeReward() {
    const result = await this.leaderboardService.distributeDailyReward();

    if (!result) {
      return {
        statusCode: HttpStatus.OK,
        message: 'No users with points. Reward distribution skipped.',
        data: null,
      };
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Daily reward distributed successfully',
      data: result,
    };
  }
}
