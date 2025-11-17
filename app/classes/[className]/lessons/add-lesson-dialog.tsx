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
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Checkbox,
  ListItemText,
  CircularProgress,
  type SelectChangeEvent,
} from "@mui/material";
import {
  createNewLesson,
  updateLesson,
  getLessonTopics,
} from "@/app/classes/[className]/lessons/actions";
import { Lesson } from "@/types/content.types";

const AddLessonDialog = ({
  className,
  open,
  setOpen,
  setRefreshGrid,
  prevLessonData,
  resetPrevLessonData,
}: {
  className: string;
  open: boolean;
  setRefreshGrid: Dispatch<SetStateAction<number>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  prevLessonData: Lesson | null;
  resetPrevLessonData: Dispatch<SetStateAction<Lesson | null>>;
}) => {
  const [lessonID, setLessonID] = useState<number>(-1);
  const [newLessonName, setNewLessonName] = useState<string>("");
  const [lessonTopics, setLessonTopics] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  // TODO: make this a set of strings
  const [selectedLessonTopics, setSelectedLessonTopics] = useState<string[]>(
    []
  );
  const [buttonOperation, setButtonOperation] = useState<
    "Add Lesson" | "Update Lesson"
  >("Add Lesson");

  const handleLessonDiaglogClose = () => {
    setOpen(false);
    setNewLessonName("");
    setSelectedLessonTopics([]); // add
    setButtonOperation("Add Lesson");
    resetPrevLessonData(null);
  };

  const handleLessonTopicChange = (
    e: SelectChangeEvent<typeof selectedLessonTopics>
  ) => {
    setSelectedLessonTopics(
      typeof e.target.value === "string"
        ? e.target.value.split(",")
        : e.target.value
    );
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const cleanedLessonName = newLessonName.replace(/[:]/g, "-").trim();
      const cleanedTopics = Array.from(
        new Set(
          (selectedLessonTopics || [])
            .map((t) => String(t).trim())
            .filter(Boolean)
        )
      );
      if (!cleanedLessonName) {
        alert("Lesson name is required");
        return;
      }
      if (cleanedTopics.length === 0) {
        alert("Select at least one topic");
        return;
      }

      const addingLesson = buttonOperation === "Add Lesson";
      const response = addingLesson
        ? await createNewLesson(className, {
            lessonName: cleanedLessonName,
            topics: cleanedTopics,
          })
        : await updateLesson(lessonID, {
            lessonName: cleanedLessonName,
            topics: cleanedTopics,
          });

      if (response?.success) {
        handleLessonDiaglogClose();
        alert(
          addingLesson
            ? "Lesson added successfully"
            : "Lesson updated successfully"
        );
        setRefreshGrid((prev) => prev + 1);
        return;
      }
      alert(
        `Error ${addingLesson ? "adding" : "updating"} lesson${
          response?.error ? `: ${response.error}` : ""
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // prepopulating the form with previous lesson data if in edit mode
    if (prevLessonData) {
      const { lesson_id, name, topics } = prevLessonData;
      setLessonID(lesson_id ?? -1);
      setNewLessonName(name ?? "");
      setLessonTopics(topics ?? []);
      setSelectedLessonTopics(topics ?? []);
      setButtonOperation("Update Lesson");
    }
  }, [prevLessonData]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const response = await getLessonTopics(className);
      if (response.success) {
        setLessonTopics(response.topics ?? []);
      }
    })();
  }, [open, className]);

  useEffect(() => {
    const fetchLessonTopics = async () => {
      const response = await getLessonTopics(className);
      if (response.success) {
        const { topics } = response;
        setLessonTopics(topics ?? []);
      }
    };
    fetchLessonTopics();
  }, [className]);

  return (
    <Dialog
      open={open}
      PaperProps={{ component: "form", onSubmit: submitForm }}
      disableEscapeKeyDown={isSaving}
    >
      {" "}
      <DialogTitle>Add Lesson</DialogTitle>
      <DialogContent>
        <Box
          id="add-new-lesson-form"
          sx={{
            display: "flex",
            flexDirection: "column",
            padding: 2,
            gap: 2,
          }}
        >
          <TextField
            required
            autoFocus
            fullWidth
            id="name"
            label="Lesson Name"
            value={newLessonName}
            onChange={(e) => setNewLessonName(e.target.value)}
            // variant="standard"
          />
          <FormControl fullWidth>
            <InputLabel id="lesson-topics">Lesson Topics</InputLabel>
            <Select
              required
              multiple
              labelId="lesson-topics"
              value={selectedLessonTopics}
              onChange={handleLessonTopicChange}
              renderValue={(selected) => (selected as string[]).join(", ")} //   variant="standard"
            >
              {lessonTopics.map((topic) => (
                <MenuItem key={topic} value={topic}>
                  <Checkbox checked={selectedLessonTopics.includes(topic)} />
                  <ListItemText primary={topic} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          onClick={handleLessonDiaglogClose}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={18} /> : null}
        >
          {isSaving ? "Saving…" : buttonOperation}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddLessonDialog;
