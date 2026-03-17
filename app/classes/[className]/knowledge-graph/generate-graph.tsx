"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Background,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { Json } from "@/supabase";

import {
  generateKnowledgeGraphFromCourseMaterial,
} from "./actions";

type GraphGranularity = "simple" | "standard" | "detailed";

interface GeneratedTopic {
  id: string;
  label: string;
  category: string;
  description: string;
  importance: "core" | "supporting" | "advanced";
}

interface GeneratedEdge {
  source: string;
  target: string;
  reason: string;
  strength: "strong" | "moderate";
}

interface GraphPreviewData {
  nodes: string[];
  edges: string[];
  react_flow_data: Json[];
  class_id?: number;
}

interface PreviewFlowData {
  reactFlowNodes?: Node[];
  reactFlowEdges?: Edge[];
}

interface GeneratedMetadata {
  courseTitleGuess: string;
  suggestedTopicCounts: {
    simple: number;
    standard: number;
    detailed: number;
  };
  categories: string[];
  topicIdMap: Record<string, string>;
  topics: GeneratedTopic[];
  edges: GeneratedEdge[];
}

interface GenerateGraphProps {
  className: string;
  onPreviewGenerated?: (graphData: GraphPreviewData) => void;
  onSaved?: (graphData: GraphPreviewData) => void;
}

const defaultError = "Something went wrong while generating the graph.";

const extractRetryDelay = (errorText: string) => {
  const retryInMatch = errorText.match(/Please retry in ([0-9.]+)s/i);
  if (retryInMatch) {
    return `${Math.ceil(Number(retryInMatch[1]))} seconds`;
  }

  const retryDelayMatch = errorText.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (retryDelayMatch) {
    return `${retryDelayMatch[1]} seconds`;
  }

  return null;
};

const getQuotaPopupMessage = (errorText: string) => {
  const normalized = errorText.toLowerCase();
  const isQuotaError =
    normalized.includes("resource_exhausted") ||
    normalized.includes("quota exceeded") ||
    (normalized.includes("429") && normalized.includes("gemini"));

  if (!isQuotaError) {
    return null;
  }

  const retryDelay = extractRetryDelay(errorText);

  return retryDelay
    ? `You hit the Gemini free-tier request limit. Wait about ${retryDelay} and try again, or switch to a paid plan for a higher quota.`
    : "You hit the Gemini free-tier request limit. Try again later, or switch to a paid plan for a higher quota.";
};

