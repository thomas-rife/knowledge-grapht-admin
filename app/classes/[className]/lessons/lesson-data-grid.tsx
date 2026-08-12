"use client";

import {
  Backdrop,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Typography,
} from "@mui/material";
import { DeleteOutline, EditOutlined, MoreVert } from "@mui/icons-material";
import {
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Lesson } from "@/types/content.types";
import {
  deleteLesson,
  lessonDataFor,
} from "@/app/classes/[className]/lessons/actions";

const MAX_VISIBLE_TOPICS = 5;

const LessonCardsSkeleton = () => (
  <Grid container spacing={2.5}>
    {Array.from({ length: 6 }).map((_, index) => (
      <Grid item xs={12} sm={6} lg={4} key={index}>
        <Card
          variant="outlined"
          sx={{
            height: 250,
            backgroundColor: (theme) =>
              theme.palette.mode === "dark"
                ? theme.palette.grey[900]
                : theme.palette.grey[50],
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2.5,
              }}
            >
              <Skeleton width="58%" height={32} />
              <Skeleton width={62} height={28} />
            </Box>
            <Skeleton width="30%" height={20} sx={{ mb: 1 }} />
            <Skeleton width="92%" height={24} />
            <Skeleton width="76%" height={24} />
            <Skeleton width="84%" height={24} />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

const LessonDataGrid = ({
  className,
  refreshGrid,
  setPrevLessonData,
  dataLoading,
  setDataLoading,
  setOpen,
}: {
  className: string;
  refreshGrid: number;
  setPrevLessonData: Dispatch<SetStateAction<Lesson | null>>;
  dataLoading: boolean;
  setDataLoading: Dispatch<SetStateAction<boolean>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const selectedLesson = lessons.find(
    (lesson) => lesson.lesson_id === selectedLessonId,
  );

  const routeToLesson = (lesson: Lesson) => {
    setIsNavigating(true);
    router.push(`/classes/${className}/lessons/${lesson.name}`);
  };

  const handleMenuOpen = (
    event: MouseEvent<HTMLButtonElement>,
    lessonId: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedLessonId(lessonId);
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => setMenuAnchor(null);

  const handleEditLesson = () => {
    if (!selectedLesson) return;
    setPrevLessonData(selectedLesson);
    setMenuAnchor(null);
    setOpen(true);
  };

  const handleDeleteDialogOpen = () => {
    setMenuAnchor(null);
    setConfirmationDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    if (deleting) return;
    setConfirmationDialogOpen(false);
    setSelectedLessonId(null);
  };

  const handleDeleteLesson = async () => {
    if (selectedLessonId === null) return;

    setDeleting(true);
    const response = await deleteLesson(selectedLessonId);
    setDeleting(false);

    if (!response.success) {
      console.error("Error deleting lesson: ", response.error);
      return;
    }

    setLessons((current) =>
      current.filter((lesson) => lesson.lesson_id !== selectedLessonId),
    );
    setConfirmationDialogOpen(false);
    setSelectedLessonId(null);
  };

  useEffect(() => {
    let active = true;

    const fetchLessons = async () => {
      const nextLessons = await lessonDataFor(className);
      if (!active) return;
      setLessons(Array.isArray(nextLessons) ? nextLessons : []);
      setDataLoading(false);
    };

    fetchLessons();
    return () => {
      active = false;
    };
  }, [className, setDataLoading, refreshGrid]);

  if (dataLoading) return <LessonCardsSkeleton />;

  return (
    <>
      {lessons.length ? (
        <Grid container spacing={2.5} alignItems="stretch">
          {lessons.map((lesson) => {
            const lessonId = lesson.lesson_id;
            const visibleTopics = lesson.topics.slice(0, MAX_VISIBLE_TOPICS);
            const remainingTopics = Math.max(
              lesson.topics.length - visibleTopics.length,
              0,
            );

            return (
              <Grid item xs={12} sm={6} lg={4} key={lessonId ?? lesson.name}>
                <Card
                  variant="outlined"
                  onMouseEnter={() =>
                    router.prefetch(
                      `/classes/${className}/lessons/${lesson.name}`,
                    )
                  }
                  sx={{
                    height: "100%",
                    minHeight: 250,
                    position: "relative",
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? theme.palette.grey[900]
                        : theme.palette.grey[50],
                    transition:
                      "border-color 160ms ease, box-shadow 160ms ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: 2,
                    },
                  }}
                >
                  <IconButton
                    size="small"
                    aria-label={`Actions for ${lesson.name}`}
                    onClick={(event) =>
                      lessonId !== undefined && handleMenuOpen(event, lessonId)
                    }
                    sx={{ position: "absolute", top: 18, right: 18, zIndex: 2 }}
                  >
                    <MoreVert />
                  </IconButton>

                  <CardActionArea
                    onClick={() => routeToLesson(lesson)}
                    sx={{ height: "100%", alignItems: "stretch" }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) 32px",
                          columnGap: 1,
                          minHeight: 64,
                          mb: 1.5,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            component="h2"
                            sx={{
                              fontWeight: 700,
                              lineHeight: 1.35,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {lesson.name}
                          </Typography>
                          {lesson.is_published !== undefined && (
                            <Chip
                              label={
                                lesson.is_published ? "Published" : "Draft"
                              }
                              color={lesson.is_published ? "success" : "error"}
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      </Box>

                      <Typography
                        variant="overline"
                        color="text.secondary"
                        component="p"
                        sx={{ fontWeight: 700 }}
                      >
                        Topics
                      </Typography>
                      <Box component="ul" sx={{ pl: 2.5, my: 0.5 }}>
                        {visibleTopics.map((topic) => (
                          <Typography
                            component="li"
                            variant="body2"
                            key={topic}
                            sx={{ mb: 0.5, overflowWrap: "anywhere" }}
                          >
                            {topic}
                          </Typography>
                        ))}
                      </Box>
                      {remainingTopics > 0 && (
                        <Typography variant="body2" color="primary.main">
                          +{remainingTopics} more topic
                          {remainingTopics === 1 ? "" : "s"}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Box
          sx={{
            minHeight: 280,
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
          <Typography variant="h6">No lessons yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create a lesson or import existing content to get started.
          </Typography>
        </Box>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditLesson}>
          <EditOutlined fontSize="small" sx={{ mr: 1.5 }} />
          Edit lesson
        </MenuItem>
        <MenuItem onClick={handleDeleteDialogOpen} sx={{ color: "error.main" }}>
          <DeleteOutline fontSize="small" sx={{ mr: 1.5 }} />
          Delete lesson
        </MenuItem>
      </Menu>

      <Dialog open={confirmationDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>
          Delete {selectedLesson ? `"${selectedLesson.name}"` : "this lesson"}?
        </DialogTitle>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteLesson}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isNavigating}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
};

export default LessonDataGrid;
