/**
 * @fileoverview Quiz domain interfaces
 * @description Separates server-internal types from client-facing response types
 * to prevent answer key leakage
 */

/** Server-side only — includes the correct answer index */
export interface IQuizQuestionInternal {
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

/** Client-facing — correctAnswer is stripped before sending */
export interface IQuizQuestionPublic {
  questionNumber: number;
  question: string;
  options: string[];
}

export interface IQuizMaterial {
  title: string;
  content: string;
  keyPoints: string[];
}

/** Full AI output kept on the server */
export interface IGeneratedQuizInternal {
  material: IQuizMaterial;
  questions: IQuizQuestionInternal[];
}

/** What the client receives after generate */
export interface IGeneratedQuizResponse {
  quizId: string;
  material: IQuizMaterial;
  questions: IQuizQuestionPublic[];
}

export interface IQuizSubmitResult {
  id: string;
  userId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  points: number;
  details: IQuizAnswerDetail[];
  createdAt: Date;
}

export interface IQuizAnswerDetail {
  questionNumber: number;
  question: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
}

export interface IQuizHistoryResponse {
  id: string;
  userId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  points: number;
  createdAt: Date;
}
