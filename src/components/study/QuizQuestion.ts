export type QuestionType = 'multiple-choice' | 'short-answer' | 'true-false' | 'fill-in-blank';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  // MC + TF
  options?: string[];
  correctOptions?: number[]; // indices; MC allows multiple correct
  // Short answer
  exampleAnswer?: string;
  matchMode?: string;
  // Fill-in-blank
  answer?: string;
}