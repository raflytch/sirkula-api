/**
 * @fileoverview Main application module
 * @description Root module that imports all feature modules
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './domains/user/user.module';
import { GreenWasteAiModule } from './domains/green-waste-ai/green-waste-ai.module';
import { VoucherModule } from './domains/voucher/voucher.module';
import { LeaderboardModule } from './domains/leaderboard/leaderboard.module';
import { QuizModule } from './domains/quiz/quiz.module';
import { MailerModule } from './libs/mailer/mailer.module';
import { CloudinaryModule } from './libs/cloudinary/cloudinary.module';
import { GoogleGenAiModule } from './libs/google-genai/google-gen-ai.module';
import { SchedulerModule } from './libs/scheduler/scheduler.module';

/**
 * Main application module
 * @description Imports all feature modules and global providers
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    DatabaseModule,
    MailerModule,
    CloudinaryModule,
    GoogleGenAiModule,
    SchedulerModule,
    UserModule,
    GreenWasteAiModule,
    VoucherModule,
    LeaderboardModule,
    QuizModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
