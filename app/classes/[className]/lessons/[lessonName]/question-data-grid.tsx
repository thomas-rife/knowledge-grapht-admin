"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Box,
  Chip,
  Collapse,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  TablePagination,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter } from "next/navigation";
import {
  getLessonQuestions,
  deleteQuestionFromLesson,
  createNewQuestion,
  importQuestionsFromFile,
  generateQuestionFromPrompt,
} from "@/app/classes/[className]/lessons/[lessonName]/actions";
import { getQuestionTopicOptions } from "@/app/classes/[className]/lessons/actions";
import { useQuestionContext } from "@/contexts/question-context";
import { GraphTopic } from "@/types/content.types";
import TopicPicker from "@/components/questions/topic-picker";
import QuestionEditor, {
  createDefaultAnswerOptions,
} from "@/components/questions/question-editor";

type QuestionListRecord = {
  id: number;
  prompt: string;
  questionType: string;
  snippet: string;
  topicLabels: string[];
  topicNodeIds: string[];
  optionsRaw: any[];
  answerOptions: string[];
  answer: string;
  imageUrl: string;
};

const normalizeOptions = (arr: any[]): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr.map((option) => {
    if (typeof option === "string") return option;
    if (option && typeof option === "object") {
      const candidates = [
        "text",
        "label",
        "value",
        "option",
        "content",
        "title",
        "answer",
        "answer_text",
        "name",
      ] as const;
      for (const key of candidates) {
        const value = option[key];
        if (typeof value === "string" && value.trim()) return value;
      }
      const stringValues = Object.values(option).filter(
        (value) => typeof value === "string",
      );
      if (stringValues.length === 1) return String(stringValues[0]);
      return JSON.stringify(option);
    }
    return String(option ?? "");
  });
};

const normalizeOptionKey = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();

const toQuestionListRecord = (
  question: Awaited<ReturnType<typeof getLessonQuestions>>[number],
): QuestionListRecord => ({
  id: question.question_id,
  prompt: question.prompt?.trim() || "Untitled question",
  questionType: question.question_type,
  snippet: question.snippet ?? "",
  topicLabels: question.topics ?? [],
  topicNodeIds: question.topic_node_ids ?? [],
  optionsRaw: question.answer_options ?? [],
  answerOptions: normalizeOptions(question.answer_options ?? []),
  answer: question.answer ?? "",
  imageUrl: question.image_url ?? "",
});

const formatQuestionType = (questionType: string) =>
  questionType
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const QuestionListSkeleton = () => (
  <Stack spacing={1.5}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Paper key={index} variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Skeleton variant="circular" width={28} height={28} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width={`${70 - index * 5}%`} height={28} />
            <Skeleton width="42%" height={22} sx={{ mt: 1 }} />
          </Box>
        </Box>
      </Paper>
    ))}
  </Stack>
);

