"use server";

import { createClient } from "@/utils/supabase/server";
import { Json } from "@/supabase";
import {
  generateKnowledgeGraphFromCourseMaterial,
  saveGeneratedKnowledgeGraph,
} from "@/app/classes/[className]/knowledge-graph/actions";
import {
  extractGraphTopics,
  resolveGraphTopicValues,
} from "@/utils/graph-topics";

type StartingPoint = "scratch" | "syllabus" | "copy";
type GraphGranularity = "simple" | "standard" | "detailed";

export type CatalogCourseOption = {
  catalogCourseId: number;
  code: string;
  title: string;
  department: string | null;
  level: number | null;
};

const CUSTOM_CATALOG_DEPARTMENT = "Other";
const CUSTOM_CATALOG_NAME_MAX_LENGTH = 160;

const normalizeCatalogCourseName = (value: string) =>
  value.trim().replace(/\s+/g, " ");

const createCustomCatalogCode = (courseName: string) => {
  let hash = 0;
  for (let index = 0; index < courseName.length; index += 1) {
    hash = (hash * 31 + courseName.charCodeAt(index)) | 0;
  }
  return `OTHER-${(hash >>> 0).toString(36).toUpperCase()}`;
};

const toCatalogCourseOption = (course: any): CatalogCourseOption => ({
  catalogCourseId: Number(course.catalog_course_id),
  code: String(course.code ?? ""),
  title: String(course.title ?? ""),
  department: course.department ?? null,
  level: typeof course.level === "number" ? course.level : null,
});

export type GraphSourceOption = {
  classId: number;
  className: string;
  ownerId: string | null;
  topicCount: number;
  edgeCount: number;
  lessonCount: number;
};

export type GraphSourceLesson = {
  lessonId: number;
  name: string;
  topics: string[];
  questionCount: number;
};

type CreateClassOptions = {
  catalogCourseId?: number | null;
  startingPoint?: StartingPoint;
  courseMaterial?: string;
  graphGranularity?: GraphGranularity;
  sourceClassId?: number | null;
  selectedLessonIds?: number[];
};

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const createStarterGraph = async (
  supabase: ReturnType<typeof createClient>,
  classId: number,
) => {
  const starterGraph = blankGraphData();
  return (supabase as any)
    .from("class_knowledge_graph")
    .upsert(
      {
        class_id: classId,
        nodes: starterGraph.nodes,
        edges: starterGraph.edges,
        react_flow_data: starterGraph.react_flow_data,
      },
      { onConflict: "class_id" },
    );
};

const blankGraphData = (): {
  nodes: string[];
  edges: string[];
  react_flow_data: Json[];
} => ({
  nodes: ["Edit me!"],
  edges: [],
  react_flow_data: [
    {
      reactFlowNodes: [
        {
          id: "1",
          type: "editableNode",
          position: { x: 160, y: 120 },
          data: { label: "Edit me!" },
        },
      ],
      reactFlowEdges: [],
    } as unknown as Json,
  ],
});

export const getClassData = async (): Promise<(string | null)[]> => {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("No user found");
    return [];
  }

  const { data, error } = (await supabase
    .from("professor_courses")
    .select("class_id")) as { data: { class_id: number }[] | null; error: any };

  if (error) {
    console.error("Error fetching class IDs: ", error);
    return [];
  }

  if (!data) {
    return [];
  }

  const classIDs = data.map((classData) => classData.class_id);

  // const classIDs = data.map((classData) => classData.class_id);

  const { data: userClasses, error: classesError } = await supabase
    .from("classes")
    .select("name")
    .in("class_id", classIDs);

  if (classesError) {
    console.error("Error fetching classes: ", classesError);
    return [];
  }

  return userClasses.map(
    (className: { name: string | null }) => className.name
  );
};

export const getCatalogCourses = async (): Promise<CatalogCourseOption[]> => {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("catalog_courses")
    .select("catalog_course_id, code, title, department, level")
    .order("code", { ascending: true });

  if (error) {
    console.error("Error fetching catalog courses: ", error);
    return [];
  }

  return (data ?? []).map(toCatalogCourseOption);
};

export const getOrCreateCustomCatalogCourse = async (
  courseName: string,
  department: string,
  level: number,
): Promise<
  | { success: true; course: CatalogCourseOption }
  | { success: false; error: string }
> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to add a course." };
  }

  const normalizedName = normalizeCatalogCourseName(courseName);
  const normalizedDepartment =
    normalizeCatalogCourseName(department) || CUSTOM_CATALOG_DEPARTMENT;
  if (!normalizedName) {
    return { success: false, error: "Enter the catalog course name." };
  }
  if (normalizedName.length > CUSTOM_CATALOG_NAME_MAX_LENGTH) {
    return {
      success: false,
      error: `Keep the catalog course name under ${CUSTOM_CATALOG_NAME_MAX_LENGTH} characters.`,
    };
  }
  if (/[\u0000-\u001f\u007f]/.test(normalizedName)) {
    return {
      success: false,
      error: "The catalog course name contains unsupported characters.",
    };
  }

  const findExistingCourse = async () => {
    const { data, error } = await (supabase as any)
      .from("catalog_courses")
      .select("catalog_course_id, code, title, department, level")
      .eq("department", normalizedDepartment)
      .limit(1000);

    if (error) return { course: null, error };

    const comparisonName = normalizedName.toLocaleLowerCase();
    const match = (data ?? []).find((course: any) => {
      const code = normalizeCatalogCourseName(String(course.code ?? ""));
      const title = normalizeCatalogCourseName(String(course.title ?? ""));
      return (
        code.toLocaleLowerCase() === comparisonName ||
        title.toLocaleLowerCase() === comparisonName ||
        `${code} - ${title}`.toLocaleLowerCase() === comparisonName
      );
    });

    return {
      course: match ? toCatalogCourseOption(match) : null,
      error: null,
    };
  };

  const existing = await findExistingCourse();
  if (existing.error) {
    console.error("Error checking custom catalog courses:", existing.error);
    return { success: false, error: "Unable to check the course catalog." };
  }
  if (existing.course) {
    return { success: true, course: existing.course };
  }

  const { data: insertedCourse, error: insertError } = await (supabase as any)
    .from("catalog_courses")
    .insert({
      code: createCustomCatalogCode(
        `${normalizedDepartment}:${normalizedName}`.toLocaleLowerCase(),
      ),
      title: normalizedName,
      department: normalizedDepartment,
      level,
    })
    .select("catalog_course_id, code, title, department, level")
    .single();

  if (insertError) {
    // A concurrent request may have inserted the same course first.
    if (insertError.code === "23505") {
      const concurrentCourse = await findExistingCourse();
      if (concurrentCourse.course) {
        return { success: true, course: concurrentCourse.course };
      }
    }

    console.error("Error creating custom catalog course:", insertError);
    return {
      success: false,
      error:
        insertError.code === "42501"
          ? "You do not have permission to add courses to the catalog. An administrator must enable catalog-course inserts."
          : "Unable to add this course to the catalog.",
    };
  }

  return { success: true, course: toCatalogCourseOption(insertedCourse) };
};

export const getGraphSourcesForCatalogCourse = async (
  catalogCourseId: number,
): Promise<GraphSourceOption[]> => {
  const supabase = createClient();

  const { data: graphRows, error: graphError } = await (supabase as any)
    .from("class_knowledge_graph")
    .select("class_id, nodes, edges, classes!inner(class_id, name, catalog_course_id)")
    .eq("classes.catalog_course_id", catalogCourseId);

  if (graphError) {
    console.error("Error fetching catalog graph sources: ", graphError);
    return [];
  }

  const sourceClassIds = (graphRows ?? []).map((row: any) =>
    Number(row.class_id),
  );

  if (!sourceClassIds.length) return [];

  const { data: ownerRows } = await (supabase as any)
    .from("professor_courses")
    .select("class_id, owner_id")
    .in("class_id", sourceClassIds);

  const { data: lessonRows } = await (supabase as any)
    .from("class_lesson_bank")
    .select("class_id, lesson_id")
    .in("class_id", sourceClassIds);

  const ownerByClassId = new Map<number, string>(
    (ownerRows ?? []).map((row: any) => [
      Number(row.class_id),
      String(row.owner_id ?? ""),
    ]),
  );
  const lessonCountByClassId = new Map<number, number>();

  (lessonRows ?? []).forEach((row: any) => {
    const classId = Number(row.class_id);
    lessonCountByClassId.set(
      classId,
      (lessonCountByClassId.get(classId) ?? 0) + 1,
    );
  });

  return (graphRows ?? []).map((graph: any) => ({
    classId: Number(graph.class_id),
    className: String(
      (Array.isArray(graph.classes) ? graph.classes[0] : graph.classes)?.name ??
        "Untitled class",
    ),
    ownerId: ownerByClassId.get(Number(graph.class_id)) ?? null,
    topicCount: Array.isArray(graph.nodes) ? graph.nodes.length : 0,
    edgeCount: Array.isArray(graph.edges) ? graph.edges.length : 0,
    lessonCount: lessonCountByClassId.get(Number(graph.class_id)) ?? 0,
  }));
};

