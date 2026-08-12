"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import { useState } from "react";
import {
  getAllLessons,
  importLessonToClass,
} from "@/app/classes/[className]/lessons/actions";
import { Lesson } from "@/types/content.types";

const CustomToolbar = ({
  className,
  onImported,
}: {
  className: string;
  onImported: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [userLessons, setUserLessons] = useState<Lesson[] | null>(null);
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const handleDialogOpen = async () => {
    setOpen(true);
    setError("");

    if (userLessons) return;

    setLoading(true);
    const response = await getAllLessons();
    setLoading(false);

    if (!response.success) {
      setError("Unable to load lessons available for import.");
      return;
    }

    setUserLessons(response.lessons ?? []);
  };

  const handleDialogClose = () => {
    if (importing) return;
    setOpen(false);
    setError("");
  };

  const toggleLesson = (lessonId: number) => {
    setSelectedLessonIds((current) => {
      const next = new Set(current);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const handleImportLessons = async () => {
    if (!selectedLessonIds.size) {
      setError("Select at least one lesson to import.");
      return;
    }

    setImporting(true);
    setError("");
    const response = await importLessonToClass(
      className,
      Array.from(selectedLessonIds),
    );
    setImporting(false);

    if (!response?.success) {
      setError(
        typeof response?.error === "string"
          ? response.error
          : "Unable to import the selected lessons.",
      );
      return;
    }

    setSelectedLessonIds(new Set());
    setUserLessons(null);
    setOpen(false);
    onImported();
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileDownloadOutlined />}
        onClick={handleDialogOpen}
      >
        Import lessons
      </Button>

      <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Import lessons</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress size={28} />
            </Box>
          ) : error ? null : userLessons?.length ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {userLessons.map((lesson) => {
                const lessonId = lesson.lesson_id;
                if (lessonId === undefined) return null;

                return (
                  <FormControlLabel
                    key={lessonId}
                    control={
                      <Checkbox
                        checked={selectedLessonIds.has(lessonId)}
                        onChange={() => toggleLesson(lessonId)}
                      />
                    }
                    label={
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="body1">{lesson.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {lesson.topics.join(", ")}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", m: 0 }}
                  />
                );
              })}
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ py: 3 }}>
              No lessons are available to import.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleImportLessons}
            disabled={importing || loading || !userLessons?.length}
          >
            {importing ? "Importing..." : "Import selected"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CustomToolbar;