const QuestionDataGrid = ({
  params,
  dataLoading,
  setDataLoading,
  setOpen,
  refreshGrid,
}: {
  params: {
    className: string;
    lessonName: string;
  };
  dataLoading: boolean;
  setDataLoading: Dispatch<SetStateAction<boolean>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  refreshGrid: number;
}) => {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionListRecord[]>([]);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<number>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [questionsPerPage, setQuestionsPerPage] = useState(25);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const {
    questionID,
    setQuestionID,
    setQuestionType,
    setQuestionPrompt,
    setQuestionSnippet,
    setQuestionOptions,
    setCorrectAnswer,
    setTopicsCovered,
    resetStates,
  } = useQuestionContext();

  const [aiBusy, setAiBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiStep, setAiStep] = useState<"prompt" | "preview">("prompt");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiTopics, setAiTopics] = useState<GraphTopic[]>([]);
  const [lessonTopicNodeIds, setLessonTopicNodeIds] = useState<string[]>([]);
  const [aiTopicNodeIds, setAiTopicNodeIds] = useState<string[]>([]);
  const [aiTopicsLoading, setAiTopicsLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftSnippet, setDraftSnippet] = useState("");
  const [draftOptions, setDraftOptions] = useState<string[]>([]);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [draftImageUrl, setDraftImageUrl] = useState("");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const { setImageUrl } = useQuestionContext();

  const refreshQuestions = useCallback(async () => {
    const lessonQuestions = await getLessonQuestions(
      params.className,
      params.lessonName,
    );
    setQuestions(lessonQuestions.map(toQuestionListRecord));
  }, [params.className, params.lessonName]);

  const handleImport = async () => {
    const text = importText.trim();
    if (!text) return;

    setImporting(true);
    try {
      // Decode and clean the lesson name/ID from URL params
      const rawLesson = Array.isArray(params.lessonName)
        ? params.lessonName[0]
        : params.lessonName;

      console.log("[IMPORT] Raw lesson param:", rawLesson);

      // Check if it's a numeric ID
      const isNumeric = /^\d+$/.test(String(rawLesson));

      let lessonIdentifier;
      if (isNumeric) {
        // It's already an ID, use it directly
        lessonIdentifier = Number(rawLesson);
        console.log("[IMPORT] Using lesson ID:", lessonIdentifier);
      } else {
        // It's a name/slug - decode and convert hyphens to spaces
        lessonIdentifier = decodeURIComponent(String(rawLesson))
          .replace(/-/g, " ")
          .trim();
        console.log("[IMPORT] Using lesson name:", lessonIdentifier);
      }

      const result = await importQuestionsFromFile({
        csvText: text,
        className: params.className,
        lessonIdOrName: lessonIdentifier,
      });

      if (!result.success) {
        alert(`Import failed:\n\n${result.error}`);
        return;
      }

      // Build detailed message
      let message = `Import Complete!\n\n`;
      message += `Total rows processed: ${result.total ?? 0}\n`;
      message += `✅ Successfully imported: ${
        result.imported ?? 0
      } questions\n`;

      if ((result.failed ?? 0) > 0) {
        message += `❌ Failed: ${result.failed} questions\n`;
      }

      if (result.validationErrors && result.validationErrors.length > 0) {
        message += `\nValidation Errors (${result.validationErrors.length}):\n`;
        message += result.validationErrors.slice(0, 5).join("\n");
        if (result.validationErrors.length > 5) {
          message += `\n...and ${result.validationErrors.length - 5} more`;
        }
      }

      if (result.uploadErrors && result.uploadErrors.length > 0) {
        message += `\n\nUpload Errors:\n`;
        message += result.uploadErrors.slice(0, 3).join("\n");
        if (result.uploadErrors.length > 3) {
          message += `\n...and ${result.uploadErrors.length - 3} more`;
        }
      }

      alert(message);

      // Refresh the list if any questions were imported.
      if ((result.imported ?? 0) > 0) {
        await refreshQuestions();
      }

      setImportDialogOpen(false);
      setImportText("");
    } catch (e) {
      console.error("Import error:", e);
      alert("Error importing questions: " + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleOpenAIGenerator = async () => {
    setPreviewOpen(true);
    setAiStep("prompt");
    setAiError("");
    setAiInstruction("");
    setAiTopicNodeIds([]);
    setDraftPrompt("");
    setDraftSnippet("");
    setDraftOptions(createDefaultAnswerOptions());
    setDraftAnswer("");
    setDraftImageUrl("");

    if (aiTopics.length) return;

    setAiTopicsLoading(true);
    try {
      const result = await getQuestionTopicOptions(
        params.className,
        params.lessonName,
      );

      if (!result.success) {
        setAiError("Unable to load topics from this class graph.");
        return;
      }

      setAiTopics(result.topics);
      setLessonTopicNodeIds(result.lessonTopicNodeIds ?? []);
      if (!result.topics.length) {
        setAiError("Add topics to the class graph before generating a question.");
      }
    } catch (error) {
      console.error("Unable to load graph topics:", error);
      setAiError("Unable to load topics from this class graph.");
    } finally {
      setAiTopicsLoading(false);
    }
  };

  const handleCloseAIGenerator = () => {
    if (aiBusy) return;
    setPreviewOpen(false);
    setAiError("");
  };

  const handleGenerateAI = async () => {
    if (!aiInstruction.trim()) {
      setAiError("Describe the question you want to generate.");
      return;
    }
    if (!aiTopicNodeIds.length) {
      setAiError("Select at least one graph topic.");
      return;
    }

    setAiBusy(true);
    setAiError("");
    try {
      const result = await generateQuestionFromPrompt({
        className: params.className,
        lessonName: params.lessonName,
        instruction: aiInstruction,
        topicNodeIds: aiTopicNodeIds,
      });

      if (!result.success || !result.data) {
        setAiError(result.error ?? "Question generation failed.");
        return;
      }

      setAiTopicNodeIds(result.data.topicNodeIds);
      setDraftPrompt(result.data.prompt);
      setDraftSnippet(result.data.snippet);
      const generatedOptions = normalizeOptions(result.data.answerOptions).map(
        (option) => option.trim(),
      );
      const optionKeys = generatedOptions.map(normalizeOptionKey);
      if (
        generatedOptions.length !== 4 ||
        optionKeys.some((option) => !option) ||
        new Set(optionKeys).size !== optionKeys.length
      ) {
        setAiError(
          "The generated question contained duplicate or empty answers. Generate it again.",
        );
        return;
      }

      const matchingAnswer = generatedOptions.find(
        (option) =>
          normalizeOptionKey(option) ===
          normalizeOptionKey(result.data.answer),
      );
      if (!matchingAnswer) {
        setAiError(
          "The generated correct answer did not match an answer option. Generate it again.",
        );
        return;
      }

      setDraftOptions(generatedOptions);
      setDraftAnswer(matchingAnswer);
      setAiStep("preview");
    } catch (error) {
      console.error("Question generation failed:", error);
      setAiError("Question generation failed. Please try again.");
    } finally {
      setAiBusy(false);
    }
  };

  const handleSaveGenerated = async () => {
    try {
      const answerOptions = draftOptions.map((option) => option.trim());
      const uniqueOptions = new Set(
        answerOptions.map(normalizeOptionKey),
      );
      const selectedTopics = aiTopics.filter((topic) =>
        aiTopicNodeIds.includes(topic.id),
      );

      if (!draftPrompt.trim()) {
        setAiError("The question prompt cannot be empty.");
        return;
      }
      if (
        answerOptions.length < 2 ||
        answerOptions.some((option) => !option) ||
        uniqueOptions.size !== answerOptions.length
      ) {
        setAiError("Provide at least two distinct, non-empty answer options.");
        return;
      }
      if (!answerOptions.includes(draftAnswer)) {
        setAiError("Select the correct answer from the answer options.");
        return;
      }
      if (selectedTopics.length !== aiTopicNodeIds.length) {
        setAiError("One or more selected topics are no longer available.");
        return;
      }

      setAiError("");

      const payload = {
        questionType: "multiple-choice",
        prompt: draftPrompt.trim(),
        snippet: draftSnippet.trim() || "",
        topics: selectedTopics.map((topic) => topic.label),
        topicNodeIds: aiTopicNodeIds,
        answerOptions: answerOptions.map((option, index) => ({
          [`option${index + 1}`]: option,
        })),
        answer: draftAnswer.trim() || "",
        image_url: draftImageUrl.trim() || null,
        is_ai_generated: true,
      };

      // console.log(
      //   "[UI] createNewQuestion payload.image_url =>",
      //   payload.image_url,
      //   payload
      // );

      setAiBusy(true);
      const res = await createNewQuestion(
        params.lessonName,
        params.className,
        payload,
      );
      if (!res?.success) {
        setAiError(
          typeof res?.error === "string"
            ? res.error
            : "Failed to save question.",
        );
        return;
      }

      await refreshQuestions();
      setPreviewOpen(false);
    } catch (e) {
      console.error("Error saving question:", e);
      setAiError("Error saving question.");
    } finally {
      setAiBusy(false);
    }
  };

  const handleConfimationDialogOpen = (id: number) => {
    setQuestionID(id);
    setConfirmationDialogOpen(true);
  };

  const handleConfimationDialogClose = () => {
    setQuestionID(null);
    setConfirmationDialogOpen(false);
  };

  const handleEditClick = (id: number) => () => {
    const question = questions.find((item) => item.id === id);
    if (!question) return;

    setQuestionID(question.id);
    setQuestionType(question.questionType);
    setQuestionPrompt(question.prompt);
    setQuestionSnippet(question.snippet);

    const formattedOptions = Array.isArray(question.optionsRaw)
      ? question.optionsRaw.map((opt, i) => {
          if (typeof opt === "object" && opt !== null) {
            return opt;
          }
          return { [`option${i + 1}`]: String(opt) };
        })
      : [];

    setQuestionOptions(formattedOptions);

    setTimeout(() => {
      setCorrectAnswer(question.answer);
    }, 0);

    setTopicsCovered(question.topicNodeIds);
    setImageUrl(question.imageUrl);

    setOpen(true);
  };

  const handleDeleteQuestion = (id: number) => async () => {
    try {
      setDataLoading(true);
      const res = await deleteQuestionFromLesson(
        params.className,
        params.lessonName,
        id,
      );
      if (!res?.success) {
        alert(res?.error || "Failed to delete question");
        setDataLoading(false);
        return;
      }
      await refreshQuestions();
      handleConfimationDialogClose();
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchLessonQuestions = async () => {
      try {
        await refreshQuestions();
      } finally {
        if (active) setDataLoading(false);
      }
    };

    fetchLessonQuestions();
    return () => {
      active = false;
    };
  }, [refreshGrid, refreshQuestions, setDataLoading]);

  const questionTypes = useMemo(
    () =>
      Array.from(new Set(questions.map((question) => question.questionType)))
        .filter(Boolean)
        .sort(),
    [questions],
  );

  const topicOptions = useMemo(
    () =>
      Array.from(
        new Set(questions.flatMap((question) => question.topicLabels)),
      )
        .filter(Boolean)
        .sort((first, second) => first.localeCompare(second)),
    [questions],
  );

  const filteredQuestions = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();

    return questions.filter((question) => {
      const searchableValues = [
        question.prompt,
        question.answer,
        question.questionType,
        ...question.topicLabels,
        ...question.answerOptions,
      ];
      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          value.toLocaleLowerCase().includes(query),
        );
      const matchesType =
        questionTypeFilter === "all" ||
        question.questionType === questionTypeFilter;
      const matchesTopic =
        topicFilter === "all" || question.topicLabels.includes(topicFilter);

      return matchesSearch && matchesType && matchesTopic;
    });
  }, [questions, questionTypeFilter, searchTerm, topicFilter]);

  const visibleQuestions = useMemo(
    () =>
      filteredQuestions.slice(
        page * questionsPerPage,
        page * questionsPerPage + questionsPerPage,
      ),
    [filteredQuestions, page, questionsPerPage],
  );

  useEffect(() => {
    setPage(0);
  }, [searchTerm, questionTypeFilter, topicFilter, questionsPerPage]);

  useEffect(() => {
    const lastPage = Math.max(
      0,
      Math.ceil(filteredQuestions.length / questionsPerPage) - 1,
    );
    if (page > lastPage) setPage(lastPage);
  }, [filteredQuestions.length, page, questionsPerPage]);

  const toggleQuestionDetails = (id: number) => {
    setExpandedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {dataLoading ? (
        <Box sx={{ px: 3, py: 2 }}>
          <QuestionListSkeleton />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              px: 3,
              py: 2,
              gap: 2,
              flexShrink: 0,
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
              <Tooltip title="Back to lessons">
                <IconButton
                  aria-label="Back to lessons"
                  onClick={() =>
                    router.push(`/classes/${params.className}/lessons`)
                  }
                  sx={{ mt: 0.25 }}
                >
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
              <Box>
                <Typography variant="h4" component="h1" fontWeight={700}>
                  {decodeURIComponent(params.lessonName).replace(/-/g, " ")}
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Questions
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1,
                minWidth: 0,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => setImportDialogOpen(true)}
              >
                Import questions
              </Button>
              <Button
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleOpenAIGenerator}
              >
                Generate with AI
              </Button>
              <Button
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => {
                  resetStates();
                  setOpen(true);
                }}
              >
                Add question
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              width: "100%",
              px: 3,
              pb: 3,
              overflowY: "auto",
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 1fr) 210px 240px",
                gap: 1.5,
                p: 1.5,
                mb: 1.5,
              }}
            >
              <TextField
                size="small"
                placeholder="Search questions, answers, or topics"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControl size="small">
                <InputLabel id="question-type-filter-label">Type</InputLabel>
                <Select
                  labelId="question-type-filter-label"
                  value={questionTypeFilter}
                  label="Type"
                  onChange={(event) =>
                    setQuestionTypeFilter(event.target.value)
                  }
                >
                  <MenuItem value="all">All types</MenuItem>
                  {questionTypes.map((questionType) => (
                    <MenuItem key={questionType} value={questionType}>
                      {formatQuestionType(questionType)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel id="question-topic-filter-label">Topic</InputLabel>
                <Select
                  labelId="question-topic-filter-label"
                  value={topicFilter}
                  label="Topic"
                  onChange={(event) => setTopicFilter(event.target.value)}
                >
                  <MenuItem value="all">All topics</MenuItem>
                  {topicOptions.map((topic) => (
                    <MenuItem key={topic} value={topic}>
                      {topic}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {visibleQuestions.length ? (
              <Stack spacing={1}>
                {visibleQuestions.map((question, index) => {
                  const expanded = expandedQuestionIds.has(question.id);
                  const visibleTopics = question.topicLabels.slice(0, 4);
                  const hiddenTopicCount =
                    question.topicLabels.length - visibleTopics.length;

                  return (
                    <Paper key={question.id} variant="outlined">
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "32px minmax(0, 1fr) auto",
                          gap: 1.5,
                          alignItems: "start",
                          p: 2,
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ pt: 0.25, fontVariantNumeric: "tabular-nums" }}
                        >
                          {page * questionsPerPage + index + 1}
                        </Typography>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            component="h2"
                            fontWeight={700}
                            sx={{ overflowWrap: "anywhere" }}
                          >
                            {question.prompt}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.75,
                              mt: 1,
                            }}
                          >
                            <Chip
                              size="small"
                              variant="outlined"
                              label={formatQuestionType(question.questionType)}
                            />
                            {visibleTopics.map((topic) => (
                              <Chip key={topic} size="small" label={topic} />
                            ))}
                            {hiddenTopicCount > 0 && (
                              <Tooltip
                                title={question.topicLabels
                                  .slice(visibleTopics.length)
                                  .join(", ")}
                              >
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`+${hiddenTopicCount} topics`}
                                />
                              </Tooltip>
                            )}
                          </Box>
                          {question.answer && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <Box
                                component="span"
                                sx={{ color: "text.secondary" }}
                              >
                                Correct answer:{" "}
                              </Box>
                              <Box
                                component="span"
                                sx={{ color: "success.main", fontWeight: 700 }}
                              >
                                {question.answer}
                              </Box>
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Tooltip title="Edit question">
                            <IconButton
                              aria-label={`Edit question: ${question.prompt}`}
                              onClick={handleEditClick(question.id)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete question">
                            <IconButton
                              color="error"
                              aria-label={`Delete question: ${question.prompt}`}
                              onClick={() =>
                                handleConfimationDialogOpen(question.id)
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            title={expanded ? "Hide details" : "Show details"}
                          >
                            <IconButton
                              aria-label={`${expanded ? "Hide" : "Show"} details for: ${question.prompt}`}
                              aria-expanded={expanded}
                              onClick={() =>
                                toggleQuestionDetails(question.id)
                              }
                              sx={{
                                transform: expanded
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: (theme) =>
                                  theme.transitions.create("transform"),
                              }}
                            >
                              <ExpandMoreIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Collapse in={expanded} unmountOnExit>
                        <Divider />
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 3,
                            px: 2,
                            py: 2.5,
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle2">
                              Answer options
                            </Typography>
                            {question.answerOptions.length ? (
                              <Box
                                component="ol"
                                sx={{
                                  m: 0,
                                  mt: 1,
                                  pl: 2.5,
                                  display: "grid",
                                  gap: 0.75,
                                }}
                              >
                                {question.answerOptions.map((option, optionIndex) => (
                                  <Typography
                                    component="li"
                                    variant="body2"
                                    key={`${question.id}-${optionIndex}`}
                                    sx={{
                                      color:
                                        option === question.answer
                                          ? "success.main"
                                          : "text.primary",
                                      fontWeight:
                                        option === question.answer ? 700 : 400,
                                    }}
                                  >
                                    {option}
                                  </Typography>
                                ))}
                              </Box>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1 }}
                              >
                                No answer options
                              </Typography>
                            )}
                          </Box>

                          <Stack spacing={2}>
                            {question.snippet && (
                              <Box>
                                <Typography variant="subtitle2">
                                  Snippet
                                </Typography>
                                <Box
                                  component="pre"
                                  sx={{
                                    m: 0,
                                    mt: 1,
                                    p: 1.5,
                                    overflowX: "auto",
                                    bgcolor: "action.hover",
                                    borderRadius: 1,
                                    fontSize: 13,
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {question.snippet}
                                </Box>
                              </Box>
                            )}
                            {question.imageUrl && (
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                  Image
                                </Typography>
                                <Box
                                  component="img"
                                  src={question.imageUrl}
                                  alt="Question reference"
                                  sx={{
                                    display: "block",
                                    maxWidth: "100%",
                                    maxHeight: 240,
                                    objectFit: "contain",
                                    borderRadius: 1,
                                  }}
                                />
                              </Box>
                            )}
                            {!question.snippet && !question.imageUrl && (
                              <Box>
                                <Typography variant="subtitle2">
                                  Additional content
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 1 }}
                                >
                                  No snippet or image attached
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Box
                sx={{
                  minHeight: 260,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  borderTop: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="h6">
                  {questions.length
                    ? "No questions match these filters"
                    : "No questions yet"}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {questions.length
                    ? "Try another search, type, or topic."
                    : "Add, import, or generate the first question for this lesson."}
                </Typography>
              </Box>
            )}

            <TablePagination
              component="div"
              count={filteredQuestions.length}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={questionsPerPage}
              onRowsPerPageChange={(event) =>
                setQuestionsPerPage(Number(event.target.value))
              }
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="Questions per page"
            />
          </Box>

          {/* AI question generator */}
          <Dialog
            open={previewOpen}
            onClose={handleCloseAIGenerator}
            fullWidth
            maxWidth="lg"
          >
            <DialogTitle>
              {aiStep === "prompt"
                ? "Generate a question with AI"
                : "Review generated question"}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {aiError && <Alert severity="error">{aiError}</Alert>}

                {aiStep === "prompt" ? (
                  <>
                    <TextField
                      label="What should this question assess?"
                      value={aiInstruction}
                      onChange={(event) => setAiInstruction(event.target.value)}
                      placeholder="For example: Create a debugging question where students identify why a nested loop runs one extra time."
                      fullWidth
                      multiline
                      minRows={5}
                      inputProps={{ maxLength: 2000 }}
                      helperText={`${aiInstruction.length}/2000`}
                      disabled={aiBusy}
                    />

                    <TopicPicker
                      topics={aiTopics}
                      value={aiTopicNodeIds}
                      onChange={setAiTopicNodeIds}
                      label="Topics covered"
                      loading={aiTopicsLoading}
                      disabled={aiBusy}
                      columns={3}
                      preferredTopicNodeIds={lessonTopicNodeIds}
                    />
                  </>
                ) : (
                  <QuestionEditor
                    prompt={draftPrompt}
                    onPromptChange={setDraftPrompt}
                    snippet={draftSnippet}
                    onSnippetChange={setDraftSnippet}
                    options={draftOptions}
                    onOptionsChange={setDraftOptions}
                    correctAnswer={draftAnswer}
                    onCorrectAnswerChange={setDraftAnswer}
                    topics={aiTopics}
                    selectedTopicNodeIds={aiTopicNodeIds}
                    onSelectedTopicNodeIdsChange={setAiTopicNodeIds}
                    imageUrl={draftImageUrl}
                    onImageUrlChange={setDraftImageUrl}
                    disabled={aiBusy}
                    preferredTopicNodeIds={lessonTopicNodeIds}
                  />
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseAIGenerator} disabled={aiBusy}>
                Cancel
              </Button>
              {aiStep === "prompt" ? (
                <Button
                  variant="contained"
                  onClick={handleGenerateAI}
                  disabled={
                    aiBusy ||
                    aiTopicsLoading ||
                    !aiInstruction.trim() ||
                    !aiTopicNodeIds.length
                  }
                  startIcon={
                    aiBusy ? <CircularProgress size={18} /> : <AutoAwesomeIcon />
                  }
                >
                  {aiBusy ? "Generating..." : "Generate question"}
                </Button>
              ) : (
                <>
                  <Button onClick={() => setAiStep("prompt")} disabled={aiBusy}>
                    Back
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleGenerateAI}
                    disabled={aiBusy}
                    startIcon={
                      aiBusy ? (
                        <CircularProgress size={18} />
                      ) : (
                        <AutoAwesomeIcon />
                      )
                    }
                  >
                    {aiBusy ? "Generating..." : "Regenerate"}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSaveGenerated}
                    disabled={aiBusy}
                  >
                    Save to lesson
                  </Button>
                </>
              )}
            </DialogActions>
          </Dialog>

          {/* Import Dialog */}
          <Dialog
            open={importDialogOpen}
            onClose={() => {
              setImportDialogOpen(false);
              setImportText("");
            }}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Import Questions from Text</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <TextField
                  label="Paste CSV text here"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  fullWidth
                  multiline
                  minRows={6}
                  placeholder={`prompt,question_type,snippet,topics,answer_options,answer,image_url
"What command can be used to unzip a file?",multiple-choice,"","Command Line Basics","unzip;zipopen;extract;openzip","unzip",""`}
                />

                <Box sx={{ fontSize: 14, color: "text.secondary" }}>
                  <strong>CSV must include this header row exactly:</strong>
                  <Box sx={{ fontSize: 12, fontFamily: "monospace" }}>
                    prompt,question_type,snippet,topics,answer_options,answer,image_url
                  </Box>
                </Box>

                <Box sx={{ fontSize: 14, color: "text.secondary", mt: 1 }}>
                  <strong>Example data row:</strong>
                  <Box sx={{ fontSize: 12, fontFamily: "monospace" }}>
                    "Which command shows the current
                    folder?",multiple-choice,"","Command Line
                    Basics","ls;cd;pwd;mkdir","pwd",""
                  </Box>
                </Box>

                <Box sx={{ fontSize: 14, color: "text.secondary" }}>
                  <strong>Formatting rules:</strong>
                  <ul
                    style={{
                      marginTop: 8,
                      paddingLeft: 20,
                      display: "flex",
                      flexDirection: "column",
                      rowGap: 8,
                    }}
                  >
                    <li>prompt is required</li>
                    <li>
                      question_type is required, use "multiple-choice" for now
                    </li>
                    <li>snippet is optional, use "" if you want it empty</li>
                    <li>
                      topics is required. Use a semicolon separated list like
                      "Command Line Basics;Loops" and make sure they are topics
                      in the knowledge graph.
                    </li>
                    <li>
                      answer_options is optional for multiple-choice, use a
                      semicolon separated list like "A;B;C;D"
                    </li>
                    <li>
                      answer is required and should match one of the
                      answer_options
                    </li>
                    <li>
                      image_url is optional, use "" if you do not have an image
                    </li>
                  </ul>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setImportDialogOpen(false);
                  setImportText("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={!importText.trim() || importing}
              >
                {importing ? "Importing..." : "Import"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={confirmationDialogOpen}>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogContent>
              Are you sure you want to delete this question?
            </DialogContent>
            <DialogActions>
              <Button onClick={handleConfimationDialogClose}>Cancel</Button>
              <Button
                color="error"
                onClick={handleDeleteQuestion(questionID as number)}
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default QuestionDataGrid;
