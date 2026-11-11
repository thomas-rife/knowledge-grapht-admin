export type ExportStudent = {
  student_id: string;
  display_name: string;
  email: string;
};

export type ExportAnswer = {
  answer_id: number;
  student_id: string;
  question_id: number | null;
  lesson_id: number | null;
  quiz_session_id: string | null;
  selected_answer: string | null;
  raw_response: unknown;
  is_correct: boolean | null;
  answered_at: string | null;
};

export type ExportSession = {
  id: string;
  student_id: string;
  lesson_id: number | null;
  quiz_mode: string;
  status: string;
  focus_node_id: string | null;
  focus_topic_label: string | null;
  question_count: number;
  answered_count: number;
  correct_count: number;
  started_at: string | null;
  completed_at: string | null;
  ended_at: string | null;
};

export type ExportQuestion = {
  question_id: number;
  prompt: string | null;
  snippet: string | null;
  topics: string[] | null;
};

export type ExportLesson = {
  lesson_id: number;
  name: string;
  topics: string[] | null;
};

export type ExportSnapshot = {
  quiz_session_id: string;
  question_id: number;
  question_snapshot: {
    prompt?: string | null;
    snippet?: string | null;
    topics?: string[] | null;
  } | null;
};

export type ExportTopicLink = {
  topic_node_ids: string[] | null;
};

export type StudentExportData = {
  className: string;
  students: ExportStudent[];
  answers: ExportAnswer[];
  sessions: ExportSession[];
  questions: ExportQuestion[];
  lessons: ExportLesson[];
  snapshots: ExportSnapshot[];
  graphTopics: { id: string; label: string }[];
  questionTopics: (ExportTopicLink & { question_id: number })[];
  lessonTopics: (ExportTopicLink & { lesson_id: number })[];
};
