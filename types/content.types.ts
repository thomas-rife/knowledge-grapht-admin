export type GraphTopic = {
  id: string;
  label: string;
};

export type Lesson = {
  lesson_id?: number;
  name: string;
  topics: string[];
  topic_node_ids?: string[];
  is_published?: boolean;
};

export type Question = {
  questionId?: number;
  questionType: string;
  prompt: string;
  snippet: string;
  topics: string[];
  topicNodeIds?: string[];
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
  topicNodeIds?: string[];
  answerOptions: string[];
  answer: string;
};

export type Rearrange = {
  questionId?: number;
  questionType: string;
  prompt: string;
  snippet: string;
  topics: string[];
  topicNodeIds?: string[];
  answerOptions: {
    professorView: { [key: string]: string }[];
    studentView?: { [key: string]: string }[];
  }[];
  answer: string;
};
