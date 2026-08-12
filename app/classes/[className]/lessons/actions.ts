"use server";

import { createClient } from "@/utils/supabase/server";
import { GraphTopic, Lesson } from "@/types/content.types";
import { getKnowledgeGraphData } from "../knowledge-graph/actions";
import {
  extractGraphTopics,
  resolveGraphTopicValues,
} from "@/utils/graph-topics";

export const getAllLessons = async () => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  const { data, error } = await supabase
    .from("professor_lessons")
    .select("lesson_id");

  if (error) {
    console.error("Error fetching lessons: ", error);
    return { success: false, error };
  }

  const userLessonIDs = data.map((lesson) => lesson.lesson_id);

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .in("lesson_id", userLessonIDs);

  if (lessonsError) {
    console.error("Error fetching lessons: ", lessonsError);
    return { success: false, error: lessonsError };
  }

  return { success: true, lessons };
};

async function getClassIdByName(
  supabase: ReturnType<typeof createClient>,
  raw: string,
) {
  const cleaned = decodeURIComponent(raw)
    .replace(/%20/g, " ")
    .replace(/-/g, " ")
    .trim();
  const { data, error } = await supabase
    .from("classes")
    .select("class_id")
    .ilike("name", cleaned)
    .limit(1);
  if (error) throw error;
  return data?.[0]?.class_id as number;
}

export const lessonDataFor = async (className: string): Promise<Lesson[]> => {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("No user found");
    return [];
  }

  const classId = await getClassIdByName(supabase, className);

  const { data: lessonIDs, error: lessonIDsError } = await supabase
    .from("class_lesson_bank")
    .select("lesson_id, topic_node_ids")
    .eq("class_id", classId);

  if (lessonIDsError) {
    console.error("Error fetching lesson IDs: ", lessonIDsError);
    return [];
  }

  if (!lessonIDs?.length) return [];

  const { data: lessonData, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .in(
      "lesson_id",
      lessonIDs.map((lesson) => lesson.lesson_id),
    );

  if (lessonsError) {
    console.error("Error fetching lessons: ", lessonsError);
    return [];
  }

  const topicIdsByLessonId = new Map(
    lessonIDs.map((link) => [link.lesson_id, link.topic_node_ids ?? []]),
  );
  const { graphData } = await getKnowledgeGraphData(className);
  const graphTopics = extractGraphTopics(
    graphData && "react_flow_data" in graphData
      ? graphData.react_flow_data
      : [],
  );

  const lessonsWithNodeIds = lessonData.map((lesson) => {
    const storedNodeIds = topicIdsByLessonId.get(lesson.lesson_id) ?? [];
    const resolved = resolveGraphTopicValues(
      graphTopics,
      storedNodeIds.length ? storedNodeIds : lesson.topics,
    );

    return {
      ...lesson,
      topics: resolved.labels,
      topic_node_ids: resolved.nodeIds,
    };
  });

  await Promise.all(
    lessonsWithNodeIds
      .filter(
        (lesson) =>
          !(topicIdsByLessonId.get(lesson.lesson_id!) ?? []).length &&
          lesson.topic_node_ids?.length,
      )
      .map((lesson) =>
        supabase
          .from("class_lesson_bank")
          .update({ topic_node_ids: lesson.topic_node_ids })
          .eq("class_id", classId)
          .eq("lesson_id", lesson.lesson_id!),
      ),
  );

  return lessonsWithNodeIds;
};

