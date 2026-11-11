import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractGraphTopics } from "@/utils/graph-topics";
import type { getExportDateWindow } from "./date-range";
import type {
  ExportAnswer, ExportLesson, ExportQuestion, ExportSession,
  ExportSnapshot, ExportStudent, ExportTopicLink, StudentExportData,
} from "./types";

export class StudentExportError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

// Keep paging below PostgREST's default row limit. Never export a truncated first page.
const PAGE_SIZE = 500;
const TEST_STUDENT_EMAIL = "test@test.com";
type PageResult<T> = { data: T[] | null; error: { message: string } | null };
export async function readAllRows<T>(
  query: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw new StudentExportError("Could not read student activity. Please try again.");
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function readBatches<T>(
  ids: (string | number)[],
  query: (ids: (string | number)[], from: number, to: number) => PromiseLike<PageResult<T>>,
) {
  const rows: T[] = [];
  const uniqueIds = Array.from(new Set(ids));
  for (let index = 0; index < uniqueIds.length; index += 50) {
    const batch = uniqueIds.slice(index, index + 50);
    rows.push(...await readAllRows((from, to) => query(batch, from, to)));
  }
  return rows;
}

export async function getExportContext(className: string) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new StudentExportError("Please sign in to export student activity.", 401);

  // The generated schema predates unified quiz sessions; keep their types local to this feature.
  const db = supabase as unknown as SupabaseClient;
  const courses = await readAllRows<{ class_id: number; classes: { name: string } | { name: string }[] | null }>(
    (from, to) => db.from("professor_courses")
      .select("class_id, classes!inner(name)")
      .eq("owner_id", user.id).order("class_id").range(from, to),
  );
  let decoded: string;
  try { decoded = decodeURIComponent(className).trim(); }
  catch { throw new StudentExportError("Invalid class name.", 400); }
  const namedCourses = courses.map((course) => ({
    classId: course.class_id,
    className: (Array.isArray(course.classes) ? course.classes[0] : course.classes)?.name ?? "",
  }));
  let matches = namedCourses.filter((course) => course.className === decoded);
  if (!matches.length) matches = namedCourses.filter(
    (course) => course.className.toLowerCase() === decoded.replace(/-/g, " ").toLowerCase(),
  );
  if (matches.length !== 1) throw new StudentExportError(
    matches.length ? "More than one class has this name. Give each class a unique name before exporting."
      : "You do not have instructor access to this class.",
    matches.length ? 409 : 403,
  );
  const course = matches[0];

  // This RPC ships in the same transaction as the instructor SELECT policies. Without
  // it, student-only RLS would silently return an empty session sheet to instructors.
  const { data: canExport, error: accessError } = await db.rpc("can_export_class_activity", {
    p_class_id: course.classId,
  });
  if (accessError) throw new StudentExportError(
    "Student exports are not enabled yet. Ask your administrator to finish enabling exports for this app.",
    503,
  );
  if (!canExport) throw new StudentExportError("You do not have instructor access to this class.", 403);

  type Enrollment = {
    student_id: string;
    student_name: string | null;
    students: { display_name: string | null; email: string | null } |
      { display_name: string | null; email: string | null }[] | null;
  };
  const enrollments = await readAllRows<Enrollment>((from, to) => db.from("enrollments")
    .select("student_id, student_name, students(display_name, email)")
    .eq("class_id", course.classId).order("student_id").range(from, to));
  const roster: ExportStudent[] = enrollments.map((enrollment) => {
    const profile = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students;
    return {
      student_id: enrollment.student_id,
      display_name: profile?.display_name ?? enrollment.student_name ?? "",
      email: profile?.email ?? "",
    };
  });
  const excludedStudentIds = new Set(roster
    .filter((student) => student.email.trim().toLowerCase() === TEST_STUDENT_EMAIL)
    .map((student) => student.student_id));
  return { db, ...course, students: roster.filter((student) => !excludedStudentIds.has(student.student_id)), excludedStudentIds };
}

type ExportContext = Awaited<ReturnType<typeof getExportContext>>;

