"use server";

import { Question, MultipleChoice, Rearrange } from "@/types/content.types";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export const getLessonQuestions = async (
  className: string,
  lessonName: string
): Promise<
  {
    question_id: number;
    question_type: string;
    prompt: string | null;
    snippet: string | null;
    topics: string[] | null;
    answer_options: any[] | null;
    answer: string | null;
    image_url: string | null;
  }[]
> => {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("No user found");
    return [];
  }

  const cleanedClassName = decodeURIComponent(className ?? "")
    .replace(/-/g, " ")
    .trim();
  const cleanedLessonName = decodeURIComponent(lessonName ?? "")
    .replace(/-/g, " ")
    .trim();

  const { data: classRows, error: clsErr } = await supabase
    .from("classes")
    .select("class_id")
    .eq("name", cleanedClassName)
    .limit(2);

  if (clsErr) {
    console.error("Error fetching class:", clsErr);
    return [];
  }
  if (!classRows || classRows.length === 0) {
    console.error("No class found for name:", cleanedClassName);
    return [];
  }
  if (classRows.length > 1) {
    console.error(
      "⚠️ Multiple classes found with name:",
      cleanedClassName,
      classRows
    );
    return [];
  }

  const classId = classRows[0].class_id;

  // 2) Resolve lesson_id by name ONCE with validation, scoped to this class
  const { data: lessonLinks, error: linkErr } = await supabase
    .from("class_lesson_bank")
    .select("lesson_id, lessons!inner(lesson_id, name)") // Use inner join
    .eq("class_id", classId)
    .eq("lessons.name", cleanedLessonName) // Exact match on joined table
    .limit(2); // Get up to 2 to detect duplicates

  if (linkErr) {
    console.error("Error fetching lesson:", linkErr);
    return [];
  }
  if (!lessonLinks || lessonLinks.length === 0) {
    console.error(
      "No lesson found for name:",
      cleanedLessonName,
      "in class_id:",
      classId
    );
    return [];
  }
  if (lessonLinks.length > 1) {
    console.error(
      "⚠️ Multiple lessons found with name:",
      cleanedLessonName,
      lessonLinks
    );
    return [];
  }

  const lessonId = lessonLinks[0].lesson_id;

  // 3) Now use the resolved IDs for all subsequent queries
  const { data: questionIDs, error: questionIDsError } = await supabase
    .from("lesson_question_bank")
    .select("question_id")
    .eq("lesson_id", lessonId);

  if (questionIDsError) {
    console.error("Error fetching question IDs:", questionIDsError);
    return [];
  }

  if (!questionIDs || questionIDs.length === 0) {
    return [];
  }

  const { data: questionData, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .in(
      "question_id",
      questionIDs.map((q) => q.question_id)
    );

  if (questionsError) {
    console.error("Error fetching questions:", questionsError);
    return [];
  }

  return questionData;
};

export const getClassIdByName = async (className: string) => {
  const supabase = createClient();
  const cleaned = decodeURIComponent(className).replace(/-/g, " ").trim();
  const { data, error } = await supabase
    .from("classes")
    .select("class_id")
    .ilike("name", cleaned)
    .maybeSingle();

  if (error) {
    console.error("getClassIdByName error:", error.message);
    return null;
  }
  return data?.class_id ?? null;
};

export const getAllowedTopics = async (
  className: string,
  lessonName?: string
) => {
  const supabase = createClient();

  // Resolve class_id
  const cleanedClassName = decodeURIComponent(className)
    .replace(/-/g, " ")
    .trim();
  let clsId: number | null = null;
  {
    const { data, error } = await supabase
      .from("classes")
      .select("class_id")
      .ilike("name", cleanedClassName)
      .limit(1)
      .maybeSingle();
    if (!error && data) clsId = data.class_id;
  }
  if (!clsId) return [];

  const allowed = new Set<string>();

  // Source A: class_knowledge_graph.nodes (array of labels)
  {
    const { data } = await supabase
      .from("class_knowledge_graph")
      .select("nodes")
      .eq("class_id", clsId)
      .limit(1)
      .maybeSingle();
    const nodes: any[] = data?.nodes ?? [];
    nodes.forEach((n) => {
      if (typeof n === "string" && n.trim()) allowed.add(n.trim());
    });
  }

  // Source B: existing questions linked to this class via class_question_bank
  {
    const { data } = await supabase
      .from("class_question_bank")
      .select("question_id")
      .eq("class_id", clsId)
      .limit(2000);
    const qids = (data ?? []).map((r) => r.question_id);
    if (qids.length) {
      const { data: qs } = await supabase
        .from("questions")
        .select("topics")
        .in("question_id", qids)
        .limit(2000);
      (qs ?? []).forEach((q) => {
        if (Array.isArray(q.topics)) {
          q.topics.forEach((t: any) => {
            const s = String(t ?? "").trim();
            if (s) allowed.add(s);
          });
        }
      });
    }
  }

  // Optional Source C: lesson-scoped topics if you store them somewhere

  // Return stable list
  return Array.from(allowed).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
};