export const getLessonsForGraphSource = async (
  sourceClassId: number,
): Promise<GraphSourceLesson[]> => {
  const supabase = createClient();

  const { data: lessonLinks, error: linkError } = await (supabase as any)
    .from("class_lesson_bank")
    .select("lesson_id")
    .eq("class_id", sourceClassId);

  if (linkError) {
    console.error("Error fetching source lesson links: ", linkError);
    return [];
  }

  const lessonIds = (lessonLinks ?? []).map((row: any) =>
    Number(row.lesson_id),
  );
  if (!lessonIds.length) return [];

  const { data: lessons, error: lessonError } = await (supabase as any)
    .from("lessons")
    .select("lesson_id, name, topics")
    .in("lesson_id", lessonIds)
    .order("name", { ascending: true });

  if (lessonError) {
    console.error("Error fetching source lessons: ", lessonError);
    return [];
  }

  const { data: questionLinks } = await (supabase as any)
    .from("lesson_question_bank")
    .select("lesson_id, question_id")
    .in("lesson_id", lessonIds);

  const questionCountByLessonId = new Map<number, number>();
  (questionLinks ?? []).forEach((row: any) => {
    const lessonId = Number(row.lesson_id);
    questionCountByLessonId.set(
      lessonId,
      (questionCountByLessonId.get(lessonId) ?? 0) + 1,
    );
  });

  return (lessons ?? []).map((lesson: any) => ({
    lessonId: Number(lesson.lesson_id),
    name: String(lesson.name ?? "Untitled lesson"),
    topics: Array.isArray(lesson.topics) ? lesson.topics : [],
    questionCount: questionCountByLessonId.get(Number(lesson.lesson_id)) ?? 0,
  }));
};