export async function getClassActivityStartDate({ db, classId, excludedStudentIds }: ExportContext) {
  const answers = db.from("student_question_answers").select("answered_at").eq("class_id", classId)
    .not("answered_at", "is", null);
  const sessions = db.from("quiz_sessions").select("started_at").eq("class_id", classId);
  for (const studentId of excludedStudentIds) {
    answers.neq("student_id", studentId);
    sessions.neq("student_id", studentId);
  }
  const [firstAnswer, firstSession] = await Promise.all([
    answers.order("answered_at").limit(1).maybeSingle(),
    sessions.order("started_at").limit(1).maybeSingle(),
  ]);
  if (firstAnswer.error || firstSession.error) {
    throw new StudentExportError("Could not read the class activity dates. Please try again.");
  }
  const dates = [firstAnswer.data?.answered_at, firstSession.data?.started_at]
    .filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)))
    .map((value) => new Date(value).toISOString().slice(0, 10));
  return dates.sort()[0] ?? null;
}

export async function getStudentExportData(
  context: ExportContext,
  studentIds: string[],
  dateWindow?: NonNullable<ReturnType<typeof getExportDateWindow>>,
): Promise<StudentExportData> {
  const { db, classId, className, students, excludedStudentIds } = context;
  studentIds = studentIds.filter((id) => !excludedStudentIds.has(id));
  const selected = new Set(studentIds);
  if (!selected.size) throw new StudentExportError("Select at least one student.", 400);
  const enrolled = new Set(students.map((student) => student.student_id));
  if (studentIds.some((id) => !enrolled.has(id))) {
    throw new StudentExportError("Only students enrolled in this class can be exported.", 403);
  }
  const [answers, sessions, graph] = await Promise.all([
    readBatches<ExportAnswer>(studentIds, (ids, from, to) => {
      const query = db.from("student_question_answers")
        .select("answer_id, student_id, question_id, lesson_id, quiz_session_id, selected_answer, raw_response, is_correct, answered_at")
        .eq("class_id", classId).in("student_id", ids);
      if (dateWindow) query.gte("answered_at", dateWindow.startInclusive).lt("answered_at", dateWindow.endExclusive);
      return query.order("answer_id").range(from, to);
    }),
    readBatches<ExportSession>(studentIds, (ids, from, to) => {
      const query = db.from("quiz_sessions")
        .select("id, student_id, lesson_id, quiz_mode, status, focus_node_id, focus_topic_label, question_count, answered_count, correct_count, started_at, completed_at, ended_at")
        .eq("class_id", classId).in("student_id", ids);
      if (dateWindow) query.gte("started_at", dateWindow.startInclusive).lt("started_at", dateWindow.endExclusive);
      return query.order("id").range(from, to);
    }),
    db.from("class_knowledge_graph").select("react_flow_data").eq("class_id", classId).maybeSingle(),
  ]);
  if (graph.error) throw new StudentExportError("Could not read the class topics. Please try again.");
  const questionIds = answers.flatMap((answer) => answer.question_id == null ? [] : [answer.question_id]);
  // Answers can fall inside the window even if their session started before it.
  const answerSessionIds = answers.flatMap((answer) => answer.quiz_session_id == null ? [] : [answer.quiz_session_id]);
  const lessonIds = [...answers, ...sessions].flatMap((row) => row.lesson_id == null ? [] : [row.lesson_id]);
  const [questions, lessons, snapshots, questionTopics, lessonTopics] = await Promise.all([
    readBatches<ExportQuestion>(questionIds, (ids, from, to) => db.from("questions")
      .select("question_id, prompt, snippet, topics").in("question_id", ids).order("question_id").range(from, to)),
    readBatches<ExportLesson>(lessonIds, (ids, from, to) => db.from("lessons")
      .select("lesson_id, name, topics").in("lesson_id", ids).order("lesson_id").range(from, to)),
    readBatches<ExportSnapshot>(answerSessionIds, (ids, from, to) => db.from("quiz_session_questions")
      .select("quiz_session_id, question_id, question_snapshot").in("quiz_session_id", ids)
      .order("id").range(from, to)),
    readBatches<ExportTopicLink & { question_id: number }>(questionIds, (ids, from, to) => db.from("class_question_bank")
      .select("question_id, topic_node_ids").eq("class_id", classId).in("question_id", ids)
      .order("question_id").range(from, to)),
    readBatches<ExportTopicLink & { lesson_id: number }>(lessonIds, (ids, from, to) => db.from("class_lesson_bank")
      .select("lesson_id, topic_node_ids").eq("class_id", classId).in("lesson_id", ids)
      .order("lesson_id").range(from, to)),
  ]);
  return {
    className, students: students.filter((student) => selected.has(student.student_id)),
    answers, sessions, questions, lessons, snapshots, questionTopics, lessonTopics,
    graphTopics: extractGraphTopics(graph.data?.react_flow_data),
  };
}
