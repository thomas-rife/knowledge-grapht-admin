"use server";

import { Json } from "@/supabase";
import { createClient } from "@/utils/supabase/server";
import { type Node, type Edge } from "@xyflow/react";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

type GraphGranularity = "simple" | "standard" | "detailed";
type ThinkingLevel = "low" | "medium" | "high";

interface GeneratedTopic {
  id: string;
  label: string;
  category: string;
  description: string;
  importance: "core" | "supporting" | "advanced";
}

interface GeneratedTopicResponse {
  course_title_guess: string;
  suggested_topic_counts: {
    simple: number;
    standard: number;
    detailed: number;
  };
  categories: string[];
  candidate_topics: GeneratedTopic[];
}

interface GeneratedEdgeItem {
  source: string;
  target: string;
  reason: string;
  strength: "strong" | "moderate";
}

interface GeneratedEdgeResponse {
  edges: GeneratedEdgeItem[];
}

interface GenerateKnowledgeGraphInput {
  className: string;
  courseMaterial: string;
  granularity?: GraphGranularity;
}

const TOPIC_SCHEMA = {
  type: "OBJECT",
  properties: {
    course_title_guess: { type: "STRING" },
    suggested_topic_counts: {
      type: "OBJECT",
      properties: {
        simple: { type: "INTEGER" },
        standard: { type: "INTEGER" },
        detailed: { type: "INTEGER" },
      },
      required: ["simple", "standard", "detailed"],
    },
    categories: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    candidate_topics: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          label: { type: "STRING" },
          category: { type: "STRING" },
          description: { type: "STRING" },
          importance: {
            type: "STRING",
            enum: ["core", "supporting", "advanced"],
          },
        },
        required: ["id", "label", "category", "description", "importance"],
      },
    },
  },
  required: [
    "course_title_guess",
    "suggested_topic_counts",
    "categories",
    "candidate_topics",
  ],
} as const;

const EDGE_SCHEMA = {
  type: "OBJECT",
  properties: {
    edges: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          source: { type: "STRING" },
          target: { type: "STRING" },
          reason: { type: "STRING" },
          strength: {
            type: "STRING",
            enum: ["strong", "moderate"],
          },
        },
        required: ["source", "target", "reason", "strength"],
      },
    },
  },
  required: ["edges"],
} as const;

const normalizeTopicId = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeGeneratedTopics = (topics: GeneratedTopic[]) => {
  const usedIds = new Set<string>();

  return topics.map((topic, index) => {
    const fallbackId = normalizeTopicId(topic.label) || `topic-${index + 1}`;
    let nextId = normalizeTopicId(topic.id) || fallbackId;

    if (usedIds.has(nextId)) {
      let suffix = 2;
      while (usedIds.has(`${nextId}-${suffix}`)) {
        suffix += 1;
      }
      nextId = `${nextId}-${suffix}`;
    }

    usedIds.add(nextId);

    return {
      ...topic,
      id: nextId,
      label: topic.label.trim(),
      category: topic.category.trim(),
      description: topic.description.trim(),
    };
  });
};

const extractGeminiText = (response: any): string => {
  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
};

const callGeminiStructured = async <T>(
  prompt: string,
  schema: Record<string, unknown>,
  thinkingLevel: ThinkingLevel = "low",
): Promise<T> => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          thinkingConfig: {
            thinkingLevel,
          },
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const text = extractGeminiText(json);
  return JSON.parse(text) as T;
};