const copySelectedLessons = async ({
  supabase,
  ownerId,
  sourceClassId,
  targetClassId,
  selectedLessonIds,
}: {
  supabase: ReturnType<typeof createClient>;
  ownerId: string;
  sourceClassId: number;
  targetClassId: number;
  selectedLessonIds: number[];
}) => {
  const normalizedLessonIds = Array.from(new Set(selectedLessonIds)).filter(
    Number.isFinite,
  );

  if (!normalizedLessonIds.length) return;

  const [{ data: sourceLessonLinks }, { data: sourceGraph }] =
    await Promise.all([
      (supabase as any)
        .from("class_lesson_bank")
        .select("lesson_id, topic_node_ids")
        .eq("class_id", sourceClassId)
        .in("lesson_id", normalizedLessonIds),
      (supabase as any)
        .from("class_knowledge_graph")
        .select("react_flow_data")
        .eq("class_id", sourceClassId)
        .maybeSingle(),
    ]);
  const sourceGraphTopics = extractGraphTopics(
    sourceGraph?.react_flow_data ?? [],
  );
  const sourceLessonTopicIds = new Map<number, string[]>(
    (sourceLessonLinks ?? []).map((link: any) => [
      Number(link.lesson_id),
      Array.isArray(link.topic_node_ids) ? link.topic_node_ids : [],
    ]),
  );

  const { data: sourceLessons, error: sourceLessonError } = await (
    supabase as any
  )
    .from("lessons")
    .select("*")
    .in("lesson_id", normalizedLessonIds);

  if (sourceLessonError || !sourceLessons?.length) {
    console.error("Error fetching source lessons: ", sourceLessonError);
    return;
  }

  const lessonById = new Map<number, any>(
    sourceLessons.map((lesson: any) => [Number(lesson.lesson_id), lesson]),
  );
  const copiedLessonIdBySourceId = new Map<number, number>();

  for (const sourceLessonId of normalizedLessonIds) {
    const sourceLesson = lessonById.get(sourceLessonId);
    if (!sourceLesson) continue;

    const { lesson_id: _sourceLessonId, ...lessonInsert } = sourceLesson;
    if ("is_published" in lessonInsert) {
      lessonInsert.is_published = false;
    }

    const { data: newLesson, error: lessonInsertError } = await (
      supabase as any
    )
      .from("lessons")
      .insert(lessonInsert)
      .select("lesson_id")
      .single();

    if (lessonInsertError || !newLesson) {
      console.error("Error copying lesson: ", lessonInsertError);
      continue;
    }

    const newLessonId = Number(newLesson.lesson_id);
    copiedLessonIdBySourceId.set(sourceLessonId, newLessonId);
  }

  const classLessonRows = Array.from(copiedLessonIdBySourceId.entries()).map(
    ([sourceLessonId, lessonId]) => ({
      owner_id: ownerId,
      class_id: targetClassId,
      lesson_id: lessonId,
      topic_node_ids: resolveGraphTopicValues(
        sourceGraphTopics,
        sourceLessonTopicIds.get(sourceLessonId)?.length
          ? sourceLessonTopicIds.get(sourceLessonId)
          : lessonById.get(sourceLessonId)?.topics,
      ).nodeIds,
    }),
  );

  if (classLessonRows.length) {
    const { error: classLessonError } = await (supabase as any)
      .from("class_lesson_bank")
      .insert(classLessonRows);

    if (classLessonError) {
      console.error("Error linking copied lessons: ", classLessonError);
    }
  }

  const copiedSourceLessonIds = Array.from(copiedLessonIdBySourceId.keys());
  if (!copiedSourceLessonIds.length) return;

  const { data: questionLinks, error: questionLinkError } = await (
    supabase as any
  )
    .from("lesson_question_bank")
    .select("lesson_id, question_id")
    .in("lesson_id", copiedSourceLessonIds);

  if (questionLinkError) {
    console.error("Error fetching source lesson questions: ", questionLinkError);
    return;
  }

  const sourceQuestionIds = Array.from(
    new Set(
      (questionLinks ?? []).map((row: any) => Number(row.question_id)),
    ),
  ).filter(Number.isFinite);

  if (!sourceQuestionIds.length) return;

  const { data: sourceQuestions, error: questionError } = await (
    supabase as any
  )
    .from("questions")
    .select("*")
    .in("question_id", sourceQuestionIds);

  if (questionError || !sourceQuestions?.length) {
    console.error("Error fetching source questions: ", questionError);
    return;
  }

  const copiedQuestionIdBySourceId = new Map<number, number>();

  const { data: sourceQuestionLinks } = await (supabase as any)
    .from("class_question_bank")
    .select("question_id, topic_node_ids")
    .eq("class_id", sourceClassId)
    .in("question_id", sourceQuestionIds);
  const sourceQuestionTopicIds = new Map<number, string[]>(
    (sourceQuestionLinks ?? []).map((link: any) => [
      Number(link.question_id),
      Array.isArray(link.topic_node_ids) ? link.topic_node_ids : [],
    ]),
  );
  const sourceQuestionById = new Map<number, any>(
    sourceQuestions.map((question: any) => [
      Number(question.question_id),
      question,
    ]),
  );

  for (const questionChunk of chunkArray(sourceQuestions, 100)) {
    const questionInsertRows = questionChunk.map((sourceQuestion: any) => {
      const { question_id: _sourceQuestionId, ...questionInsert } =
        sourceQuestion;
      return {
        ...questionInsert,
        owner_id: ownerId,
      };
    });

    const { data: newQuestions, error: questionInsertError } = await (
      supabase as any
    )
      .from("questions")
      .insert(questionInsertRows)
      .select("question_id");

    if (questionInsertError || !newQuestions) {
      console.error("Error copying questions: ", questionInsertError);
      continue;
    }

    questionChunk.forEach((sourceQuestion: any, index: number) => {
      const newQuestion = newQuestions[index];
      if (!newQuestion) return;
      copiedQuestionIdBySourceId.set(
        Number(sourceQuestion.question_id),
        Number(newQuestion.question_id),
      );
    });
  }

  const copiedQuestionIds = Array.from(copiedQuestionIdBySourceId.values());
  if (!copiedQuestionIds.length) return;

  const classQuestionRows = Array.from(
    copiedQuestionIdBySourceId.entries(),
  ).map(([sourceQuestionId, questionId]) => ({
    owner_id: ownerId,
    class_id: targetClassId,
    question_id: questionId,
    topic_node_ids: resolveGraphTopicValues(
      sourceGraphTopics,
      sourceQuestionTopicIds.get(sourceQuestionId)?.length
        ? sourceQuestionTopicIds.get(sourceQuestionId)
        : sourceQuestionById.get(sourceQuestionId)?.topics,
    ).nodeIds,
  }));

  for (const classQuestionChunk of chunkArray(classQuestionRows, 200)) {
    const { error: classQuestionError } = await (supabase as any)
      .from("class_question_bank")
      .insert(classQuestionChunk);

    if (classQuestionError) {
      console.error("Error linking copied questions to class: ", classQuestionError);
    }
  }

  const lessonQuestionRows = (questionLinks ?? [])
    .map((link: any) => {
      const newLessonId = copiedLessonIdBySourceId.get(Number(link.lesson_id));
      const newQuestionId = copiedQuestionIdBySourceId.get(
        Number(link.question_id),
      );

      if (!newLessonId || !newQuestionId) return null;

      return {
        owner_id: ownerId,
        lesson_id: newLessonId,
        question_id: newQuestionId,
      };
    })
    .filter(Boolean);

  for (const lessonQuestionChunk of chunkArray(lessonQuestionRows, 200)) {
    const { error: lessonQuestionError } = await (supabase as any)
      .from("lesson_question_bank")
      .insert(lessonQuestionChunk);

    if (lessonQuestionError) {
      console.error(
        "Error linking copied questions to lessons: ",
        lessonQuestionError,
      );
    }
  }
};