// Create a new question and link it to class and lesson
export async function createNewQuestion(
  lessonName: string,
  className: string | undefined,
  questionData: Question
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("RLS debug user.id =", user?.id);

  // RLS preflight that tolerates duplicates in professor_courses
  const { count: profCount, error: profErr } = await supabase
    .from("professor_courses")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user!.id);

  if (profErr) {
    console.error("professor_courses count error:", profErr);
  }
  if ((profCount ?? 0) === 0) {
    console.error("RLS will block: no professor_courses row for", user!.id);
    return {
      success: false,
      error: "Not authorized. Your account is not in professor_courses.",
    };
  }

  if (!user?.id) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  if (!lessonName) {
    console.error("No lesson name found");
    return { success: false, error: "No lesson name found" };
  }

  // Normalize incoming names from route params
  const cleanedClassName = decodeURIComponent(className ?? "")
    .replace(/-/g, " ")
    .trim();
  const cleanedLessonName = decodeURIComponent(lessonName ?? "")
    .replace(/-/g, " ")
    .trim();

  const normalizedImageUrl =
    typeof (questionData as any)?.image_url === "string" &&
    (questionData as any).image_url.trim()
      ? (questionData as any).image_url.trim()
      : null;

  let questionID: number | null = null;

  // Handle different question types
  if (questionData.questionType === "multiple-choice") {
    const multipleChoiceData = questionData as MultipleChoice;
    const { questionType, prompt, snippet, answerOptions, answer } =
      multipleChoiceData;

    // Coerce topics to a non-null string[]
    const rawTopics =
      (multipleChoiceData as any)?.topics ??
      (multipleChoiceData as any)?.topicsCovered ??
      [];
    const safeTopics: string[] = Array.isArray(rawTopics)
      ? rawTopics.filter((t) => typeof t === "string" && t.trim() !== "")
      : [];

    const answerOptionValues = answerOptions.map(
      (option) => Object.values(option)[0]
    );

    console.log("About to insert with image_url:", normalizedImageUrl);

    const { data: insertedMC, error: insertErrMC } = await supabase
      .from("questions")
      .insert({
        question_type: questionType,
        prompt,
        snippet,
        answer_options: answerOptionValues,
        answer,
        topics: Array.isArray(safeTopics) ? safeTopics : [],
        owner_id: user.id,
        image_url: normalizedImageUrl,
        is_ai_generated: (questionData as any)?.is_ai_generated ?? false,
      } as any)
      .select("question_id")
      .single();

    if (insertErrMC) {
      console.error("Error inserting question data: ", insertErrMC);
      return { success: false, error: insertErrMC };
    }
    questionID = insertedMC.question_id;
  } else if (questionData.questionType === "rearrange") {
    const rearrangeData = questionData as Rearrange;
    const { questionType, prompt, snippet, answerOptions, answer } =
      rearrangeData;

    if (!prompt) {
      console.error("Missing required fields for rearrange question");
      return {
        success: false,
        error: "Missing required fields. Please provide a prompt.",
      };
    }

    if (!answerOptions || answerOptions.length === 0) {
      console.error("No tokens defined for rearrange question");
      return {
        success: false,
        error:
          "No tokens defined. Please create at least one token for the rearrange question.",
      };
    }

    // Coerce topics to a non-null string[]
    const rawTopics =
      (rearrangeData as any)?.topics ??
      (rearrangeData as any)?.topicsCovered ??
      [];
    const safeTopics: string[] = Array.isArray(rawTopics)
      ? rawTopics.filter((t) => typeof t === "string" && t.trim() !== "")
      : [];

    const studentViewOptions = processRearrangeOptionsData(
      answerOptions,
      snippet
    );

    const { data: insertedR, error: insertErrR } = await supabase
      .from("questions")
      .insert({
        question_type: questionType,
        prompt,
        snippet,
        answer_options: [
          { professorView: answerOptions },
          { studentView: studentViewOptions },
        ],
        answer,
        topics: Array.isArray(safeTopics) ? safeTopics : [],
        owner_id: user.id,
        image_url: normalizedImageUrl,
      } as any)
      .select("question_id")
      .single();

    if (insertErrR) {
      console.error("Error inserting question data: ", insertErrR);
      return { success: false, error: insertErrR };
    }
    questionID = insertedR.question_id;
  } else {
    console.error("Unsupported question type");
    return { success: false, error: "Unsupported question type" };
  }

  if (!questionID) {
    console.error("No questionID resolved after insert");
    return { success: false, error: "Question insert failed" };
  }

  // Resolve class id by cleaned name, tolerant
  let clsRowsCQ: { class_id: number; name?: string }[] = [];
  let classIDError = null;

  {
    const resp = await supabase
      .from("classes")
      .select("class_id, name")
      .eq("name", cleanedClassName)
      .limit(2);
    clsRowsCQ = resp.data || [];
    classIDError = resp.error;
  }

  if (!classIDError && clsRowsCQ.length === 0) {
    const resp2 = await supabase
      .from("classes")
      .select("class_id, name")
      .ilike("name", cleanedClassName)
      .limit(2);
    clsRowsCQ = resp2.data || [];
    classIDError = resp2.error;
  }

  if (classIDError) {
    console.error("Error fetching class ID: ", classIDError);
    return { success: false, error: classIDError };
  }
  if (clsRowsCQ.length === 0) {
    console.error("No class row for name: ", cleanedClassName);
    return { success: false, error: "Class not found" };
  }
  if (clsRowsCQ.length > 1) {
    console.error(
      "Multiple class rows match name. Use a unique slug or ID:",
      cleanedClassName
    );
    return {
      success: false,
      error: "Multiple classes match this name. Use a unique slug or ID.",
    };
  }

  const classID = { class_id: clsRowsCQ[0].class_id };

  // Link question to class
  const { error: classQuestionBankError } = await supabase
    .from("class_question_bank")
    .insert({
      class_id: classID.class_id,
      owner_id: user.id,
      question_id: questionID,
    });

  if (classQuestionBankError) {
    console.error("Error linking question to class: ", classQuestionBankError);
    return { success: false, error: classQuestionBankError };
  }

  // Resolve lesson id through the class_lesson_bank to ensure it belongs to the class
  const { data: link, error: lessonIDError } = await supabase
    .from("class_lesson_bank")
    .select("lesson_id, lessonDetails:lessons(name)")
    .eq("class_id", classID.class_id)
    .ilike("lessonDetails.name", cleanedLessonName)
    .limit(1)
    .maybeSingle();

  if (lessonIDError) {
    console.error(
      "Error fetching lesson ID through class_lesson_bank: ",
      lessonIDError
    );
    return { success: false, error: lessonIDError };
  }
  if (!link) {
    console.error(
      "No lesson match for: ",
      cleanedLessonName,
      "in class_id:",
      classID.class_id
    );
    return { success: false, error: "Lesson not found for this class" };
  }
  const lessonID = { lesson_id: link.lesson_id };

  // Link question to lesson
  const { error: lessonQuestionBankError } = await supabase
    .from("lesson_question_bank")
    .insert({
      lesson_id: lessonID.lesson_id,
      owner_id: user.id,
      question_id: questionID,
    });

  if (lessonQuestionBankError) {
    console.error(
      "Error linking question to lesson: ",
      lessonQuestionBankError
    );
    return { success: false, error: lessonQuestionBankError };
  }

  return { success: true };
}

