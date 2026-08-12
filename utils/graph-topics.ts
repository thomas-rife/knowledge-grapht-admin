import { GraphTopic } from "@/types/content.types";

const normalizeLabel = (value: string) => value.trim().toLocaleLowerCase();

export const extractGraphTopics = (reactFlowData: unknown): GraphTopic[] => {
  const firstFlow =
    Array.isArray(reactFlowData) && reactFlowData.length > 0
      ? reactFlowData[0]
      : null;
  const nodes =
    firstFlow &&
    typeof firstFlow === "object" &&
    Array.isArray((firstFlow as any).reactFlowNodes)
      ? (firstFlow as any).reactFlowNodes
      : [];

  return nodes
    .map((node: any) => ({
      id: String(node?.id ?? "").trim(),
      label: String(node?.data?.label ?? "").trim(),
    }))
    .filter((topic: GraphTopic) => topic.id && topic.label);
};

export const resolveGraphTopicValues = (
  graphTopics: GraphTopic[],
  values: unknown,
) => {
  const topicById = new Map(graphTopics.map((topic) => [topic.id, topic]));
  const topicIdsByLabel = new Map<string, string[]>();

  graphTopics.forEach((topic) => {
    const key = normalizeLabel(topic.label);
    topicIdsByLabel.set(key, [...(topicIdsByLabel.get(key) ?? []), topic.id]);
  });

  const nodeIds: string[] = [];
  const unresolved: string[] = [];

  (Array.isArray(values) ? values : []).forEach((rawValue) => {
    const value = String(rawValue ?? "").trim();
    if (!value) return;

    if (topicById.has(value)) {
      nodeIds.push(value);
      return;
    }

    const matchingIds = topicIdsByLabel.get(normalizeLabel(value)) ?? [];
    if (matchingIds.length === 1) {
      nodeIds.push(matchingIds[0]);
    } else {
      unresolved.push(value);
    }
  });

  const uniqueNodeIds = Array.from(new Set(nodeIds));

  return {
    nodeIds: uniqueNodeIds,
    labels: uniqueNodeIds
      .map((nodeId) => topicById.get(nodeId)?.label)
      .filter((label): label is string => Boolean(label)),
    unresolved: Array.from(new Set(unresolved)),
  };
};
