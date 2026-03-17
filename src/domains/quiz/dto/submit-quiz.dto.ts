/**
 * @fileoverview Submit Quiz DTO
 * @description Client only sends quizId + selected answers.
 * The answer key lives server-side and is never exposed.
 */

import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsUUID,
  ArrayMinSize,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @ApiProperty({ description: 'Nomor soal (1-based)', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  questionNumber: number;

  @ApiProperty({ description: 'Index jawaban yang dipilih (0-based, maks 3)', example: 2 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(3)
  selectedAnswer: number;
}

export class SubmitQuizDto {
  @ApiProperty({ description: 'ID quiz session yang didapat dari endpoint generate', example: 'uuid-quiz-session' })
  @IsNotEmpty()
  @IsUUID()
  quizId: string;

  @ApiProperty({ description: 'Array berisi jawaban user untuk setiap soal', type: [QuizAnswerDto] })
  @IsArray()
  @ArrayMinSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