export const deleteQuestionFromLesson = async (
  className: string,
  lessonName: string,
  questionId: number
) => {
  try {
    const supabase = createClient();

    if (!questionId || !Number.isFinite(Number(questionId))) {
      return { success: false, error: "Invalid question id" };
    }

    // Resolve class_id from className (supports slug with dashes)
    const cleanedClassName = decodeURIComponent(className)
      .replace(/-/g, " ")
      .trim();
    const { data: cls, error: clsErr } = await supabase
      .from("classes")
      .select("class_id")
      .ilike("name", cleanedClassName)
      .maybeSingle();

    if (clsErr) return { success: false, error: clsErr.message };
    if (!cls?.class_id) return { success: false, error: "Class not found" };

    // Resolve lesson_id for that class and lessonName
    const cleanedLessonName = decodeURIComponent(lessonName)
      .replace(/-/g, " ")
      .trim();
    // NEW - handles multiple rows gracefully
    const { data: links, error: linkErr } = await supabase
      .from("class_lesson_bank")
      .select("lesson_id, lessonDetails:lessons(name)")
      .eq("class_id", cls.class_id)
      .eq("lessonDetails.name", cleanedLessonName) // Use .eq for exact match
      .limit(2);

    if (linkErr) return { success: false, error: linkErr.message };
    if (!links || links.length === 0)
      return { success: false, error: "Lesson not found for class" };
    if (links.length > 1) {
      console.warn(
        "⚠️ Multiple lessons matched for delete:",
        cleanedLessonName,
        links
      );
      // Just use the first one
    }

    const link = links[0];

    const lessonId = link.lesson_id;

    // 1) Delete the link from lesson_question_bank
    const { error: delLinkErr } = await supabase
      .from("lesson_question_bank")
      .delete()
      .eq("lesson_id", lessonId)
      .eq("question_id", questionId);

    if (delLinkErr) return { success: false, error: delLinkErr.message };

    // 2) If this question is no longer referenced by any lesson, delete it from questions
    const { count, error: cntErr } = await supabase
      .from("lesson_question_bank")
      .select("question_id", { count: "exact", head: true })
      .eq("question_id", questionId);

    if (cntErr) return { success: false, error: cntErr.message };

    if ((count ?? 0) === 0) {
      // Optionally also ensure not in class_question_bank
      const { count: cqCount, error: cqErr } = await supabase
        .from("class_question_bank")
        .select("question_id", { count: "exact", head: true })
        .eq("question_id", questionId);

      if (cqErr) return { success: false, error: cqErr.message };

      if ((cqCount ?? 0) === 0) {
        const { error: delQErr } = await supabase
          .from("questions")
          .delete()
          .eq("question_id", questionId);
        if (delQErr) return { success: false, error: delQErr.message };
      }
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Unknown error" };
  }
};

export async function updateQuestion(id: number, questionData: Question) {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  const { questionType, prompt, snippet, topics, answerOptions, answer } =
    questionData;

  // Coerce topics to a non-null string[]
  const rawTopics =
    (topics as any) ?? (questionData as any)?.topicsCovered ?? [];
  const safeTopics: string[] = Array.isArray(rawTopics)
    ? rawTopics.filter((t) => typeof t === "string" && t.trim() !== "")
    : [];

  let updateData: any = {
    question_type: questionType,
    prompt,
    snippet,
    topics: Array.isArray(safeTopics) ? safeTopics : [],
    answer,
    image_url: (questionData as any)?.image_url ?? null,
  };

  if (questionType === "multiple-choice") {
    const answerOptionValues = answerOptions.map((option) =>
      typeof option === "string" ? option : Object.values(option)[0]
    );
    updateData.answer_options = answerOptionValues;
  } else if (questionType === "rearrange") {
    const studentViewOptions = processRearrangeOptionsData(
      answerOptions,
      snippet
    );
    updateData.answer_options = [
      { professorView: answerOptions },
      { studentView: studentViewOptions },
    ];
  }

  const { error } = await supabase
    .from("questions")
    .update(updateData)
    .eq("question_id", id);

  if (error) {
    console.error("Error updating question data: ", error);
    return { success: false, error };
  }

  return { success: true };
}

export async function deleteQuestion(
  className: string,
  lessonName: string,
  questionId: number
) {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("No user found");
    return { success: false, error: "No user found" };
  }

  const cleanedClassName = decodeURIComponent(className ?? "")
    .replace(/-/g, " ")
    .trim();
  const cleanedLessonName = decodeURIComponent(lessonName ?? "")
    .replace(/-/g, " ")
    .trim();

  let classRows: { class_id: number }[] = [];
  let classErr = null;

  {
    const resp = await supabase
      .from("classes")
      .select("class_id")
      .eq("name", cleanedClassName)
      .limit(2);
    classRows = resp.data || [];
    classErr = resp.error;
  }

  if (!classErr && classRows.length === 0) {
    const resp2 = await supabase
      .from("classes")
      .select("class_id")
      .ilike("name", cleanedClassName)
      .limit(2);
    classRows = resp2.data || [];
    classErr = resp2.error;
  }

  if (classErr) {
    console.error("Error fetching class ID for deleteQuestion:", classErr);
    return { success: false, error: classErr };
  }

  if (classRows.length !== 1) {
    console.error(
      "Could not uniquely resolve class for deleteQuestion:",
      cleanedClassName
    );
    return { success: false, error: "Class not found or not unique" };
  }

  const classId = classRows[0].class_id;

  const { data: lessonLink, error: lessonErr } = await supabase
    .from("class_lesson_bank")
    .select("lesson_id, lessonDetails:lessons(name)")
    .eq("class_id", classId)
    .ilike("lessonDetails.name", cleanedLessonName)
    .limit(1)
    .maybeSingle();

  if (lessonErr) {
    console.error("Error fetching lesson for deleteQuestion:", lessonErr);
    return { success: false, error: lessonErr };
  }

  if (!lessonLink) {
    console.error("Lesson not found for deleteQuestion:", cleanedLessonName);
    return { success: false, error: "Lesson not found for class" };
  }

  const { error } = await supabase
    .from("lesson_question_bank")
    .delete()
    .eq("lesson_id", lessonLink.lesson_id)
    .eq("question_id", questionId)
    .eq("owner_id", user.id);

  if (error) {
    console.error("Error deleting question: ", error);
    return { success: false, error };
  }

  return { success: true };
}