export const createNewLesson = async (
  className: string,
  {
    lessonName,
    topicNodeIds,
    isPublished,
  }: { lessonName: string; topicNodeIds: string[]; isPublished: boolean },
) => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("createNewLesson user id", user?.id);
  console.log("createNewLesson className", className);
  console.log("payload", { lessonName, topicNodeIds, isPublished });
  if (!user?.id) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  const classId = await getClassIdByName(supabase, className);
  if (!classId) {
    console.error("createNewLesson: class not found for", className);
    return { success: false, error: "Class not found" };
  }

  const { graphData } = await getKnowledgeGraphData(className);

  if (!graphData || !("react_flow_data" in graphData)) {
    console.error("createNewLesson: invalid or missing graphData");
    return { success: false, error: "Unable to verify topics for this class." };
  }

  try {
    const PLACEHOLDER_LABELS = ["Edit me!", "Edit me 😊!"];

    const nodesArray: string[] = Array.isArray((graphData as any).nodes)
      ? ((graphData as any).nodes as any[])
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
      : [];
    if (nodesArray.length === 1 && PLACEHOLDER_LABELS.includes(nodesArray[0])) {
      console.error(
        "createNewLesson: only placeholder node exists (nodes array)",
      );
      return {
        success: false,
        error:
          "You must edit your class graph first (rename or add topics) before creating lessons.",
      };
    }

    const { react_flow_data } = graphData as any;
    const flow =
      Array.isArray(react_flow_data) && react_flow_data[0]
        ? (react_flow_data[0] as any)
        : null;
    const flowNodes: any[] = flow?.reactFlowNodes ?? [];
    const flowLabels: string[] = (Array.isArray(flowNodes) ? flowNodes : [])
      .map((n) => String(n?.data?.label ?? "").trim())
      .filter(Boolean);
    if (flowLabels.length === 1 && PLACEHOLDER_LABELS.includes(flowLabels[0])) {
      console.error(
        "createNewLesson: only placeholder node exists (react_flow_data)",
      );
      return {
        success: false,
        error:
          "You must edit your class graph first (rename or add topics) before creating lessons.",
      };
    }
  } catch (e) {
    console.error("createNewLesson: error inspecting graphData", e);
  }

  const graphTopics = extractGraphTopics((graphData as any).react_flow_data);
  const resolvedTopics = resolveGraphTopicValues(graphTopics, topicNodeIds);

  if (resolvedTopics.unresolved.length) {
    return {
      success: false,
      error: `Some selected topics no longer exist in the graph: ${resolvedTopics.unresolved.join(", ")}`,
    };
  }

  const normalizedTopics = resolvedTopics.labels;

  const PLACEHOLDER_LABELS = ["Edit me!", "Edit me 😊!"];
  if (
    normalizedTopics.length === 1 &&
    PLACEHOLDER_LABELS.includes(normalizedTopics[0])
  ) {
    console.error("createNewLesson: submitted single placeholder topic");
    return {
      success: false,
      error:
        "Please rename your default topic in the class graph before creating a lesson.",
    };
  }

  if (normalizedTopics.length === 0) {
    console.error(
      "createNewLesson: cannot create a lesson without at least one topic",
    );
    return {
      success: false,
      error: "A lesson must include at least one topic.",
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("lessons")
    .insert({
      name: lessonName,
      topics: normalizedTopics,
      is_published: isPublished,
    })
    .select("lesson_id")
    .limit(1);

  if (insertError || !inserted?.[0]) {
    console.error("Error inserting lesson: ", insertError);
    return { success: false, error: insertError || "Failed to create lesson" };
  }

  const newLessonID = inserted[0].lesson_id;

  const { error: insertIntoClassLessonBankError } = await supabase
    .from("class_lesson_bank")
    .insert({
      owner_id: user.id,
      class_id: classId,
      lesson_id: newLessonID,
      topic_node_ids: resolvedTopics.nodeIds,
    });

  if (insertIntoClassLessonBankError) {
    console.error(
      "Error inserting into class_lesson_bank: ",
      insertIntoClassLessonBankError,
    );
    return { success: false, error: insertIntoClassLessonBankError };
  }

  return { success: true };
};

export const importLessonToClass = async (
  className: string,
  lessonIDs: number[],
) => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  const classId = await getClassIdByName(supabase, className);

  const { graphData } = await getKnowledgeGraphData(className);
  const graphTopics = extractGraphTopics(
    graphData && "react_flow_data" in graphData
      ? graphData.react_flow_data
      : [],
  );
  const { data: lessonsToImport, error: lessonsError } = await supabase
    .from("lessons")
    .select("lesson_id, name, topics")
    .in("lesson_id", lessonIDs);

  if (lessonsError) {
    return { success: false, error: lessonsError };
  }

  const lessonById = new Map(
    (lessonsToImport ?? []).map((lesson) => [lesson.lesson_id, lesson]),
  );

  for (const lessonID of lessonIDs) {
    const lesson = lessonById.get(lessonID);
    if (!lesson) continue;

    const resolvedTopics = resolveGraphTopicValues(graphTopics, lesson.topics);
    if (resolvedTopics.unresolved.length || !resolvedTopics.nodeIds.length) {
      return {
        success: false,
        error: `The topics for "${lesson.name}" do not match this class graph. Edit the lesson topics before importing it.`,
      };
    }

    const { error: insertError } = await supabase
      .from("class_lesson_bank")
      .insert({
        owner_id: user.id,
        class_id: classId,
        lesson_id: lessonID,
        topic_node_ids: resolvedTopics.nodeIds,
      });

    if (insertError) {
      console.error("Error importing lessons ", insertError);
      return { success: false, error: "Error importing lessons" };
    }
  }

  return { success: true };
};

