import ExcelJS from "exceljs";
import { resolveGraphTopicValues } from "@/utils/graph-topics";
import type { StudentExportData } from "./types";

type Column = { header: string; key: string; width: number };

export async function buildStudentWorkbook(data: StudentExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Knowledge Grapht";
  workbook.title = `${data.className} student activity`;
  workbook.created = new Date();
  const addSheet = (name: string, columns: Column[]) => {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.columns = columns;
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF234A63" } };
    sheet.getRow(1).height = 30;
    sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    return sheet;
  };
  const identity = [
    { header: "Student ID", key: "student_id", width: 38 },
    { header: "Display name", key: "display_name", width: 26 },
    { header: "Email", key: "email", width: 34 },
  ];
  const studentsById = new Map(data.students.map((student) => [student.student_id, student]));
  const questionsById = new Map(data.questions.map((question) => [question.question_id, question]));
  const lessonsById = new Map(data.lessons.map((lesson) => [lesson.lesson_id, lesson]));
  const sessionsById = new Map(data.sessions.map((session) => [session.id, session]));
  const snapshots = new Map(data.snapshots.map((row) => [`${row.quiz_session_id}:${row.question_id}`, row.question_snapshot]));
  const questionTopics = new Map(data.questionTopics.map((row) => [row.question_id, row.topic_node_ids]));
  const lessonTopics = new Map(data.lessonTopics.map((row) => [row.lesson_id, row.topic_node_ids]));
  const graphLabels = new Map(data.graphTopics.map((topic) => [topic.id, topic.label]));
  const topics = (values: unknown) => {
    const resolved = resolveGraphTopicValues(data.graphTopics, values);
    // Preserve historical/unmatched labels instead of silently discarding them.
    return {
      labels: [...resolved.labels, ...resolved.unresolved].join("; "),
      ids: resolved.nodeIds.join("; "),
    };
  };
  const date = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const byStudentAndTime = (
    a: { student_id: string }, b: { student_id: string }, aTime: string | null, bTime: string | null,
  ) => a.student_id.localeCompare(b.student_id) || (aTime ?? "").localeCompare(bTime ?? "");

  const students = addSheet("Students", identity);
  [...data.students].sort((a, b) => a.student_id.localeCompare(b.student_id)).forEach((student) => students.addRow(student));

  const answers = addSheet("Question answers", [
    ...identity,
    { header: "Answer ID", key: "answer_id", width: 14 },
    { header: "Session ID", key: "session_id", width: 38 },
    { header: "Question ID", key: "question_id", width: 15 },
    { header: "Lesson ID", key: "lesson_id", width: 14 },
    { header: "Question", key: "question", width: 65 },
    { header: "Code snippet", key: "snippet", width: 55 },
    { header: "Response", key: "response", width: 50 },
    { header: "Is correct", key: "is_correct", width: 14 },
    { header: "Question topics", key: "topics", width: 40 },
    { header: "Topic node IDs", key: "topic_ids", width: 40 },
    { header: "Question source", key: "question_source", width: 20 },
    { header: "Answered at (UTC)", key: "answered_at", width: 24 },
  ]);
  [...data.answers].sort((a, b) => byStudentAndTime(a, b, a.answered_at, b.answered_at) || a.answer_id - b.answer_id)
    .forEach((answer) => {
      const question = answer.question_id == null ? undefined : questionsById.get(answer.question_id);
      const snapshot = answer.quiz_session_id && answer.question_id != null
        ? snapshots.get(`${answer.quiz_session_id}:${answer.question_id}`) : null;
      const storedIds = answer.question_id == null ? [] : questionTopics.get(answer.question_id);
      const covered = topics(Array.isArray(snapshot?.topics)
        ? snapshot.topics : storedIds?.length ? storedIds : question?.topics);
      // ExcelJS treats strings literally, including responses starting with '='.
      const response = answer.selected_answer ?? (answer.raw_response == null
        ? "" : typeof answer.raw_response === "string" ? answer.raw_response : JSON.stringify(answer.raw_response));
      answers.addRow({
        ...studentsById.get(answer.student_id),
        answer_id: String(answer.answer_id), session_id: answer.quiz_session_id,
        question_id: answer.question_id == null ? null : String(answer.question_id),
        lesson_id: answer.lesson_id == null ? null : String(answer.lesson_id),
        question: snapshot?.prompt ?? question?.prompt ?? "",
        snippet: snapshot && "snippet" in snapshot ? snapshot.snippet ?? "" : question?.snippet ?? "",
        response, is_correct: answer.is_correct, topics: covered.labels, topic_ids: covered.ids,
        question_source: snapshot?.prompt != null ? "Saved snapshot" : question ? "Current question" : "Unavailable",
        answered_at: date(answer.answered_at),
      });
    });
  answers.getColumn("answered_at").numFmt = "yyyy-mm-dd hh:mm:ss";

  const lessons = addSheet("Lessons", [
    { header: "Lesson ID", key: "lesson_id", width: 14 },
    { header: "Lesson name", key: "name", width: 45 },
    { header: "Lesson topics", key: "topics", width: 55 },
    { header: "Topic node IDs", key: "topic_ids", width: 45 },
  ]);
  [...data.lessons].sort((a, b) => a.lesson_id - b.lesson_id).forEach((lesson) => {
    const storedIds = lessonTopics.get(lesson.lesson_id);
    const covered = topics(storedIds?.length ? storedIds : lesson.topics);
    lessons.addRow({ lesson_id: String(lesson.lesson_id), name: lesson.name, topics: covered.labels, topic_ids: covered.ids });
  });

  const sessions = addSheet("Quiz sessions", [
    ...identity,
    { header: "Session ID", key: "session_id", width: 38 },
    { header: "Activity type", key: "activity_type", width: 20 },
    { header: "Status", key: "status", width: 18 },
    { header: "Lesson ID", key: "lesson_id", width: 14 },
    { header: "Lesson name", key: "lesson_name", width: 40 },
    { header: "Selected review topic", key: "selected_topic", width: 35 },
    { header: "Selected topic node ID", key: "selected_topic_id", width: 32 },
    { header: "Questions issued", key: "question_count", width: 18 },
    { header: "Questions answered", key: "answered_count", width: 20 },
    { header: "Questions correct", key: "correct_count", width: 19 },
    { header: "Started at (UTC)", key: "started_at", width: 24 },
    { header: "Completed at (UTC)", key: "completed_at", width: 24 },
    { header: "Ended at (UTC)", key: "ended_at", width: 24 },
  ]);
  [...sessionsById.values()].sort((a, b) => byStudentAndTime(a, b, a.started_at, b.started_at) || a.id.localeCompare(b.id))
    .forEach((session) => sessions.addRow({
      ...studentsById.get(session.student_id), session_id: session.id,
      activity_type: session.quiz_mode, status: session.status,
      lesson_id: session.lesson_id == null ? null : String(session.lesson_id),
      lesson_name: session.lesson_id == null ? "" : lessonsById.get(session.lesson_id)?.name ?? "",
      selected_topic: session.quiz_mode === "lesson" ? "" : session.focus_topic_label
        ?? (session.focus_node_id ? graphLabels.get(session.focus_node_id) ?? session.focus_node_id : ""),
      selected_topic_id: session.quiz_mode === "lesson" ? "" : session.focus_node_id,
      question_count: session.question_count, answered_count: session.answered_count, correct_count: session.correct_count,
      started_at: date(session.started_at), completed_at: date(session.completed_at), ended_at: date(session.ended_at),
    }));
  for (const key of ["started_at", "completed_at", "ended_at"]) sessions.getColumn(key).numFmt = "yyyy-mm-dd hh:mm:ss";

  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount > 1_048_576) throw new Error("This export exceeds Excel's row limit. Select fewer students.");
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sheet.rowCount, column: sheet.columnCount },
    };
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      row.alignment = { vertical: "top", wrapText: true };
      row.eachCell((cell) => {
        if (typeof cell.value === "string" && cell.value.length > 32_767) {
          throw new Error("An answer or question exceeds Excel's cell text limit. Contact support to export this activity without truncation.");
        }
      });
    });
  }
  return workbook;
}