// Generate a draft question with Gemini based on class level, topic and optional examples
export async function generateQuestionLLM(params: {
  className: string;
  lessonName?: string;
  topic?: string;
  limitExamples?: number;
}) {
  const supabase = createClient();

  // 1) Resolve class (id + level) from className
  const cleanedClassName = decodeURIComponent(params.className ?? "")
    .replace(/-/g, " ")
    .trim();

  let clsRowsLLM: { class_id: number; level: number | null }[] = [];
  let clsErr = null;

  {
    const resp = await supabase
      .from("classes")
      .select("class_id, level")
      .eq("name", cleanedClassName)
      .limit(2);
    clsRowsLLM = resp.data || [];
    clsErr = resp.error;
  }

  if (!clsErr && clsRowsLLM.length === 0) {
    const resp2 = await supabase
      .from("classes")
      .select("class_id, level")
      .ilike("name", cleanedClassName)
      .limit(2);
    clsRowsLLM = resp2.data || [];
    clsErr = resp2.error;
  }

  if (clsErr) {
    console.error("generateQuestionLLM: class lookup failed", clsErr);
    return { success: false, error: "Class lookup failed" };
  }
  if (clsRowsLLM.length === 0) {
    console.error("generateQuestionLLM: no class found for", cleanedClassName);
    return { success: false, error: "Class not found" };
  }
  if (clsRowsLLM.length > 1) {
    console.error(
      "generateQuestionLLM: multiple classes matched",
      cleanedClassName
    );
    return {
      success: false,
      error: "Multiple classes match this name. Use a unique slug or ID.",
    };
  }

  const class_id = clsRowsLLM[0].class_id;
  const level =
    typeof clsRowsLLM[0].level === "number" ? clsRowsLLM[0].level : 0;

  // 2) Derive topic: explicit param, else lessonName cleaned, else a fallback
  const topic = params.topic
    ? params.topic
    : params.lessonName
    ? decodeURIComponent(params.lessonName).replace(/-/g, " ").trim()
    : "Intro CS";

  let examples: Array<{
    question_type: string;
    prompt: string;
    snippet: string | null;
    topics: string[];
    answer_options: any[];
    answer: string | null;
    level?: number;
  }> = [];

  try {
    const { data: exRows } = await supabase
      .from("questions")
      .select("question_type, prompt, snippet, topics, answer_options, answer")
      .limit(params.limitExamples ?? 3);

    if (Array.isArray(exRows)) {
      examples = exRows.map((q) => ({
        question_type: q.question_type || "multiple_choice",
        prompt: q.prompt || "",
        snippet: q.snippet ?? null,
        topics: Array.isArray(q.topics) ? (q.topics as any) : [],
        answer_options: q.answer_options ?? [],
        answer: q.answer ?? null,
        level,
      }));
    }
  } catch (e) {
    console.warn("generateQuestionLLM: examples fetch failed", e);
  }

  // 4) Call backend LLM endpoint (Gemini-only)
  const resp = await fetch(`${BACKEND_URL}/llm/transform-question`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "generate",
      class_id, // backend will resolve level from this
      topic,
      examples,
    }),
    // no credentials needed; backend does not require auth for this route per our setup
  });

  if (!resp.ok) {
    const preview = await resp.text().catch(() => "");
    console.error(
      "generateQuestionLLM: LLM endpoint failed",
      resp.status,
      preview
    );
    return { success: false, error: `LLM endpoint failed ${resp.status}` };
  }

  let llmQ: any = null;
  try {
    llmQ = await resp.json();
  } catch (e) {
    const preview = await resp.text().catch(() => "");
    console.error("generateQuestionLLM: non-JSON response", e, preview);
    return { success: false, error: "LLM returned non-JSON" };
  }

  // 5) Normalize for our form shape
  const normalizedOptions = Array.isArray(llmQ?.answer_options)
    ? llmQ.answer_options.map((v: any, i: number) => ({
        [`option${i + 1}`]: String(v ?? ""),
      }))
    : [];

  return {
    success: true,
    data: {
      question_type: llmQ?.question_type || "multiple_choice",
      prompt: llmQ?.prompt || "",
      snippet: llmQ?.snippet ?? null,
      topics: Array.isArray(llmQ?.topics) ? llmQ.topics : topic ? [topic] : [],
      answer_options: normalizedOptions,
      answer: typeof llmQ?.answer === "string" ? llmQ.answer : "",
    },
  };
}

