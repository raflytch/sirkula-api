/**
 * @fileoverview Leaderboard module
 * @description Module configuration for leaderboard feature
 */

import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardRepository } from './leaderboard.repository';
import { MailerModule } from '../../libs/mailer/mailer.module';

/**
 * Leaderboard module
 * @description Provides leaderboard endpoints and daily reward webhook
 */
@Module({
  imports: [MailerModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeaderboardRepository],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