export default function GenerateGraph({
  className,
  onPreviewGenerated,
  onSaved,
}: GenerateGraphProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [courseMaterial, setCourseMaterial] = useState("");
  const [granularity, setGranularity] = useState<GraphGranularity>("standard");
  const [error, setError] = useState<string | null>(null);
  const [quotaPopupMessage, setQuotaPopupMessage] = useState<string | null>(
    null,
  );
  const [preview, setPreview] = useState<GraphPreviewData | null>(null);
  const [generated, setGenerated] = useState<GeneratedMetadata | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const canGenerate = useMemo(
    () => courseMaterial.trim().length > 0,
    [courseMaterial],
  );
  const canSave = Boolean(preview && !isGenerating && !isSaving);
  const previewFlow = useMemo(() => {
    const rawFlow =
      preview?.react_flow_data &&
      Array.isArray(preview.react_flow_data) &&
      preview.react_flow_data[0]
        ? (preview.react_flow_data[0] as unknown as PreviewFlowData)
        : null;

    const nodes = Array.isArray(rawFlow?.reactFlowNodes)
      ? rawFlow.reactFlowNodes.map((node) => ({
          ...node,
          type: undefined,
          data: {
            ...node.data,
            label:
              typeof node?.data?.label === "string"
                ? node.data.label
                : `Topic ${node.id}`,
          },
        }))
      : [];

    const edges = Array.isArray(rawFlow?.reactFlowEdges)
      ? rawFlow.reactFlowEdges.map((edge) => ({
          ...edge,
          animated: true,
        }))
      : [];

    return { nodes, edges };
  }, [preview]);

  const resetState = () => {
    setError(null);
    setQuotaPopupMessage(null);
    setPreview(null);
    setGenerated(null);
  };

  const closeModal = () => {
    if (isGenerating || isSaving) return;
    setIsOpen(false);
  };

  const handleGenerate = () => {
    if (!canGenerate) {
      setError("Paste course material before generating a graph.");
      return;
    }

    setError(null);

    startGenerating(async () => {
      const result = await generateKnowledgeGraphFromCourseMaterial({
        className,
        courseMaterial,
        granularity,
      });

      if (!result.success || !result.graphData || !result.generated) {
        setPreview(null);
        setGenerated(null);
        const nextError =
          typeof result.error === "string"
            ? result.error
            : result.error
              ? JSON.stringify(result.error)
              : defaultError;
        setError(nextError);
        const quotaMessage = getQuotaPopupMessage(nextError);
        if (quotaMessage) {
          setQuotaPopupMessage(quotaMessage);
        }
        return;
      }

      const graphData = result.graphData as GraphPreviewData;
      setPreview(graphData);
      setGenerated(result.generated as GeneratedMetadata);
      onPreviewGenerated?.(graphData);
    });
  };

  const handleSave = () => {
    if (!preview) return;

    setError(null);

    startSaving(async () => {
      onSaved?.(preview);
      setIsOpen(false);
    });
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          resetState();
          setIsOpen(true);
        }}
      >
        Generate Graph
      </Button>

      <Dialog
        open={isOpen}
        onClose={closeModal}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            minHeight: "80vh",
            bgcolor: "background.paper",
            color: "text.primary",
          },
        }}
      >
        <DialogTitle>Generate Knowledge Graph</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Paste a course outline, topics list, or syllabus excerpt of course
            topics to generate a starter graph.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", lg: "1.15fr 0.85fr" },
              alignItems: "start",
            }}
          >
            <Box>
              <Stack spacing={2.5}>
                <FormControl fullWidth>
                  <InputLabel id="graph-granularity-label">
                    Granularity
                  </InputLabel>
                  <Select
                    labelId="graph-granularity-label"
                    value={granularity}
                    label="Granularity"
                    onChange={(e) =>
                      setGranularity(e.target.value as GraphGranularity)
                    }
                  >
                    <MenuItem value="simple">Simple</MenuItem>
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="detailed">Detailed</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Course material"
                  value={courseMaterial}
                  onChange={(e) => setCourseMaterial(e.target.value)}
                  placeholder="Paste a syllabus topics section, lecture list, unit outline, or learning objectives here..."
                  multiline
                  minRows={16}
                  fullWidth
                />

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating || isSaving}
                  >
                    {isGenerating ? "Generating..." : "Generate preview"}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setCourseMaterial("");
                      resetState();
                    }}
                    disabled={isGenerating || isSaving}
                  >
                    Clear
                  </Button>
                </Stack>

                {error ? <Alert severity="error">{error}</Alert> : null}
              </Stack>
            </Box>

            <Box>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Preview
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Review the generated structure before saving it to the
                      class graph. This will overwrite your current graph.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleSave}
                    disabled={!canSave}
                  >
                    {isSaving ? "Applying..." : "Use graph"}
                  </Button>
                </Box>

                {generated ? (
                  <Stack spacing={2}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: "background.paper",
                        color: "text.primary",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                          mb: 1.5,
                        }}
                      >
                        <Typography variant="overline" color="text.secondary">
                          Graph preview
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {previewFlow.nodes.length} nodes,{" "}
                          {previewFlow.edges.length} edges
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 260,
                          borderRadius: 1.5,
                          overflow: "hidden",
                          border: 1,
                          borderColor: "divider",
                          bgcolor:
                            theme.palette.mode === "light"
                              ? "#f7f8fa"
                              : "background.default",
                        }}
                      >
                        <ReactFlow
                          nodes={previewFlow.nodes}
                          edges={previewFlow.edges}
                          fitView
                          nodesDraggable={false}
                          nodesConnectable={false}
                          elementsSelectable
                          panOnDrag
                          zoomOnDoubleClick
                          zoomOnPinch
                          zoomOnScroll
                          preventScrolling={false}
                          colorMode={theme.palette.mode}
                          style={{
                            backgroundColor:
                              theme.palette.mode === "light"
                                ? "#f7f8fa"
                                : theme.palette.background.default,
                          }}
                        >
                          <Background gap={20} />
                        </ReactFlow>
                      </Box>
                    </Paper>

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: "background.paper",
                        color: "text.primary",
                      }}
                    >
                      <Typography variant="overline" color="text.secondary">
                        Suggested topic counts
                      </Typography>
                      <Box
                        sx={{
                          mt: 1.5,
                          display: "grid",
                          gap: 1,
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        }}
                      >
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            bgcolor: "action.hover",
                            color: "text.primary",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Simple
                          </Typography>
                          <Typography sx={{ fontWeight: 700 }}>
                            {generated.suggestedTopicCounts.simple}
                          </Typography>
                        </Paper>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            bgcolor: "action.hover",
                            color: "text.primary",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Standard
                          </Typography>
                          <Typography sx={{ fontWeight: 700 }}>
                            {generated.suggestedTopicCounts.standard}
                          </Typography>
                        </Paper>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            bgcolor: "action.hover",
                            color: "text.primary",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Detailed
                          </Typography>
                          <Typography sx={{ fontWeight: 700 }}>
                            {generated.suggestedTopicCounts.detailed}
                          </Typography>
                        </Paper>
                      </Box>
                    </Paper>

                    {generated.categories.length > 0 ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: "background.paper",
                          color: "text.primary",
                        }}
                      >
                        <Typography variant="overline" color="text.secondary">
                          Categories
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          useFlexGap
                          flexWrap="wrap"
                          sx={{ mt: 1.5 }}
                        >
                          {generated.categories.map((category) => (
                            <Chip
                              key={category}
                              label={category}
                              size="small"
                            />
                          ))}
                        </Stack>
                      </Paper>
                    ) : null}

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: "background.paper",
                        color: "text.primary",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                          mb: 1.5,
                        }}
                      >
                        <Typography variant="overline" color="text.secondary">
                          Topics
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {generated.topics.length} nodes
                        </Typography>
                      </Box>
                      <Stack
                        spacing={1.5}
                        sx={{ maxHeight: 240, overflowY: "auto", pr: 0.5 }}
                      >
                        {generated.topics.map((topic) => (
                          <Paper
                            key={topic.id}
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              bgcolor: "action.hover",
                              color: "text.primary",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 2,
                              }}
                            >
                              <Box>
                                <Typography variant="subtitle2">
                                  {topic.label}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {topic.category}
                                </Typography>
                              </Box>
                              <Chip
                                label={topic.importance}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1 }}
                            >
                              {topic.description}
                            </Typography>
                          </Paper>
                        ))}
                      </Stack>
                    </Paper>

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: "background.paper",
                        color: "text.primary",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                          mb: 1.5,
                        }}
                      >
                        <Typography variant="overline" color="text.secondary">
                          Dependencies
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {generated.edges.length} edges
                        </Typography>
                      </Box>
                      <Stack
                        spacing={1.5}
                        sx={{ maxHeight: 220, overflowY: "auto", pr: 0.5 }}
                      >
                        {generated.edges.length > 0 ? (
                          generated.edges.map((edge, index) => {
                            const sourceLabel =
                              generated.topics.find(
                                (topic) => topic.id === edge.source,
                              )?.label ?? edge.source;
                            const targetLabel =
                              generated.topics.find(
                                (topic) => topic.id === edge.target,
                              )?.label ?? edge.target;

                            return (
                              <Paper
                                key={`${edge.source}-${edge.target}-${index}`}
                                variant="outlined"
                                sx={{
                                  p: 1.5,
                                  bgcolor: "action.hover",
                                  color: "text.primary",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 2,
                                  }}
                                >
                                  <Typography variant="subtitle2">
                                    {sourceLabel} {"->"} {targetLabel}
                                  </Typography>
                                  <Chip
                                    label={edge.strength}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 1 }}
                                >
                                  {edge.reason}
                                </Typography>
                              </Paper>
                            );
                          })
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No dependencies were generated.
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Stack>
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 4,
                      bgcolor: "background.paper",
                      borderStyle: "dashed",
                      textAlign: "center",
                      color: "text.secondary",
                    }}
                  >
                    <Typography variant="body2">
                      Generate a preview to inspect topics, categories, and
                      prerequisite edges before saving.
                    </Typography>
                  </Paper>
                )}
              </Stack>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} disabled={isGenerating || isSaving}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(quotaPopupMessage)}
        autoHideDuration={8000}
        onClose={() => setQuotaPopupMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setQuotaPopupMessage(null)}
          sx={{ width: "100%", maxWidth: 560 }}
        >
          {quotaPopupMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
