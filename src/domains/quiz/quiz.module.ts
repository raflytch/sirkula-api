/**
 * @fileoverview Quiz Module
 * @description Module for green action education quiz with AI-generated content
 */

import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizRepository } from './quiz.repository';

@Module({
  controllers: [QuizController],
  providers: [QuizService, QuizRepository],
  exports: [QuizService],
})
export class QuizModule {}
