"use client";

import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Fade,
  TextField,
  MenuItem,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { type Dispatch, type SetStateAction, useState, useEffect, useRef } from "react";
import MultipleChoiceQuestion from "@/components/question-types/multiple-choice";
import { getDuplicateAnswerOptionIndexes } from "@/components/questions/question-editor";
import { useQuestionContext } from "@/contexts/question-context";
import { useParams } from "next/navigation";
import { REARRANGE_BLANK, normalizeQuestionOptions, splitRearrangeLine, validateRearrangeQuestion } from "@/lib/questions/rearrange";

const AddQuestionDialog = ({
  lessonName,
  open,
  setOpen,
  setAlertOpen,
  setRefreshGrid,
}: {
  lessonName: string;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setAlertOpen: Dispatch<SetStateAction<boolean>>;
  setRefreshGrid: Dispatch<SetStateAction<number>>;
}) => {
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const {
    questionType,
    questionID,
    setQuestionType,
    submitQuestion,
    resetStates,
    imageUrl,
    questionOptions,
    setQuestionOptions,
    questionSnippet,
    setQuestionSnippet,
    questionPrompt,
    correctAnswer,
    setCorrectAnswer,
  } = useQuestionContext();
  const typeDrafts = useRef<Record<string, { snippet: string; options: any[]; answer: string }>>({});
  useEffect(() => { if (open) typeDrafts.current = {}; }, [open]);

  const changeQuestionType = (nextType: string) => {
    if (nextType === questionType) return;
    typeDrafts.current[questionType] = { snippet: questionSnippet, options: questionOptions, answer: correctAnswer };
    const next = typeDrafts.current[nextType] ?? {
      snippet: nextType === "rearrange" ? REARRANGE_BLANK : "",
      options: Array.from({ length: nextType === "rearrange" ? 2 : 4 }, (_, index) => ({ [`option${index + 1}`]: "" })),
      answer: "",
    };
    setQuestionType(nextType);
    setQuestionSnippet(next.snippet);
    setQuestionOptions(next.options);
    setCorrectAnswer(next.answer);
    setError("");
  };

  const [buttonOperation, setButtonOperation] = useState<
    "Add Question" | "Update Question"
  >("Add Question");

  // Read route params and normalize to match DB names
  const params = useParams() as { className?: string; lessonName?: string };
  const classParam = params?.className ?? "";
  const lessonParam = params?.lessonName ?? lessonName;
  const cleanedClassName = decodeURIComponent(classParam)
    .replace(/-/g, " ")
    .trim();
  const cleanedLessonName = decodeURIComponent(lessonParam)
    .replace(/-/g, " ")
    .trim();

  useEffect(() => {
    if (!open) return;

    // Only default when adding a new question
    if (!questionType) {
      setQuestionType("multiple-choice");
    }
  }, [open, questionID, questionType, setQuestionType]);

  const handleDialogClose = () => {
    if (isSaving) return;
    setOpen(false);
    resetStates();
    setButtonOperation("Add Question");
    setError("");
  };
  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError("");

    try {
      const payload = {
        lessonName: cleanedLessonName,
        className: cleanedClassName,
        ...(buttonOperation === "Update Question"
          ? { questionID: questionID! }
          : {}),
        image_url: imageUrl.trim() || null,
      };

      const response = await submitQuestion(payload);

      if (!response.success) {
        setError(
          typeof response.error === "string"
            ? response.error
            : response.error?.message ||
                `Failed to ${buttonOperation.toLowerCase()}. Please review your input and try again.`,
        );
        return;
      }

      setOpen(false);
      resetStates();
      setButtonOperation("Add Question");
      setRefreshGrid((prev) => prev + 1);
      setAlertOpen(true);
    } catch (submitError) {
      console.error("Unable to save question:", submitError);
      setError(
        `Failed to ${buttonOperation.toLowerCase()}. Please review your input and try again.`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setButtonOperation(questionID ? "Update Question" : "Add Question");
  }, [open, questionID]);

  const normalizedOptions = normalizeQuestionOptions(questionOptions);
  const hasDuplicateAnswers = questionType === "multiple-choice" &&
    getDuplicateAnswerOptionIndexes(normalizedOptions).size > 0;
  const legacyRearrange = questionType === "rearrange" && !splitRearrangeLine(questionSnippet);
  const rearrangeValid = questionType !== "rearrange" || validateRearrangeQuestion({
    prompt: questionPrompt, snippet: questionSnippet, answerOptions: questionOptions, answer: correctAnswer,
  }).success;

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      PaperProps={{ component: "form", onSubmit: submitForm }}
      fullWidth
      maxWidth="md"
      disableEscapeKeyDown={isSaving}
    >
      <DialogTitle>{buttonOperation}</DialogTitle>

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "stretch",
          py: 3,
        }}
        dividers
      >
        {/* Keep question-type selection hidden while rearrange authoring is in progress.
        <TextField select label="Question type" value={questionType || "multiple-choice"}
          onChange={(event) => changeQuestionType(event.target.value)} disabled={isSaving} fullWidth>
          <MenuItem value="multiple-choice">Multiple choice (MCQ)</MenuItem>
          <MenuItem value="rearrange">Rearrange</MenuItem>
        </TextField>
        */}

        {legacyRearrange ? (
          <Alert severity="info">This question uses the older multi-blank format. This editor supports a single blank; the existing question has been left unchanged.</Alert>
        ) : (questionType === "multiple-choice" || questionType === "rearrange") && (
          <MultipleChoiceQuestion disabled={isSaving} />
        )}

        <Fade in={Boolean(error)}>
          <Alert
            severity="error"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError("")}
              >
                <Close fontSize="inherit" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        </Fade>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDialogClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSaving || hasDuplicateAnswers || !rearrangeValid}
          startIcon={isSaving ? <CircularProgress size={18} /> : null}
        >
          {isSaving ? "Saving..." : buttonOperation}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddQuestionDialog;
