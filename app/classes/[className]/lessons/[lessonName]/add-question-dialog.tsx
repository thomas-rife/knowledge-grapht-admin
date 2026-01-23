"use client";

import {
  type SelectChangeEvent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
  Fade,
  TextField,
  Box,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { type Dispatch, type SetStateAction, useState, useEffect } from "react";
import RearrangeQuestion from "@/components/question-types/rearrange";
import MultipleChoiceQuestion from "@/components/question-types/multiple-choice";
import { useQuestionContext } from "@/contexts/question-context";
import { useParams } from "next/navigation";

const componentMap: { [key: string]: JSX.Element } = {
  ["multiple-choice"]: <MultipleChoiceQuestion />,
  // ['rearrange']: <RearrangeQuestion />,
};

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
  const [error, setError] = useState<boolean>(false);
  const {
    questionType,
    questionID,
    setQuestionType,
    submitQuestion,
    resetStates,
    imageUrl,
    setImageUrl,
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
    setOpen(false);
    resetStates();
    setButtonOperation("Add Question");
  };

  const handleSelectQuestionType = (e: SelectChangeEvent<string>) => {
    setQuestionType(e.target.value);
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      lessonName: cleanedLessonName,
      className: cleanedClassName,
      ...(buttonOperation === "Update Question"
        ? { questionID: questionID! }
        : {}),
      image_url: imageUrl.trim() || null,
    };
    console.log(payload, payload.image_url);

    const response = await submitQuestion(payload);

    if (!response.success) {
      setError(true);
      return;
    }

    handleDialogClose();
    setRefreshGrid((prev) => prev + 1);
    setAlertOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    setButtonOperation(questionID ? "Update Question" : "Add Question");
  }, [open, questionID]);

  return (
    <Dialog
      open={open}
      PaperProps={{ component: "form", onSubmit: submitForm }}
    >
      <DialogTitle>{buttonOperation}</DialogTitle>

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          justifyContent: "space-evenly",
          alignItems: "center",
          minWidth: "400px",
        }}
      >
        {/* Optional Question Type selector */}
        {/* 
        <FormControl id="question-type">
          <InputLabel>Question Type</InputLabel>
          <Select
            required
            label="Question Type"
            variant="standard"
            sx={{ width: '15em' }}
            value={questionType}
            onChange={handleSelectQuestionType}
          >
            <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
            <MenuItem value="rearrange">Rearrange</MenuItem>
          </Select>
        </FormControl> 
        */}

        {componentMap[questionType]}

        {/* Image URL input and preview */}
        <TextField
          label="Image URL (optional)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          fullWidth
        />
        {imageUrl?.trim() ? (
          <Box sx={{ mt: 1, display: "flex", justifyContent: "center" }}>
            <img
              src={imageUrl}
              alt="preview"
              style={{
                maxHeight: 160,
                maxWidth: "100%",
                objectFit: "contain",
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
              }}
            />
          </Box>
        ) : null}

        <Fade in={error}>
          <Alert
            severity="error"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError(false)}
              >
                <Close fontSize="inherit" />
              </IconButton>
            }
          >
            Failed to {buttonOperation.toLowerCase()}. Please review your input
            and try again.
          </Alert>
        </Fade>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDialogClose}>Cancel</Button>
        <Button type="submit">{buttonOperation}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddQuestionDialog;
