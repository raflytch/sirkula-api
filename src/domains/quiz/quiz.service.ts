/**
 * @fileoverview Quiz Service
 * @description Generates quizzes via Gemini AI and grades user answers.
 *
 * SECURITY MODEL:
 * - On generate, the answer key is persisted in quiz_session (server-side only).
 * - The API response to the client contains NO correctAnswer fields.
 * - On submit, the client sends only a quizId + selected answers.
 * - The service loads the answer key from the DB to grade — the client
 *   never controls or even sees the correct answers.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { GoogleGenAiService } from '../../libs/google-genai/google-gen-ai.service';
import { QuizRepository } from './quiz.repository';
import { SubmitQuizDto, QueryQuizHistoryDto } from './dto';
import {
  IGeneratedQuizInternal,
  IGeneratedQuizResponse,
  IQuizSubmitResult,
  IQuizHistoryResponse,
  IQuizAnswerDetail,
  IQuizQuestionInternal,
} from './interfaces';
import { IPaginatedResult } from '../../commons/intefaces/pagination.interface';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  private readonly POINTS_PER_CORRECT = 5;
  private readonly TOTAL_QUESTIONS = 10;
  private readonly TOTAL_OPTIONS = 4;
  private readonly SESSION_TTL_MINUTES = 60;
  private readonly MAX_WEEKLY_QUIZZES = 2;

  constructor(
    private readonly genAiService: GoogleGenAiService,
    private readonly repository: QuizRepository,
  ) {}

  /**
   * Generates quiz content via Gemini AI, persists the answer key
   * server-side, and returns the quiz WITHOUT correct answers.
   */
  async generateQuiz(userId: string): Promise<IGeneratedQuizResponse> {
    this.logger.log(`Generating quiz for user ${userId}`);

    const weeklyCount = await this.repository.countWeeklyQuizzes(userId);
    if (weeklyCount >= this.MAX_WEEKLY_QUIZZES) {
      throw new ForbiddenException(
        'Anda sudah mencapai batas maksimal 2 kali quiz per minggu. Silakan coba lagi minggu depan.',
      );
    }

    const prompt = this.buildPrompt();
    const response = await this.genAiService.generateFromText(prompt);

    if (!response.success) {
      this.logger.error(`Quiz generation failed: ${response.error}`);
      throw new BadRequestException('Gagal membuat quiz. Silakan coba lagi.');
    }

    const quiz = this.parseAiResponse(response.text);

    const answerKey = quiz.questions.map((q) => ({
      questionNumber: q.questionNumber,
      question: q.question,
      correctAnswer: q.correctAnswer,
    }));

    const expiresAt = new Date(
      Date.now() + this.SESSION_TTL_MINUTES * 60 * 1000,
    );

    const session = await this.repository.createSession({
      userId,
      answerKey: JSON.stringify(answerKey),
      expiresAt,
    });

    return {
      quizId: session.id,
      material: quiz.material,
      questions: quiz.questions.map(({ correctAnswer: _, ...rest }) => rest),
    };
  }

  /**
   * Loads the answer key from the DB, grades answers, saves history,
   * and awards points. The client never touches the answer key.
   */
  async submitQuiz(
    userId: string,
    dto: SubmitQuizDto,
  ): Promise<IQuizSubmitResult> {
    const session = await this.repository.findSessionById(dto.quizId);

    if (!session) {
      throw new NotFoundException('Quiz session tidak ditemukan.');
    }

    if (session.user_id !== userId) {
      throw new BadRequestException('Quiz session bukan milik Anda.');
    }

    if (session.is_used) {
      throw new BadRequestException('Quiz session sudah pernah disubmit.');
    }

    if (new Date() > session.expires_at) {
      throw new BadRequestException('Quiz session sudah kadaluarsa.');
    }

    const answerKey: Array<{
      questionNumber: number;
      question: string;
      correctAnswer: number;
    }> = JSON.parse(session.answer_key);

    if (dto.answers.length !== answerKey.length) {
      throw new BadRequestException(
        `Jumlah jawaban harus ${answerKey.length} soal.`,
      );
    }

    const details: IQuizAnswerDetail[] = [];
    let correctCount = 0;

    for (const answer of dto.answers) {
      const key = answerKey.find(
        (k) => k.questionNumber === answer.questionNumber,
      );

      if (!key) {
        throw new BadRequestException(
          `Soal nomor ${answer.questionNumber} tidak ditemukan.`,
        );
      }

      const isCorrect = answer.selectedAnswer === key.correctAnswer;
      if (isCorrect) correctCount++;

      details.push({
        questionNumber: answer.questionNumber,
        question: key.question,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: key.correctAnswer,
        isCorrect,
      });
    }

    const totalQuestions = answerKey.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const points = correctCount * this.POINTS_PER_CORRECT;

    await this.repository.markSessionUsed(dto.quizId);

    const record = await this.repository.createHistory({
      userId,
      score,
      totalQuestions,
      correctAnswers: correctCount,
      points,
    });

    if (points > 0) {
      await this.repository.addUserPoints(userId, points);
      this.logger.log(`User ${userId} earned ${points} points from quiz`);
    }

    return {
      id: record.id,
      userId,
      score,
      totalQuestions,
      correctAnswers: correctCount,
      points,
      details,
      createdAt: record.created_at,
    };
  }

  async getHistory(
    userId: string,
    query: QueryQuizHistoryDto,
  ): Promise<IPaginatedResult<IQuizHistoryResponse>> {
    const result = await this.repository.findHistoryByUserId(userId, query);

    return {
      data: result.data.map((r) => this.mapToHistoryResponse(r)),
      meta: result.meta,
    };
  }

  private buildPrompt(): string {
    return `Kamu adalah seorang edukator lingkungan hidup yang ramah dan mudah dipahami.

Buatkan materi edukasi singkat tentang GREEN ACTIONS (aksi ramah lingkungan) dan quiz berdasarkan materi tersebut.

KETENTUAN MATERI:
- Topik: salah satu dari [Pengelolaan Sampah, Hemat Energi, Hemat Air, Tanam Pohon, Kurangi Plastik, Daur Ulang, Komposting, Urban Farming, Konsumsi Berkelanjutan, Transportasi Ramah Lingkungan]
- Pilih topik secara ACAK setiap kali diminta
- Tulis dalam Bahasa Indonesia yang sederhana dan mudah dipahami oleh masyarakat umum
- Panjang materi: 3-5 paragraf
- Sertakan tips praktis yang bisa langsung diterapkan

KETENTUAN QUIZ:
- Jumlah soal: ${this.TOTAL_QUESTIONS} soal pilihan ganda
- Setiap soal memiliki tepat ${this.TOTAL_OPTIONS} opsi jawaban (A, B, C, D)
- Hanya 1 jawaban yang benar per soal
- Level kesulitan: MUDAH (untuk masyarakat umum)
- Soal harus RELEVAN dengan materi yang diberikan
- Gunakan Bahasa Indonesia yang sederhana

FORMAT RESPONSE (JSON ONLY, tanpa markdown code block):
{
  "material": {
    "title": "Judul Materi",
    "content": "Isi materi lengkap dalam beberapa paragraf...",
    "keyPoints": ["Poin penting 1", "Poin penting 2", "Poin penting 3"]
  },
  "questions": [
    {
      "questionNumber": 1,
      "question": "Pertanyaan quiz?",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctAnswer": 0
    }
  ]
}

PENTING:
- correctAnswer adalah INDEX (0-based) dari opsi yang benar (0-3)
- Pastikan ada tepat ${this.TOTAL_OPTIONS} opsi untuk setiap soal
- Pastikan ada tepat ${this.TOTAL_QUESTIONS} soal
- Response HARUS berupa JSON valid tanpa tambahan teks apapun`;
  }

  private parseAiResponse(responseText: string): IGeneratedQuizInternal {
    try {
      let jsonStr = responseText.trim();

      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      this.validateStructure(parsed);

      return {
        material: {
          title: parsed.material.title,
          content: parsed.material.content,
          keyPoints: parsed.material.keyPoints,
        },
        questions: parsed.questions.map((q: IQuizQuestionInternal) => ({
          questionNumber: q.questionNumber,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
        })),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      this.logger.error('Failed to parse quiz AI response', error);
      throw new BadRequestException(
        'Gagal memproses quiz dari AI. Silakan coba lagi.',
      );
    }
  }

  private validateStructure(parsed: any): void {
    if (!parsed.material || !parsed.questions) {
      throw new BadRequestException(
        'Respons AI tidak memiliki struktur yang benar.',
      );
    }

    if (
      !Array.isArray(parsed.questions) ||
      parsed.questions.length < this.TOTAL_QUESTIONS
    ) {
      throw new BadRequestException(
        `Quiz harus memiliki minimal ${this.TOTAL_QUESTIONS} soal.`,
      );
    }

    for (const q of parsed.questions) {
      if (!q.options || q.options.length !== this.TOTAL_OPTIONS) {
        throw new BadRequestException(
          `Soal nomor ${q.questionNumber} harus memiliki ${this.TOTAL_OPTIONS} opsi jawaban.`,
        );
      }

      if (
        typeof q.correctAnswer !== 'number' ||
        q.correctAnswer < 0 ||
        q.correctAnswer >= this.TOTAL_OPTIONS
      ) {
        throw new BadRequestException(
          `correctAnswer pada soal ${q.questionNumber} tidak valid.`,
        );
      }
    }
  }

  private mapToHistoryResponse(record: any): IQuizHistoryResponse {
    return {
      id: record.id,
      userId: record.user_id,
      score: record.score,
      totalQuestions: record.total_questions,
      correctAnswers: record.correct_answers,
      points: record.points,
      createdAt: record.created_at,
    };
  }
}
