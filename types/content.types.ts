export type Lesson = {
  lesson_id?: number;
  name: string;
  topics: string[];
};

export type Question = {
  questionId?: number;
  questionType: string;
  prompt: string;
  snippet: string;
  topics: string[];
  answerOptions: any[];
  answer: string;
  image_url?: string | null;
  is_ai_generated?: boolean;
};

export type MultipleChoice = {
  questionId?: number;
  questionType: string;
  prompt: string;
  snippet?: string;
  topics: string[];
  answerOptions: string[];
  answer: string;
};

export type Rearrange = {
  questionId?: number;
  questionType: string;
  prompt: string;
  snippet: string;
  topics: string[];
  answerOptions: {
    professorView: { [key: string]: string }[];
    studentView?: { [key: string]: string }[];
  }[];
  answer: string;
};