const getClassRecord = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  className: string,
) => {
  const cleanedClassName = decodeURIComponent(className)
    .replace(/-/g, " ")
    .trim();

  let query = await supabase
    .from("classes")
    .select("class_id, level")
    .eq("name", cleanedClassName)
    .limit(2);

  if (query.error) {
    console.error("Error fetching class by exact name: ", query.error);
    return { classRecord: null, error: query.error };
  }

  let rows = query.data ?? [];

  if (rows.length === 0) {
    query = await supabase
      .from("classes")
      .select("class_id, level")
      .ilike("name", cleanedClassName)
      .limit(2);

    if (query.error) {
      console.error("Error fetching class by ilike name: ", query.error);
      return { classRecord: null, error: query.error };
    }

    rows = query.data ?? [];
  }

  if (rows.length === 0) {
    return { classRecord: null, error: "Class not found" };
  }

  if (rows.length > 1) {
    return { classRecord: null, error: "Multiple classes matched this name" };
  }

  return {
    classRecord: rows[0],
    error: null,
  };
};

const buildTopicPrompt = ({
  courseMaterial,
  courseLevel,
  granularity,
}: {
  courseMaterial: string;
  courseLevel: number;
  granularity: GraphGranularity;
}) => `You are helping build a prerequisite knowledge graph for a university course.

Task:
Given the course material below, extract a strong base set of candidate knowledge graph topics.

Course Level: ${courseLevel}
Granularity: ${granularity}

Requirements:
1. Focus on actual conceptual topics, not logistics or fluff.
2. Keep topics at a reasonable instructional concept level.
3. Prefer topics that are broad enough to contain 2-6 quiz questions.
4. Avoid topics that are too narrow unless they are central to the course.
5. Do NOT create standalone nodes for individual theorems, named problems, or narrow techniques. These should be grouped under broader concepts.
6. Ensure coverage across all major units or themes in the course material.
7. The output should represent a clean, editable starter graph, not a complete exhaustive ontology.
8. For simple granularity, return between 5-12 topics. For standard granularity, return between 12 and 20 topics. For detailed granularity, return between 21-35 topics.
9. Suggest approximate topic counts for simple, standard, and detailed graph granularities.
10. Return ONLY valid JSON matching the schema.
11. Prefer broad unit-level concepts explicitly named in the syllabus when they are pedagogically meaningful.
12. For the starter graph, merge closely related topics into broader nodes unless they independently serve as major instructional units.
13. Prefer concepts that align with how the course is taught, not just extracted terminology.
14. Avoid duplicate or highly overlapping topics. Merge similar concepts into a single clear node.
15. Use clear, concise and instructor friendly names for topics. Avoid overly technical or awkward phrasing.
16. Prefer topics that could naturally form a prerequisite structure, where some concepts build on others.
17. Optionally group topics into a small number of meaningful categories when clear groupings exist.
18. Maintain a reasonably balanced representation across major units. Do not overrepresent one section unless clearly dominant.
19. Avoid vague or generic topic names that do not clearly correspond to a teachable concept.
20. Ignore lab names, story themes, dates, exams, holidays, and contextual narrative. Focus on reusable conceptual topics only.
21. The number and specificity of topics MUST match the requested granularity level.
22. Generate topics ONLY for the requested granularity level. The other granularity counts are estimates, not additional outputs.

Course material:
${courseMaterial}`;

const buildEdgePrompt = ({
  courseMaterial,
  topics,
}: {
  courseMaterial: string;
  topics: GeneratedTopic[];
}) => `You are generating prerequisite edges for a course knowledge graph.

Task:
Given the course material and the candidate topic nodes below, generate directed prerequisite edges.

Goal:
Produce a sparse, editable starter graph. The graph should capture meaningful learning dependencies, not just lecture order.

Rules:
1. Create an edge A -> B only if understanding A materially helps a student understand B.
2. Do NOT create edges solely because A appears earlier in the syllabus than B.
3. Prefer sparse graphs. Not every node needs incoming or outgoing edges.
4. Avoid redundant edges. If A -> B and B -> C already capture the dependency, avoid adding A -> C unless it is especially important.
5. Do not create cycles.
6. Preserve the provided node ids exactly.
7. Use syllabus order only as a weak signal. Conceptual dependency matters more.
8. Prefer edges from broad concepts to applications or examples when appropriate.
9. Do not create prerequisite edges based only on conceptual similarity or shared techniques.
10. Return ONLY valid JSON matching the schema.

Course material:
${courseMaterial}

Candidate nodes:
${JSON.stringify(
  topics.map((topic) => ({
    id: topic.id,
    label: topic.label,
    category: topic.category,
    description: topic.description,
  })),
  null,
  2,
)}`;

