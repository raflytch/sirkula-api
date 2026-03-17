/**
 * @fileoverview Quiz Repository
 * @description Database operations for quiz sessions and quiz history.
 * All answer-key data stays server-side via quiz_session.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { quiz_history, quiz_session } from '@prisma/client';
import {
  toPrismaQueryOptions,
  createPaginatedResult,
} from '../../commons/helpers/pagination.helper';
import { IPaginatedResult } from '../../commons/intefaces/pagination.interface';
import { QueryQuizHistoryDto } from './dto';

@Injectable()
export class QuizRepository {
  constructor(private readonly db: DatabaseService) {}

  async createSession(data: {
    userId: string;
    answerKey: string;
    expiresAt: Date;
  }): Promise<quiz_session> {
    return this.db.quiz_session.create({
      data: {
        user_id: data.userId,
        answer_key: data.answerKey,
        expires_at: data.expiresAt,
      },
    });
  }

  async findSessionById(id: string): Promise<quiz_session | null> {
    return this.db.quiz_session.findUnique({ where: { id } });
  }

  async markSessionUsed(id: string): Promise<void> {
    await this.db.quiz_session.update({
      where: { id },
      data: { is_used: true },
    });
  }

  async createHistory(data: {
    userId: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    points: number;
  }): Promise<quiz_history> {
    return this.db.quiz_history.create({
      data: {
        user_id: data.userId,
        score: data.score,
        total_questions: data.totalQuestions,
        correct_answers: data.correctAnswers,
        points: data.points,
      },
    });
  }

  async findHistoryByUserId(
    userId: string,
    query: QueryQuizHistoryDto,
  ): Promise<IPaginatedResult<quiz_history>> {
    const where = { user_id: userId };
    const prismaOptions = toPrismaQueryOptions(query);

    const [data, total] = await Promise.all([
      this.db.quiz_history.findMany({ where, ...prismaOptions }),
      this.db.quiz_history.count({ where }),
    ]);

    return createPaginatedResult(data, total, query);
  }

  async addUserPoints(userId: string, points: number): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { total_points: { increment: points } },
    });
  }
}