// ------------------
// Helper Functions
// ------------------

const checkAnswersForDuplicates = (answerOptions: string[]) => {
  const seen = new Set();
  for (const option of answerOptions) {
    const trimmedOption = option.trim();
    if (seen.has(trimmedOption)) {
      return true;
    }
    seen.add(trimmedOption);
  }
  return false;
};

const processRearrangeOptionsData = (options: any[], snippet: string) => {
  // Extract all tokens text for student view
  const allTokens = options.map((option) => option.text);

  // Filter out only tokens that aren't distractors (have valid positions in the snippet)
  const nonDistractorOptions = options.filter(
    (option) =>
      !option.isDistractor && option.position && option.position.length >= 2
  );

  // If we don't have any non-distractor tokens with positions, return simple tokens
  if (nonDistractorOptions.length === 0) {
    return [{ tokens: allTokens, problem: [snippet] }];
  }

  // Add START and END positions to help with slicing
  const optionsIncludingStartAndEnd = [
    ...nonDistractorOptions,
    { text: "START", position: [0] },
    { text: "END", position: [snippet.length] },
  ];

  // Extract all position points and sort them
  const positions = Array.from(
    new Set(
      optionsIncludingStartAndEnd.flatMap((option) => {
        const [start, end] = option.position || [];
        return [start, end].filter((pos) => pos !== undefined);
      })
    )
  ).sort((a, b) => a - b);

  // Create slices from the positions
  const sliceIndices = [];
  for (let i = 0; i < positions.length - 1; i++) {
    sliceIndices.push([positions[i], positions[i + 1]]);
  }

  // Generate the problem text with blanks for tokens
  const slices = sliceIndices.map(([start, end]) => {
    const text = snippet.slice(start, end);

    // Check if this slice corresponds to a token
    const isToken = nonDistractorOptions.some((option) => {
      const [optStart, optEnd] = option.position || [];
      return optStart === start && optEnd === end;
    });

    if (isToken) {
      return null;
    }

    return text;
  });

  return [{ tokens: allTokens, problem: slices }];
};
