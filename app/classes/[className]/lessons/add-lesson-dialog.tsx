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
  FormControlLabel,
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
  const [selectedLessonTopics, setSelectedLessonTopics] = useState<string[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [buttonOperation, setButtonOperation] = useState<
    "Add Lesson" | "Update Lesson"
  >("Add Lesson");

  const [nameError, setNameError] = useState<string>("");
  const [publishLesson, setPublishLesson] = useState(false);

  const handleLessonDiaglogClose = () => {
    setOpen(false);
    setNewLessonName("");
    setSelectedLessonTopics([]);
    setButtonOperation("Add Lesson");
    resetPrevLessonData(null);
    setNameError("");
  };

  const handleLessonTopicChange = (
    e: SelectChangeEvent<typeof selectedLessonTopics>,
  ) => {
    setSelectedLessonTopics(
      typeof e.target.value === "string"
        ? e.target.value.split(",")
        : e.target.value,
    );
  };

  const handleLessonNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitized = value.replace(/[^a-zA-Z0-9\s()]/g, "");
    setNewLessonName(sanitized);
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    // Validate before submitting
    const cleanedLessonName = newLessonName.replace(/[:]/g, "-").trim();

    if (!cleanedLessonName) {
      setNameError("Lesson name is required");
      return;
    }

    if (/[^a-zA-Z0-9\s()]/.test(cleanedLessonName)) {
      setNameError("Only letters, numbers, parentheses and spaces allowed");
      return;
    }

    const cleanedTopics = Array.from(
      new Set(
        (selectedLessonTopics || [])
          .map((t) => String(t).trim())
          .filter(Boolean),
      ),
    );

    if (cleanedTopics.length === 0) {
      alert("Select at least one topic");
      return;
    }

    setIsSaving(true);
    try {
      const addingLesson = buttonOperation === "Add Lesson";
      const response = addingLesson
        ? await createNewLesson(className, {
            lessonName: cleanedLessonName,
            topics: cleanedTopics,
            isPublished: publishLesson,
          })
        : await updateLesson(lessonID, {
            lessonName: cleanedLessonName,
            topics: cleanedTopics,
            isPublished: publishLesson,
          });

      if (response?.success) {
        handleLessonDiaglogClose();
        alert(
          addingLesson
            ? "Lesson added successfully"
            : "Lesson updated successfully",
        );
        setRefreshGrid((prev) => prev + 1);
        return;
      }
      alert(
        `Error ${addingLesson ? "adding" : "updating"} lesson${
          response?.error ? `: ${response.error}` : ""
        }`,
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

  const filteredItems = lessonTopics.filter((lessonTopics) =>
    lessonTopics.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Dialog
      open={open}
      PaperProps={{ component: "form", onSubmit: submitForm }}
      disableEscapeKeyDown={isSaving}
    >
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
            onChange={handleLessonNameChange}
            error={!!nameError}
          />
          <FormControl fullWidth>
            <InputLabel id="lesson-topics">Lesson Topics</InputLabel>
            <Select
              required
              multiple
              labelId="lesson-topics"
              value={selectedLessonTopics}
              onChange={handleLessonTopicChange}
              renderValue={(selected) => (selected as string[]).join(", ")}
            >
              {/* <TextField
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search topics..."
              /> */}

              {lessonTopics.map((topic) => (
                // {filteredTopics.map((topic) => (
                <MenuItem key={topic} value={topic}>
                  <Checkbox checked={selectedLessonTopics.includes(topic)} />
                  <ListItemText primary={topic} />
                </MenuItem>
              ))}
            </Select>

            <FormControlLabel
              control={
                <Checkbox
                  checked={publishLesson}
                  onChange={(e) => setPublishLesson(e.target.checked)}
                />
              }
              label="Publish now? (Check if you want lesson visible to students)"
            />
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