export const createNewClass = async (
  newClassName: string,
  classLevel: number,
  options: CreateClassOptions = {},
) => {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  const classInsert: Record<string, unknown> = {
    name: newClassName,
    section_number: "",
    description: "",
    level: classLevel,
  };

  if (options.catalogCourseId) {
    classInsert.catalog_course_id = options.catalogCourseId;
  }

  const { data: insertedClass, error } = await (supabase as any)
    .from("classes")
    .insert([classInsert])
    .select("class_id")
    .single();

  if (error) {
    console.error("Error creating new class: ", error);
    return { success: false, error: error.message };
  }

  const classId = Number(insertedClass.class_id);
  let warning: string | undefined;

  const startingPoint = options.startingPoint ?? "scratch";

  if (startingPoint === "copy" && options.sourceClassId) {
    const { data: sourceGraph, error: sourceGraphError } = await (supabase as any)
      .from("class_knowledge_graph")
      .select("nodes, edges, react_flow_data")
      .eq("class_id", options.sourceClassId)
      .maybeSingle();

    if (sourceGraphError || !sourceGraph) {
      console.error("Error fetching source graph: ", sourceGraphError);
      await createStarterGraph(supabase, classId);
      warning = "The selected graph could not be copied, so a starter graph was created.";
    } else {
      const { error: graphCopyError } = await (supabase as any)
        .from("class_knowledge_graph")
        .upsert(
          {
            class_id: classId,
            nodes: sourceGraph.nodes ?? [],
            edges: sourceGraph.edges ?? [],
            react_flow_data: sourceGraph.react_flow_data ?? [],
          },
          { onConflict: "class_id" },
        );

      if (graphCopyError) {
        console.error("Error copying graph: ", graphCopyError);
        await createStarterGraph(supabase, classId);
        warning =
          "The selected graph could not be copied, so a starter graph was created.";
      } else if (options.selectedLessonIds?.length) {
        await copySelectedLessons({
          supabase,
          ownerId: user.id,
          sourceClassId: options.sourceClassId,
          targetClassId: classId,
          selectedLessonIds: options.selectedLessonIds,
        });
      }
    }
  } else if (startingPoint === "syllabus" && options.courseMaterial?.trim()) {
    const generated = await generateKnowledgeGraphFromCourseMaterial({
      className: newClassName,
      courseMaterial: options.courseMaterial,
      granularity: options.graphGranularity ?? "standard",
    });

    if (!generated.success || !generated.graphData) {
      await createStarterGraph(supabase, classId);
      warning =
        typeof generated.error === "string"
          ? `Graph generation failed: ${generated.error}`
          : "Graph generation failed, so a starter graph was created.";
    } else {
      const saved = await saveGeneratedKnowledgeGraph(newClassName, {
        nodes: generated.graphData.nodes,
        edges: generated.graphData.edges,
        react_flow_data: generated.graphData.react_flow_data,
      });

      if (!saved.success) {
        await createStarterGraph(supabase, classId);
        warning = "The generated graph could not be saved, so a starter graph was created.";
      }
    }
  } else {
    const { error: graphInsertError } = await createStarterGraph(
      supabase,
      classId,
    );

    if (graphInsertError) {
      console.error("Error creating starter graph: ", graphInsertError);
      return { success: false, error: graphInsertError.message };
    }
  }

  return { success: true, classId, warning };
};