const cleanGeneratedEdges = (
  topics: GeneratedTopic[],
  edges: GeneratedEdgeItem[],
) => {
  const validIds = new Set(topics.map((topic) => topic.id));
  const seen = new Set<string>();

  return edges.filter((edge) => {
    if (!validIds.has(edge.source) || !validIds.has(edge.target)) {
      return false;
    }

    if (edge.source === edge.target) {
      return false;
    }

    const key = `${edge.source}->${edge.target}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const buildTopologicalLayout = (
  nodeIds: string[],
  edgePairs: Array<{ source: string; target: string }>,
) => {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodeIds.forEach((id) => {
    graph.set(id, []);
    inDegree.set(id, 0);
  });

  edgePairs.forEach(({ source, target }) => {
    graph.get(source)?.push(target);
    inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
  });

  const queue: string[] = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const levels = new Map<string, number>();

  queue.forEach((id) => levels.set(id, 0));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) ?? 0;

    for (const neighbor of graph.get(current) ?? []) {
      levels.set(
        neighbor,
        Math.max(levels.get(neighbor) ?? 0, currentLevel + 1),
      );
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 1) - 1);
      if ((inDegree.get(neighbor) ?? 0) === 0) {
        queue.push(neighbor);
      }
    }
  }

  nodeIds.forEach((id) => {
    if (!levels.has(id)) {
      levels.set(id, 0);
    }
  });

  const columns = new Map<number, string[]>();
  nodeIds.forEach((id) => {
    const level = levels.get(id) ?? 0;
    if (!columns.has(level)) {
      columns.set(level, []);
    }
    columns.get(level)!.push(id);
  });

  const positions = new Map<string, { x: number; y: number }>();
  const horizontalSpacing = 320;
  const verticalSpacing = 150;

  Array.from(columns.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([level, ids]) => {
      ids.forEach((id, index) => {
        positions.set(id, {
          x: 160 + level * horizontalSpacing,
          y: 120 + index * verticalSpacing,
        });
      });
    });

  return positions;
};

const buildGraphArtifacts = (
  topics: GeneratedTopic[],
  edgeItems: GeneratedEdgeItem[],
) => {
  const dbIdByTopicId = new Map<string, string>();

  topics.forEach((topic, index) => {
    dbIdByTopicId.set(topic.id, String(index + 1));
  });

  const positions = buildTopologicalLayout(
    topics.map((topic) => topic.id),
    edgeItems.map((edge) => ({ source: edge.source, target: edge.target })),
  );

  const reactFlowNodes: Node[] = topics.map((topic) => {
    const dbId = dbIdByTopicId.get(topic.id)!;
    const position = positions.get(topic.id) ?? { x: 160, y: 120 };

    return {
      id: dbId,
      data: {
        label: topic.label,
        category: topic.category,
        description: topic.description,
        importance: topic.importance,
        generatedTopicId: topic.id,
      },
      type: "editableNode",
      position,
    } as Node;
  });

  const reactFlowEdges: Edge[] = edgeItems.map((edge) => {
    const source = dbIdByTopicId.get(edge.source)!;
    const target = dbIdByTopicId.get(edge.target)!;

    return {
      id: `${source}-${target}`,
      source,
      target,
      animated: true,
      data: {
        reason: edge.reason,
        strength: edge.strength,
      },
    } as Edge;
  });

  return {
    nodeLabels: topics.map((topic) => topic.label),
    edgePairs: reactFlowEdges.map((edge) => `${edge.source}->${edge.target}`),
    reactFlowNodes,
    reactFlowEdges,
    topicIdMap: Object.fromEntries(
      topics.map((topic, index) => [topic.id, String(index + 1)]),
    ),
  };
};

export const generateKnowledgeGraphFromCourseMaterial = async ({
  className,
  courseMaterial,
  granularity = "standard",
}: GenerateKnowledgeGraphInput) => {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("User not found");
    return { success: false, error: "User not found", graphData: null };
  }

  if (!courseMaterial.trim()) {
    return {
      success: false,
      error: "Course material is required",
      graphData: null,
    };
  }

  const { classRecord, error } = await getClassRecord(supabase, className);

  if (error || !classRecord) {
    console.error("Error fetching class record: ", error);
    return { success: false, error, graphData: null };
  }

  const courseLevel =
    typeof classRecord.level === "number" ? classRecord.level : 0;

  try {
    const topicResponse = await callGeminiStructured<GeneratedTopicResponse>(
      buildTopicPrompt({
        courseMaterial,
        courseLevel,
        granularity,
      }),
      TOPIC_SCHEMA,
      "low",
    );

    const normalizedTopics = normalizeGeneratedTopics(
      topicResponse.candidate_topics,
    );

    const edgeResponse = await callGeminiStructured<GeneratedEdgeResponse>(
      buildEdgePrompt({
        courseMaterial,
        topics: normalizedTopics,
      }),
      EDGE_SCHEMA,
      "medium",
    );

    const cleanedEdges = cleanGeneratedEdges(
      normalizedTopics,
      edgeResponse.edges,
    );

    const {
      nodeLabels,
      edgePairs,
      reactFlowNodes,
      reactFlowEdges,
      topicIdMap,
    } = buildGraphArtifacts(normalizedTopics, cleanedEdges);

    const reactFlowData: Json[] = [
      {
        reactFlowNodes: reactFlowNodes as unknown as Json,
        reactFlowEdges: reactFlowEdges as unknown as Json,
      },
    ];

    return {
      success: true,
      graphData: {
        nodes: nodeLabels,
        edges: edgePairs,
        react_flow_data: reactFlowData,
      },
      generated: {
        courseTitleGuess: topicResponse.course_title_guess,
        suggestedTopicCounts: topicResponse.suggested_topic_counts,
        categories: topicResponse.categories,
        topicIdMap,
        topics: normalizedTopics,
        edges: cleanedEdges,
      },
    };
  } catch (generationError) {
    console.error("Error generating graph: ", generationError);
    return {
      success: false,
      error:
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate graph",
      graphData: null,
    };
  }
};

export const saveGeneratedKnowledgeGraph = async (
  className: string,
  {
    nodes,
    edges,
    react_flow_data,
  }: {
    nodes: string[];
    edges: string[];
    react_flow_data: Json[];
  },
) => {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("User not found");
    return { success: false, error: "User not found", graphData: null };
  }

  const { classRecord, error } = await getClassRecord(supabase, className);

  if (error || !classRecord) {
    console.error("Error fetching class record: ", error);
    return { success: false, error, graphData: null };
  }

  const { error: upsertError } = await supabase
    .from("class_knowledge_graph")
    .upsert(
      {
        class_id: classRecord.class_id,
        react_flow_data,
        nodes,
        edges,
      },
      { onConflict: "class_id" },
    );

  if (upsertError) {
    console.error("Error saving generated graph: ", upsertError);
    return { success: false, error: upsertError, graphData: null };
  }

  return {
    success: true,
    graphData: {
      class_id: classRecord.class_id,
      nodes,
      edges,
      react_flow_data,
    },
  };
};

export const getKnowledgeGraphData = async (className: string) => {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("User not found");
    return { success: false, error: "User not found", graphData: null };
  }

  const { classRecord, error } = await getClassRecord(supabase, className);

  if (error || !classRecord) {
    console.error("Error fetching class record: ", error);
    return { success: false, error, graphData: null };
  }

  const { data: graphData, error: graphError } = await supabase
    .from("class_knowledge_graph")
    .select("nodes, edges, react_flow_data")
    .eq("class_id", classRecord.class_id)
    .maybeSingle();

  // console.log(classID)
  // console.log('---------> graphData: ', graphData)
  // console.log('---------> length: ', graphData?.length)

  if (graphError) {
    console.error("Error fetching graph data: ", graphError);
    return { success: false, error: graphError, graphData: [] };
  }

  if (!graphData) {
    return {
      success: true,
      graphData: {
        nodes: [],
        edges: [],
        react_flow_data: [
          {
            reactFlowNodes: [],
            reactFlowEdges: [],
          } as unknown as Json,
        ],
      },
    };
  }

  return { success: true, graphData };
};

export const updateKnowledgeGraph = async (
  className: string,
  {
    reactFlowNodes,
    reactFlowEdges,
  }: {
    reactFlowNodes: Node[];
    reactFlowEdges: Edge[];
  },
) => {
  const supabase = createClient();

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    console.error("User not found");
    return { success: false, error: "User not found" };
  }

  const { classRecord, error } = await getClassRecord(supabase, className);

  if (error || !classRecord) {
    console.error("Error fetching class record: ", error);
    return { success: false, error, graphData: null };
  }

  const updatedGraphData: Json[] = [
    {
      reactFlowNodes: reactFlowNodes as unknown as Json,
      reactFlowEdges: reactFlowEdges as unknown as Json,
    },
  ];
  // Derive simple arrays for nodes (labels) and edges (source->target) so they persist too
  const nodeLabels: string[] = (reactFlowNodes || []).map((n: any) => {
    const label = n?.data?.label;
    return typeof label === "string" ? label : `Topic ${n?.id ?? ""}`;
  });

  const edgePairs: string[] = (reactFlowEdges || [])
    .filter((e: any) => e?.source && e?.target)
    .map((e: any) => `${e.source}->${e.target}`);

  const { error: updateError } = await supabase
    .from("class_knowledge_graph")
    .upsert(
      {
        class_id: classRecord.class_id,
        react_flow_data: updatedGraphData,
        nodes: nodeLabels,
        edges: edgePairs,
      },
      { onConflict: "class_id" },
    );

  if (updateError) {
    console.error("Error updating graph data: ", updateError);
    return { success: false, error: updateError };
  }

  return { success: true };
};

interface CycleResult {
  isValid: boolean;
  cycleEdges?: Edge[];
}

export const detectCycle = async (edges: Edge[]): Promise<CycleResult> => {
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const edgeMap = new Map<string, Edge>();

  // initialize all nodes and create edge lookup map
  edges.forEach((edge) => {
    const edgeKey = `${edge.source}->${edge.target}`;
    edgeMap.set(edgeKey, edge);

    if (!graph.has(edge.source)) {
      graph.set(edge.source, new Set());
      inDegree.set(edge.source, 0);
    }

    if (!graph.has(edge.target)) {
      graph.set(edge.target, new Set());
      inDegree.set(edge.target, 0);
    }
  });

  // Build the graph and count in-degrees
  edges.forEach((edge) => {
    graph.get(edge.source)!.add(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycleEdges: Edge[] = [];

  // DFS function to find the actual cycle
  const findCycle = (node: string, path: Edge[] = []): boolean => {
    if (inStack.has(node)) {
      // cycle found
      const cycleStartIndex = path.findIndex((edge) => edge.source === node);
      cycleEdges.push(...path.slice(cycleStartIndex));
      return true;
    }

    if (visited.has(node)) {
      return false;
    }

    visited.add(node);
    inStack.add(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      const edgeKey = `${node}->${neighbor}`;
      const edge = edgeMap.get(edgeKey);
      if (edge) {
        if (findCycle(neighbor, [...path, edge])) {
          return true;
        }
      }
    }

    inStack.delete(node);
    return false;
  };

  for (const node of graph.keys()) {
    if (!visited.has(node) && findCycle(node)) {
      return {
        isValid: false,
        cycleEdges,
      };
    }
  }

  return {
    isValid: true,
  };
};
