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
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormHelperText,
  Alert,
} from "@mui/material";
import { GraphTopic } from "@/types/content.types";
import {
  createNewLesson,
  updateLesson,
  getLessonTopics,
} from "@/app/classes/[className]/lessons/actions";
import { Lesson } from "@/types/content.types";
import TopicPicker from "@/components/questions/topic-picker";

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
  const [lessonTopics, setLessonTopics] = useState<GraphTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLessonTopics, setSelectedLessonTopics] = useState<string[]>(
    [],
  );
  const [buttonOperation, setButtonOperation] = useState<
    "Add Lesson" | "Update Lesson"
  >("Add Lesson");

  const [nameError, setNameError] = useState<string>("");
  const [topicError, setTopicError] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");
  const [publishLesson, setPublishLesson] = useState(false);

  const handleLessonDiaglogClose = () => {
    setOpen(false);
    setNewLessonName("");
    setSelectedLessonTopics([]);
    setButtonOperation("Add Lesson");
    resetPrevLessonData(null);
    setNameError("");
    setTopicError("");
    setSaveError("");
    setPublishLesson(false);
  };

  const handleLessonNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const sanitized = value.replace(/[^a-zA-Z0-9\s()]/g, "");
    setNewLessonName(sanitized);
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setSaveError("");

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

    const cleanedTopicNodeIds = Array.from(
      new Set(
        (selectedLessonTopics || [])
          .map((t) => String(t).trim())
          .filter(Boolean),
      ),
    );

    if (cleanedTopicNodeIds.length === 0) {
      setTopicError("Select at least one topic");
      return;
    }

    setIsSaving(true);
    try {
      const addingLesson = buttonOperation === "Add Lesson";
      const response = addingLesson
        ? await createNewLesson(className, {
            lessonName: cleanedLessonName,
            topicNodeIds: cleanedTopicNodeIds,
            isPublished: publishLesson,
          })
        : await updateLesson(className, lessonID, {
            lessonName: cleanedLessonName,
            topicNodeIds: cleanedTopicNodeIds,
            isPublished: publishLesson,
          });

      if (response?.success) {
        handleLessonDiaglogClose();
        setRefreshGrid((prev) => prev + 1);
        return;
      }
      setSaveError(
        `Unable to ${addingLesson ? "add" : "update"} the lesson. Please try again.`,
      );
    } catch (error) {
      console.error("Unable to save lesson:", error);
      setSaveError("Unable to save the lesson. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // prepopulating the form with previous lesson data if in edit mode
    if (prevLessonData) {
      const { lesson_id, name, is_published } = prevLessonData;
      setLessonID(lesson_id ?? -1);
      setNewLessonName(name ?? "");
      setPublishLesson(Boolean(is_published));
      setButtonOperation("Update Lesson");
    }
  }, [prevLessonData]);

  useEffect(() => {
    if (!prevLessonData || !lessonTopics.length) return;

    if (prevLessonData.topic_node_ids?.length) {
      setSelectedLessonTopics(prevLessonData.topic_node_ids);
      return;
    }

    const legacyLabels = new Set(
      (prevLessonData.topics ?? []).map((label) => label.trim().toLowerCase()),
    );
    setSelectedLessonTopics(
      lessonTopics
        .filter((topic) => legacyLabels.has(topic.label.toLowerCase()))
        .map((topic) => topic.id),
    );
  }, [lessonTopics, prevLessonData]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setTopicsLoading(true);
      try {
        const response = await getLessonTopics(className);
        if (response.success) {
          setLessonTopics(response.topics ?? []);
        } else {
          setLessonTopics([]);
        }
      } finally {
        setTopicsLoading(false);
      }
    })();
  }, [open, className]);

  return (
    <Dialog
      open={open}
      PaperProps={{ component: "form", onSubmit: submitForm }}
      disableEscapeKeyDown={isSaving}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>{buttonOperation}</DialogTitle>
      <DialogContent dividers>
        <Box
          id="add-new-lesson-form"
          sx={{
            display: "flex",
            flexDirection: "column",
            padding: 2,
            gap: 2,
          }}
        >
          {saveError && <Alert severity="error">{saveError}</Alert>}
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
          <Box>
            <TopicPicker
              topics={lessonTopics}
              value={selectedLessonTopics}
              onChange={(nodeIds) => {
                setSelectedLessonTopics(nodeIds);
                setTopicError("");
              }}
              label="Lesson topics"
              disabled={isSaving}
              loading={topicsLoading}
              columns={3}
            />
            {topicError && <FormHelperText error>{topicError}</FormHelperText>}
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={publishLesson}
                onChange={(e) => setPublishLesson(e.target.checked)}
              />
            }
            label="Publish now"
          />
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
          variant="contained"
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
