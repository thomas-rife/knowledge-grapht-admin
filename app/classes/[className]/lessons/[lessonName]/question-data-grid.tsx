"use client";

import { type Dispatch, type SetStateAction, useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  GridRowsProp,
  DataGrid,
  GridColDef,
  GridToolbar,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import {
  getLessonQuestions,
  deleteQuestionFromLesson,
  createNewQuestion,
  getClassIdByName,
  importQuestionsFromFile,
  getLessonIdByName,
} from "@/app/classes/[className]/lessons/[lessonName]/actions";
import DataGridSkeleton from "@/components/skeletons/data-grid-skeleton";
import { useQuestionContext } from "@/contexts/question-context";
import { generateQuestionLLM } from "./actions";
import { useParams } from "next/navigation";

interface TokenObject {
  text: string;
  position?: [number, number];
  range?: number[];
  isDistractor?: boolean;
}

interface ProfessorView {
  professorView: TokenObject[];
}

interface StudentView {
  studentView: {
    tokens: string[];
    problem: string[];
  }[];
}

type RearrangeOptions = [ProfessorView, StudentView];

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
  const [rows, setRows] = useState<GridRowsProp>([]);
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
  } = useQuestionContext();

  const paramsNav = useParams();
  const [aiBusy, setAiBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // const [draftType, setDraftType] = useState<'multiple_choice' | 'short_answer'>('multiple_choice')
  const [draftType, setDraftType] =
    useState<"multiple_choice">("multiple_choice");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftSnippet, setDraftSnippet] = useState("");
  const [draftTopicsText, setDraftTopicsText] = useState("");
  const [draftOptionsText, setDraftOptionsText] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [draftImageUrl, setDraftImageUrl] = useState("");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const { setImageUrl } = useQuestionContext();

  const normalizeOptions = (arr: any[]): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((o) => {
      if (typeof o === "string") return o;
      if (o && typeof o === "object") {
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
        for (const k of candidates) {
          const v = (o as any)[k];
          if (typeof v === "string" && v.trim() !== "") return v;
        }
        const stringProps = Object.entries(o).filter(
          ([, v]) => typeof v === "string",
        );
        if (stringProps.length === 1) return String(stringProps[0][1]);
        try {
          return JSON.stringify(o);
        } catch {
          return String(o);
        }
      }
      return String(o ?? "");
    });
  };

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

      const result = await importQuestionsFromFile(text, lessonIdentifier);

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

      // Refresh the grid if any questions were imported
      if ((result.imported ?? 0) > 0) {
        const lessonQuestions = await getLessonQuestions(
          params.className,
          params.lessonName,
        );
        const tableRows = lessonQuestions.map(
          ({
            question_id,
            question_type,
            prompt,
            snippet,
            topics,
            answer_options,
            answer,
            image_url,
          }) => ({
            id: question_id,
            promptColumn: prompt,
            questionTypeColumn: question_type,
            snippetColumn: snippet,
            unitsCoveredColumn: topics?.join(", ") || "",
            optionsColumn: Array.isArray(answer_options)
              ? answer_options.join(", ")
              : "",
            answerColumn: answer,
            imageUrlColumn: image_url || "",
          }),
        );
        setRows(tableRows);
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

  const handleGenerateAI = async () => {
    if (rows.length < 3) {
      alert(
        "Please add at least three questions in this lesson before generating with AI.",
      );
      return;
    }

    setAiBusy(true);
    try {
      const classId = await getClassIdByName(params.className);
      if (!classId) {
        alert("Could not resolve class_id for this class");
        return;
      }

      const lessonId = await getLessonIdByName(
        params.className,
        params.lessonName,
      );

      if (!lessonId) {
        alert("Could not find lesson");
        return;
      }

      const payload = {
        mode: "generate",
        class_id: Number(classId),
        lesson_id: lessonId,
      };

      const backend =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
      const resp = await fetch(`${backend}/llm/transform-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const preview = await resp.text().catch(() => "");
        console.error("LLM endpoint failed", resp.status, preview);
        alert(`LLM endpoint failed ${resp.status}`);
        return;
      }

      const q = await resp.json();
      const toStr = (v: any) =>
        v == null ? "" : typeof v === "string" ? v : String(v);
      const normTopics: string[] = Array.isArray(q.topics)
        ? q.topics.map((t: any) => String(t ?? "")).filter(Boolean)
        : [];
      const normOptions: string[] = normalizeOptions(q.answer_options);
      const normAnswer = (() => {
        const a = q.answer;
        if (typeof a === "string") return a;
        if (a && typeof a.text === "string") return a.text;
        if (a && typeof a.label === "string") return a.label;
        return toStr(a);
      })();
      // const normalizeType = (t: any, opts: string[]): "multiple_choice" => {
      //   const s =
      //     typeof t === "string" ? t.toLowerCase().replace(/[-\s]+/g, "_") : "";
      //   return "multiple_choice";
      // };

      setDraftType("multiple_choice");
      setDraftPrompt(toStr(q.prompt));
      setDraftSnippet(toStr(q.snippet));
      setDraftTopicsText(normTopics.join(", "));
      setDraftOptionsText(normOptions.join(", "));
      setDraftAnswer(normAnswer);
      setDraftImageUrl(toStr(q.image_url));
      setPreviewOpen(true);
    } catch (e) {
      console.error("Generate AI error:", e);
      alert("Failed to generate a question.");
    } finally {
      setAiBusy(false);
    }
  };

  const handleSaveGenerated = async () => {
    try {
      const tRaw = (draftType || "")
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");

      const typeMap: Record<string, "multiple_choice"> = {
        multiple_choice: "multiple_choice",
        mcq: "multiple_choice",
        mc: "multiple_choice",
        multiplechoice: "multiple_choice",
        choice: "multiple_choice",
        // short_answer: "short_answer",
        // shortanswer: "short_answer",
        // short: "short_answer",
        // rearrange: "rearrange",
        // reorder: "rearrange",
        // ordering: "rearrange",
      };

      const normalizedType =
        typeMap[tRaw] ||
        (tRaw.includes("multiple") || tRaw.includes("choice")
          ? "multiple_choice"
          : tRaw.includes("short")
            ? "short_answer"
            : tRaw.includes("rearrange")
              ? "rearrange"
              : null);

      if (!normalizedType) {
        alert("Unsupported question type.");
        return;
      }

      const topics = draftTopicsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      let answer_options: string[] = [];
      if (normalizedType === "multiple_choice") {
        answer_options = draftOptionsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (answer_options.length < 2) {
          alert("Multiple Choice requires at least two options.");
          return;
        }
      }

      const serverQuestionType =
        normalizedType === "multiple_choice"
          ? "multiple-choice"
          : normalizedType;

      const answerOptions =
        serverQuestionType === "multiple-choice"
          ? draftOptionsText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((txt, i) => ({ [`option${i + 1}`]: txt }))
          : [];

      const payload = {
        questionType: serverQuestionType,
        prompt: draftPrompt.trim(),
        snippet: draftSnippet.trim() || "",
        topics,
        answerOptions,
        answer: draftAnswer.trim() || "",
        image_url: draftImageUrl.trim() || null,
        is_ai_generated: true,
      };

      // console.log(
      //   "[UI] createNewQuestion payload.image_url =>",
      //   payload.image_url,
      //   payload
      // );

      const res = await createNewQuestion(
        params.lessonName,
        params.className,
        payload,
      );
      if (!res?.success) {
        alert("Failed to save question.");
        return;
      }

      const lessonQuestions = await getLessonQuestions(
        params.className,
        params.lessonName,
      );
      const tableRows = lessonQuestions.map(
        ({
          question_id,
          question_type,
          prompt,
          snippet,
          topics,
          answer_options,
          answer,
          image_url,
        }) => ({
          id: question_id,
          promptColumn: prompt,
          questionTypeColumn: question_type,
          snippetColumn: snippet,
          unitsCoveredColumn: topics?.join(", ") || "",
          optionsColumn: Array.isArray(answer_options)
            ? answer_options.join(", ")
            : "",
          answerColumn: answer,
          // imageUrlColumn: image_url || '',
        }),
      );
      setRows(tableRows);
      setPreviewOpen(false);
    } catch (e) {
      console.error("Error saving question:", e);
      alert("Error saving question.");
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
    const row = rows?.find((row) => row.id === id);
    if (!row) return;

    const {
      id: rowId,
      promptColumn,
      questionTypeColumn,
      snippetColumn,
      unitsCoveredColumn,
      optionsColumn,
      answerColumn,
      imageUrlColumn,
    } = row;

    setQuestionID(rowId);
    setQuestionType(questionTypeColumn);
    setQuestionPrompt(promptColumn);
    setQuestionSnippet(snippetColumn);
    setCorrectAnswer(answerColumn);

    setQuestionOptions(
      optionsColumn
        ? optionsColumn
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    );

    setTopicsCovered(
      unitsCoveredColumn
        ? unitsCoveredColumn.split(",").map((s) => s.trim())
        : [],
    );

    setImageUrl(imageUrlColumn || "");

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
      const lessonQuestions = await getLessonQuestions(
        params.className,
        params.lessonName,
      );
      const tableRows = lessonQuestions.map(
        ({
          question_id,
          question_type,
          prompt,
          snippet,
          topics,
          answer_options,
          answer,
          image_url,
        }) => ({
          id: question_id,
          promptColumn: prompt,
          questionTypeColumn: question_type,
          snippetColumn: snippet,
          unitsCoveredColumn: topics?.join(", ") || "",
          optionsColumn: Array.isArray(answer_options)
            ? answer_options.join(", ")
            : "",
          answerColumn: answer,
          imageUrlColumn: image_url || "",
        }),
      );
      setRows(tableRows);
      handleConfimationDialogClose();
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    const fetchLessonQuestions = async () => {
      const lessonQuestions = await getLessonQuestions(
        params.className,
        params.lessonName,
      );
      const tableRows = lessonQuestions.map(
        ({
          question_id,
          question_type,
          prompt,
          snippet,
          topics,
          answer_options,
          answer,
          image_url,
        }) => ({
          id: question_id,
          promptColumn: prompt,
          questionTypeColumn: question_type,
          snippetColumn: snippet,
          unitsCoveredColumn: topics?.join(", ") || "",
          optionsColumn: Array.isArray(answer_options)
            ? answer_options.join(", ")
            : "",
          answerColumn: answer,
          imageUrlColumn: image_url || "",
        }),
      );
      setRows(tableRows);
      setDataLoading(false);
    };
    fetchLessonQuestions();
  }, [
    params.className,
    params.lessonName,
    setDataLoading,
    setOpen,
    refreshGrid,
  ]);

  const columns: GridColDef[] = [
    {
      field: "promptColumn",
      headerName: "Question",
      width: 250,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "questionTypeColumn",
      headerName: "Question Type",
      width: 180,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "snippetColumn",
      headerName: "Snippet",
      width: 180,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "unitsCoveredColumn",
      headerName: "Topics Covered",
      width: 180,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "optionsColumn",
      headerName: "Options",
      width: 250,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "answerColumn",
      headerName: "Answer",
      width: 220,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "imageUrlColumn",
      headerName: "Image",
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const url = String(params.value || "").trim();
        if (!url) return null;
        return (
          <img
            src={url}
            alt="question"
            style={{
              maxHeight: 64,
              maxWidth: 112,
              objectFit: "contain",
              borderRadius: 4,
            }}
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = "none";
            }}
          />
        );
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      align: "center",
      headerAlign: "center",
      width: 100,
      cellClassName: "actions",
      getActions: ({ id }) => [
        <GridActionsCellItem
          key={id}
          icon={<EditIcon />}
          label="Edit"
          onClick={handleEditClick(id as number)}
          color="inherit"
          sx={{ ":hover": { color: "#1B94F7" } }}
        />,
        <GridActionsCellItem
          key={id}
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleConfimationDialogOpen(id as number)}
          color="inherit"
          sx={{ ":hover": { color: "red" } }}
        />,
      ],
    },
  ];

  return (
    <Box
      sx={{
        height: "calc(100vh - 64px)",
        width: "100%",
        "& .actions": { color: "text.secondary" },
        "& .textPrimary": { color: "text.primary" },
      }}
    >
      {dataLoading ? (
        <DataGridSkeleton columns={columns} />
      ) : (
        <>
          {/* Generate button */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mb: 1,
              pr: 2,
              gap: 2,
            }}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setImportDialogOpen(true)}
            >
              Import Questions
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateAI}
              disabled={aiBusy}
            >
              {aiBusy ? "Generating…" : "Generate Question with AI"}
            </Button>
          </Box>

          <DataGrid
            rows={rows}
            columns={columns}
            disableColumnSelector
            slots={{ toolbar: GridToolbar }}
            slotProps={{ toolbar: { showQuickFilter: true } }}
          />

          {/* AI Preview Dialog */}
          <Dialog
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            fullWidth
            maxWidth="md"
          >
            <DialogTitle>AI Generated Question (Preview)</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <FormControl fullWidth>
                  <InputLabel id="draft-type-label">Question Type</InputLabel>
                  <Select
                    labelId="draft-type-label"
                    label="Question Type"
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value as any)}
                  >
                    <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                    {/* <MenuItem value="short_answer">Short Answer</MenuItem> */}
                    {/* <MenuItem value="rearrange">Rearrange</MenuItem> */}
                  </Select>
                </FormControl>

                <TextField
                  label="Prompt"
                  value={draftPrompt}
                  onChange={(e) => setDraftPrompt(e.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <TextField
                  label="Snippet (optional)"
                  value={draftSnippet}
                  onChange={(e) => setDraftSnippet(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />
                <TextField
                  label="Topics (comma-separated)"
                  value={draftTopicsText}
                  onChange={(e) => setDraftTopicsText(e.target.value)}
                  fullWidth
                />
                {draftType === "multiple_choice" && (
                  <Box>
                    {(() => {
                      const options = draftOptionsText
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (options.length === 0) options.push("", "", "", "");
                      return options.map((opt, idx) => (
                        <TextField
                          key={idx}
                          label={`Answer Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...options];
                            newOpts[idx] = e.target.value;
                            setDraftOptionsText(newOpts.join(", "));
                          }}
                          fullWidth
                          sx={{ mb: 1.5 }}
                        />
                      ));
                    })()}
                    <Button
                      size="small"
                      onClick={() =>
                        setDraftOptionsText(draftOptionsText + ", ")
                      }
                      sx={{ mt: 0.5 }}
                    >
                      + Add Option
                    </Button>
                  </Box>
                )}

                <TextField
                  label="Correct Answer"
                  value={draftAnswer}
                  onChange={(e) => setDraftAnswer(e.target.value)}
                  fullWidth
                />

                {/* Image URL field + inline preview */}
                <TextField
                  label="Image URL (optional)"
                  value={draftImageUrl}
                  onChange={(e) => setDraftImageUrl(e.target.value)}
                  fullWidth
                />
                {draftImageUrl?.trim() ? (
                  <Box
                    sx={{ mt: 1, display: "flex", justifyContent: "center" }}
                  >
                    <img
                      src={draftImageUrl}
                      alt="preview"
                      style={{
                        maxHeight: 160,
                        maxWidth: "100%",
                        objectFit: "contain",
                        borderRadius: 4,
                      }}
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = "none";
                      }}
                    />
                  </Box>
                ) : null}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleSaveGenerated}>
                Save to Lesson
              </Button>
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
