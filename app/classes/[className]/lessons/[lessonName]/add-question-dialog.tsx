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
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { type Dispatch, type SetStateAction, useState, useEffect } from "react";
import MultipleChoiceQuestion from "@/components/question-types/multiple-choice";
import { getDuplicateAnswerOptionIndexes } from "@/components/questions/question-editor";
import { useQuestionContext } from "@/contexts/question-context";
import { useParams } from "next/navigation";

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
  } = useQuestionContext();
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
    if (!questionID) {
      setQuestionType("multiple-choice");
    }
  }, [open, questionID, setQuestionType]);

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

  const normalizedOptions = questionOptions.map((option) => {
    if (typeof option === "string") return option;
    if (option && typeof option === "object") {
      return String(Object.values(option)[0] ?? "");
    }
    return "";
  });
  const hasDuplicateAnswers =
    questionType === "multiple-choice" &&
    getDuplicateAnswerOptionIndexes(normalizedOptions).size > 0;

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
        {questionType === "multiple-choice" && (
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
          disabled={isSaving || hasDuplicateAnswers}
          startIcon={isSaving ? <CircularProgress size={18} /> : null}
        >
          {isSaving ? "Saving..." : buttonOperation}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddQuestionDialog;