export const updateLesson = async (
  className: string,
  id: number,
  {
    lessonName,
    topicNodeIds,
    isPublished,
  }: { lessonName: string; topicNodeIds: string[]; isPublished: boolean },
) => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  const classId = await getClassIdByName(supabase, className);
  if (!classId) {
    return { success: false, error: "Class not found" };
  }

  const { graphData } = await getKnowledgeGraphData(className);
  const graphTopics = extractGraphTopics(
    graphData && "react_flow_data" in graphData
      ? graphData.react_flow_data
      : [],
  );
  const resolvedTopics = resolveGraphTopicValues(graphTopics, topicNodeIds);

  if (resolvedTopics.unresolved.length) {
    return {
      success: false,
      error: `Some selected topics no longer exist in the graph: ${resolvedTopics.unresolved.join(", ")}`,
    };
  }

  const normalizedTopics = resolvedTopics.labels;

  if (normalizedTopics.length === 0) {
    console.error(
      "updateLesson: cannot save a lesson without at least one topic",
    );
    return {
      success: false,
      error: "A lesson must include at least one topic.",
    };
  }

  const { error } = await supabase
    .from("lessons")
    .update({
      name: lessonName,
      topics: normalizedTopics,
      is_published: isPublished,
    })
    .eq("lesson_id", id);

  if (error) {
    console.error("Error updating lesson: ", error);
    return { success: false, error };
  }

  const { error: linkError } = await supabase
    .from("class_lesson_bank")
    .update({ topic_node_ids: resolvedTopics.nodeIds })
    .eq("class_id", classId)
    .eq("lesson_id", id);

  if (linkError) {
    console.error("Error updating lesson topic node IDs: ", linkError);
    return { success: false, error: linkError };
  }

  return { success: true };
};

export const deleteLesson = async (lessonID: number) => {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  const { error: deleteError } = await supabase
    .from("lessons")
    .delete()
    .eq("lesson_id", lessonID);

  if (deleteError) {
    console.error("Error deleting lesson: ", deleteError);
    return { success: false, error: deleteError };
  }

  return { success: true };
};

export const getLessonTopics = async (className: string) => {
  const { graphData } = await getKnowledgeGraphData(className);
  console.log("graphData: ", graphData);
  if (!graphData || !("react_flow_data" in graphData)) {
    console.error("Invalid graphData structure");
    return { success: false, topics: [] };
  }
  const { react_flow_data } = graphData;
  const topics: GraphTopic[] = extractGraphTopics(react_flow_data);

  return { success: true, topics };
};

export const getQuestionTopicOptions = async (
  className: string,
  lessonName: string,
) => {
  const topicResponse = await getLessonTopics(className);
  if (!topicResponse.success) {
    return { success: false, topics: [], lessonTopicNodeIds: [] };
  }

  const supabase = createClient();
  const classId = await getClassIdByName(supabase, className);
  const cleanedLessonName = decodeURIComponent(lessonName)
    .replace(/%20/g, " ")
    .replace(/-/g, " ")
    .trim();
  const { data, error } = await supabase
    .from("class_lesson_bank")
    .select("topic_node_ids, lessons!inner(name)")
    .eq("class_id", classId)
    .eq("lessons.name", cleanedLessonName)
    .limit(1);

  if (error) {
    console.error("Error fetching lesson topic IDs:", error);
    return {
      success: false,
      topics: topicResponse.topics,
      lessonTopicNodeIds: [],
    };
  }

  const resolved = resolveGraphTopicValues(
    topicResponse.topics,
    data?.[0]?.topic_node_ids ?? [],
  );

  return {
    success: true,
    topics: topicResponse.topics,
    lessonTopicNodeIds: resolved.nodeIds,
  };
};
