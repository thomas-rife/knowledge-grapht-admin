"use client";

import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Snackbar,
  Alert,
  Autocomplete,
  Skeleton,
  CircularProgress,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Checkbox,
  LinearProgress,
  Chip,
} from "@mui/material";
import { AddCircleOutline, School } from "@mui/icons-material";
import {
  getClassData,
  createNewClass,
  getCatalogCourses,
  getOrCreateCustomCatalogCourse,
  getGraphSourcesForCatalogCourse,
  getLessonsForGraphSource,
  type CatalogCourseOption,
  type GraphSourceOption,
  type GraphSourceLesson,
} from "@/app/classes/actions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppNavigation from "@/components/nav-and-sidemenu/app-navigation";
import { Slider, Stack } from "@mui/material";

type StartingPoint = "syllabus" | "copy" | "scratch";
type GraphGranularity = "simple" | "standard" | "detailed";

const CLASS_NAME_PATTERN = /^[a-zA-Z0-9\s\-_&().]+$/;
const OTHER_DEPARTMENT = "Other";
const CUSTOM_COURSE_VALUE = "custom";
const CUSTOM_COURSE_NAME_MAX_LENGTH = 160;

const formatCatalogCourseLabel = (course: CatalogCourseOption) => {
  const code = course.code.trim();
  const title = course.title.trim();
  if (code.startsWith("OTHER-")) {
    return title;
  }
  return code.localeCompare(title, undefined, { sensitivity: "base" }) === 0
    ? title
    : `${code} - ${title}`;
};

/**
 * TODO: need to create a theme provider to handle dark mode and light mode
 * instead of doing what we are doing here with the colors
 */

// array of header colors for classes - light mode colors
const LIGHT_MODE_COLORS = [
  "#1976d2", // blue (primary)
  "#2e7d32", // green
  "#d32f2f", // red
  "#7b1fa2", // purple
  "#ed6c02", // orange
  "#0288d1", // light blue
  "#5d4037", // brown
  "#6a1b9a", // deep purple
  "#00695c", // teal
  "#c2185b", // pink
];

// array of header colors for classes - dark mode colors (slightly deeper versions)
const DARK_MODE_COLORS = [
  "#0d47a1", // darker blue
  "#1b5e20", // darker green
  "#b71c1c", // darker red
  "#4a148c", // darker purple
  "#e65100", // darker orange
  "#01579b", // darker light blue
  "#3e2723", // darker brown
  "#4a148c", // darker deep purple
  "#004d40", // darker teal
  "#880e4f", // darker pink
];

// Number of skeleton cards to show during loading
const SKELETON_COUNT = 8;

const ClassesSkeleton = ({ isDarkMode }: { isDarkMode: boolean }) => {
  return (
    <Grid container spacing={3}>
      {Array.from(new Array(SKELETON_COUNT)).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <Card elevation={2} sx={{ height: "100%" }}>
            <Box
              sx={{
                height: "90px",
                backgroundColor: isDarkMode
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.08)",
              }}
            >
              <Skeleton
                variant="rectangular"
                height={90}
                width="100%"
                animation="wave"
                sx={{
                  backgroundColor: isDarkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.2)",
                }}
              />
            </Box>
            <CardContent>
              <Skeleton
                variant="text"
                height={32}
                width="80%"
                animation="wave"
                sx={{ marginBottom: 1 }}
              />
              <Skeleton
                variant="text"
                height={20}
                width="90%"
                animation="wave"
              />
              <Skeleton
                variant="text"
                height={20}
                width="70%"
                animation="wave"
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
const Classes = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [navigatingToClass, setNavigatingToClass] = useState<string | null>(
    null,
  );

  // Select the appropriate color array based on the theme mode
  const CLASS_HEADER_COLORS = isDarkMode ? DARK_MODE_COLORS : LIGHT_MODE_COLORS;

  const [classes, setClasses] = useState<(string | null)[]>([]);
  const [addClassDialogOpen, setAddClassDialogOpen] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>("");
  const [showClassNameValidation, setShowClassNameValidation] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [catalogCourses, setCatalogCourses] = useState<CatalogCourseOption[]>(
    [],
  );
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedCatalogCourseId, setSelectedCatalogCourseId] = useState<
    number | ""
  >("");
  const [customCatalogCourseName, setCustomCatalogCourseName] = useState("");
  const [usingCustomCatalogCourse, setUsingCustomCatalogCourse] =
    useState(false);
  const [showCustomCourseValidation, setShowCustomCourseValidation] =
    useState(false);
  const [savingCustomCatalogCourse, setSavingCustomCatalogCourse] =
    useState(false);
  const [startingPoint, setStartingPoint] = useState<StartingPoint>("syllabus");
  const [courseMaterial, setCourseMaterial] = useState("");
  const [graphGranularity, setGraphGranularity] =
    useState<GraphGranularity>("standard");
  const [graphSources, setGraphSources] = useState<GraphSourceOption[]>([]);
  const [graphSourcesLoading, setGraphSourcesLoading] = useState(false);
  const [selectedSourceClassId, setSelectedSourceClassId] = useState<
    number | ""
  >("");
  const [sourceLessons, setSourceLessons] = useState<GraphSourceLesson[]>([]);
  const [sourceLessonsLoading, setSourceLessonsLoading] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<number[]>([]);
  const [creatingClass, setCreatingClass] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const [classLevel, setClassLevel] = useState<number>(0);
  const LEVELS = [
    { value: 0, label: "Intro" },
    { value: 1, label: "Foundation" },
    { value: 2, label: "Intermediate" },
    { value: 3, label: "Advanced" },
  ];

  const router = useRouter();

  /**
   * Function to get a color for the class header based on the class name and theme mode
   *
   * @param className - The name of the class to hash
   * @param index - The index of the class in the classes array
   * @returns
   */
  const getClassColor = (className: string, index: number) => {
    // hash the class name to get a consistent color for each class
    const hashCode =
      className?.split("").reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0) || 0;

    const colorByHash =
      CLASS_HEADER_COLORS[Math.abs(hashCode) % CLASS_HEADER_COLORS.length];
    return colorByHash;
  };

  /**
   *  handlers
   */
  const handleOpenAddClassDialog = () => setAddClassDialogOpen(true);
  const handleCloseAddClassDialog = () => {
    if (!creatingClass && !savingCustomCatalogCourse) {
      setAddClassDialogOpen(false);
    }
  };

  const handleCancelAddClass = () => {
    if (creatingClass || savingCustomCatalogCourse) return;
    resetOnboardingDialog();
  };

  const resetOnboardingDialog = () => {
    setNewClassName("");
    setShowClassNameValidation(false);
    setOnboardingStep(0);
    setSelectedDepartment("");
    setSelectedCatalogCourseId("");
    setCustomCatalogCourseName("");
    setUsingCustomCatalogCourse(false);
    setShowCustomCourseValidation(false);
    setStartingPoint("syllabus");
    setCourseMaterial("");
    setGraphGranularity("standard");
    setSelectedSourceClassId("");
    setSourceLessons([]);
    setSelectedLessonIds([]);
    setAddClassDialogOpen(false);
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({
      show: true,
      message,
      type,
    });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, show: false });
  };

  const validateClassInfo = () => {
    setShowClassNameValidation(true);
    const trimmedName = newClassName.trim();

    if (!trimmedName) {
      showNotification("Class name cannot be empty", "error");
      return false;
    }

    if (!CLASS_NAME_PATTERN.test(trimmedName)) {
      showNotification(
        "Class name contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, ampersands, periods, and parentheses are allowed.",
        "error",
      );
      return false;
    }

    if (classes.includes(trimmedName)) {
      showNotification("Class already exists", "error");
      return false;
    }

    if (!selectedDepartment) {
      showNotification("Select a department first", "error");
      return false;
    }

    if (usingCustomCatalogCourse) {
      setShowCustomCourseValidation(true);
      const customCourseName = customCatalogCourseName
        .trim()
        .replace(/\s+/g, " ");
      if (!customCourseName) {
        showNotification("Enter the catalog course name", "error");
        return false;
      }
      if (customCourseName.length > CUSTOM_COURSE_NAME_MAX_LENGTH) {
        showNotification(
          `Keep the catalog course name under ${CUSTOM_COURSE_NAME_MAX_LENGTH} characters`,
          "error",
        );
        return false;
      }
    } else if (!selectedCatalogCourseId) {
      showNotification("Select a catalog course first", "error");
      return false;
    }

    return true;
  };

  const canAdvanceFromStartingPoint = () => {
    if (startingPoint === "syllabus" && !courseMaterial.trim()) {
      showNotification("Paste a syllabus or course outline first", "error");
      return false;
    }

    if (startingPoint === "copy" && !selectedSourceClassId) {
      showNotification("Select an existing course graph first", "error");
      return false;
    }

    return true;
  };

  const handleNextStep = async () => {
    if (onboardingStep === 0) {
      if (!validateClassInfo()) return;

      if (usingCustomCatalogCourse && !selectedCatalogCourseId) {
        setSavingCustomCatalogCourse(true);
        try {
          const result = await getOrCreateCustomCatalogCourse(
            customCatalogCourseName,
            selectedDepartment,
            classLevel,
          );
          if (!result.success) {
            showNotification(result.error, "error");
            return;
          }

          setCatalogCourses((current) => {
            if (
              current.some(
                (course) =>
                  course.catalogCourseId === result.course.catalogCourseId,
              )
            ) {
              return current;
            }
            return [...current, result.course];
          });
          setSelectedCatalogCourseId(result.course.catalogCourseId);
        } catch (error) {
          showNotification("Unable to add this course to the catalog", "error");
          return;
        } finally {
          setSavingCustomCatalogCourse(false);
        }
      }
    }
    if (onboardingStep === 1 && !canAdvanceFromStartingPoint()) return;
    setOnboardingStep((step) => Math.min(step + 1, 2));
  };

  const handleBackStep = () => {
    setOnboardingStep((step) => Math.max(step - 1, 0));
  };

  const handleToggleLesson = (lessonId: number) => {
    setSelectedLessonIds((prev) =>
      prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId],
    );
  };

  const handleCreateClass = async () => {
    if (!validateClassInfo() || !canAdvanceFromStartingPoint()) return;

    const trimmedName = newClassName.trim();

    try {
      setCreatingClass(true);
      const response = await createNewClass(trimmedName, classLevel, {
        catalogCourseId: Number(selectedCatalogCourseId),
        startingPoint,
        courseMaterial,
        graphGranularity,
        sourceClassId:
          startingPoint === "copy" ? Number(selectedSourceClassId) : null,
        selectedLessonIds:
          startingPoint === "copy" ? selectedLessonIds : undefined,
      });

      if (!response.success) {
        showNotification(
          typeof response.error === "string"
            ? response.error
            : "Error creating class",
          "error",
        );
        return;
      }

      setClasses([...classes, trimmedName]);
      showNotification(
        response.warning || "Course created. Review the graph next.",
        response.warning ? "error" : "success",
      );
      resetOnboardingDialog();
      setNavigatingToClass(trimmedName);
      router.push(`/classes/${trimmedName}/knowledge-graph`);
    } catch (error) {
      showNotification("Error creating class", "error");
    } finally {
      setCreatingClass(false);
    }
  };

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true);
      try {
        const data = await getClassData();
        setClasses(data);
      } catch (error) {
        showNotification("Error loading classes", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!addClassDialogOpen) return;

    const fetchCatalogCourses = async () => {
      setCatalogLoading(true);
      try {
        const courses = await getCatalogCourses();
        setCatalogCourses(courses);
      } catch (error) {
        showNotification("Error loading catalog courses", "error");
      } finally {
        setCatalogLoading(false);
      }
    };

    fetchCatalogCourses();
  }, [addClassDialogOpen]);

  useEffect(() => {
    if (!selectedCatalogCourseId) {
      setGraphSources([]);
      setSelectedSourceClassId("");
      return;
    }

    const fetchGraphSources = async () => {
      setGraphSourcesLoading(true);
      try {
        const sources = await getGraphSourcesForCatalogCourse(
          Number(selectedCatalogCourseId),
        );
        setGraphSources(sources);
      } catch (error) {
        showNotification("Error loading graph sources", "error");
      } finally {
        setGraphSourcesLoading(false);
      }
    };

    fetchGraphSources();
  }, [selectedCatalogCourseId]);

  useEffect(() => {
    if (!selectedSourceClassId) {
      setSourceLessons([]);
      setSelectedLessonIds([]);
      return;
    }

    const fetchSourceLessons = async () => {
      setSourceLessonsLoading(true);
      try {
        const lessons = await getLessonsForGraphSource(
          Number(selectedSourceClassId),
        );
        setSourceLessons(lessons);
        setSelectedLessonIds(lessons.map((lesson) => lesson.lessonId));
      } catch (error) {
        showNotification("Error loading source lessons", "error");
      } finally {
        setSourceLessonsLoading(false);
      }
    };

    fetchSourceLessons();
  }, [selectedSourceClassId]);

  const handleClassNavigation = (className: string) => {
    setNavigatingToClass(className);
    router.push(`/classes/${className}/lessons`);
  };

  const selectedCatalogCourse = catalogCourses.find(
    (course) => course.catalogCourseId === Number(selectedCatalogCourseId),
  );
  const selectedGraphSource = graphSources.find(
    (source) => source.classId === Number(selectedSourceClassId),
  );
  const departmentOptions = Array.from(
    new Set(
      catalogCourses.map((course) =>
        (course.department || course.code.split(" ")[0] || "Other").trim(),
      ),
    ),
  )
    .filter(
      (department) =>
        department.localeCompare(OTHER_DEPARTMENT, undefined, {
          sensitivity: "base",
        }) !== 0,
    )
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .concat(OTHER_DEPARTMENT);
  const filteredCatalogCourses = selectedDepartment
    ? catalogCourses.filter(
        (course) =>
          (course.department || course.code.split(" ")[0] || "Other").trim() ===
          selectedDepartment,
      )
    : [];
  const customCatalogCourseOptions = catalogCourses.filter(
    (course) =>
      course.code.startsWith("OTHER-") &&
      (course.department ?? "").localeCompare(selectedDepartment, undefined, {
        sensitivity: "base",
      }) === 0,
  );
  const onboardingSteps = ["Course Info", "Course Creation", "Review"];

  return (
    <>
      <AppNavigation />
      {navigatingToClass && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDarkMode
              ? "rgba(0, 0, 0, 0.7)"
              : "rgba(255, 255, 255, 0.7)",
            zIndex: theme.zIndex.drawer + 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="h6" color={isDarkMode ? "white" : "inherit"}>
            Loading {navigatingToClass}...
          </Typography>
        </Box>
      )}
      <Container maxWidth="lg" sx={{ marginTop: 10, marginBottom: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold">
            My Classes
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutline />}
            onClick={handleOpenAddClassDialog}
          >
            Create New Class
          </Button>
        </Box>

        {isLoading ? (
          <ClassesSkeleton isDarkMode={isDarkMode} />
        ) : classes.length > 0 ? (
          <Grid container spacing={3}>
            {classes.map((className, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card
                  elevation={3}
                  onMouseEnter={() =>
                    router.prefetch(`/classes/${className}/lessons`)
                  }
                  sx={{
                    height: "100%",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: isDarkMode
                        ? "0 10px 20px rgba(0,0,0,0.4)"
                        : "0 10px 20px rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => handleClassNavigation(className || "")}
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: getClassColor(className || "", index),
                        color: "white",
                        width: "100%",
                        py: 3,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <School fontSize="large" />
                    </Box>
                    <CardContent
                      sx={{ flexGrow: 1, textAlign: "center", width: "100%" }}
                    >
                      <Typography
                        variant="h6"
                        component="h2"
                        fontWeight="bold"
                        gutterBottom
                      >
                        {className}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click to manage lessons, roster, and class content
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "50vh",
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.03)",
              borderRadius: 2,
              p: 3,
            }}
          >
            <School
              fontSize="large"
              color="disabled"
              sx={{ marginBottom: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No classes yet
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              marginBottom={3}
            >
              Create your first class to get started with Knowledge Grapht
            </Typography>
          </Box>
        )}
      </Container>

      <Dialog
        open={addClassDialogOpen}
        onClose={handleCloseAddClassDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Create Course</DialogTitle>
        {(creatingClass || savingCustomCatalogCourse) && <LinearProgress />}
        <DialogContent dividers>
          <Stepper activeStep={onboardingStep} sx={{ mb: 3 }}>
            {onboardingSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {onboardingStep === 0 && (
            <Stack spacing={3}>
              <FormControl
                fullWidth
                disabled={
                  catalogLoading || creatingClass || savingCustomCatalogCourse
                }
              >
                <InputLabel id="catalog-department-label">
                  Department
                </InputLabel>
                <Select
                  labelId="catalog-department-label"
                  label="Department"
                  value={selectedDepartment}
                  onChange={(event) => {
                    setSelectedDepartment(event.target.value);
                    setSelectedCatalogCourseId("");
                    setCustomCatalogCourseName("");
                    setUsingCustomCatalogCourse(false);
                    setShowCustomCourseValidation(false);
                    setSelectedSourceClassId("");
                    setSourceLessons([]);
                    setSelectedLessonIds([]);
                  }}
                >
                  {departmentOptions.map((department) => (
                    <MenuItem key={department} value={department}>
                      {department}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                disabled={
                  catalogLoading ||
                  creatingClass ||
                  savingCustomCatalogCourse ||
                  !selectedDepartment
                }
              >
                <InputLabel id="catalog-course-label">
                  Catalog Course
                </InputLabel>
                <Select
                  labelId="catalog-course-label"
                  label="Catalog Course"
                  value={
                    usingCustomCatalogCourse
                      ? CUSTOM_COURSE_VALUE
                      : selectedCatalogCourseId
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    const isCustomCourse = value === CUSTOM_COURSE_VALUE;
                    setUsingCustomCatalogCourse(isCustomCourse);
                    setSelectedCatalogCourseId(
                      isCustomCourse ? "" : Number(value),
                    );
                    setCustomCatalogCourseName("");
                    setShowCustomCourseValidation(false);
                    setSelectedSourceClassId("");
                    setSourceLessons([]);
                    setSelectedLessonIds([]);
                  }}
                >
                  {filteredCatalogCourses.map((course) => (
                    <MenuItem
                      key={course.catalogCourseId}
                      value={course.catalogCourseId}
                    >
                      {formatCatalogCourseLabel(course)}
                    </MenuItem>
                  ))}
                  <MenuItem value={CUSTOM_COURSE_VALUE}>
                    Course not listed
                  </MenuItem>
                </Select>
              </FormControl>

              {usingCustomCatalogCourse && (
                <Autocomplete
                  freeSolo
                  options={customCatalogCourseOptions.map(
                    formatCatalogCourseLabel,
                  )}
                  inputValue={customCatalogCourseName}
                  onInputChange={(_, value) => {
                    setCustomCatalogCourseName(value);
                    const matchingCourse = customCatalogCourseOptions.find(
                      (course) =>
                        formatCatalogCourseLabel(course).localeCompare(
                          value.trim(),
                          undefined,
                          { sensitivity: "base" },
                        ) === 0,
                    );
                    setSelectedCatalogCourseId(
                      matchingCourse?.catalogCourseId ?? "",
                    );
                    setShowCustomCourseValidation(true);
                  }}
                  onChange={(_, value) => {
                    const courseName = String(value ?? "");
                    setCustomCatalogCourseName(courseName);
                    const matchingCourse = customCatalogCourseOptions.find(
                      (course) =>
                        formatCatalogCourseLabel(course).localeCompare(
                          courseName,
                          undefined,
                          { sensitivity: "base" },
                        ) === 0,
                    );
                    setSelectedCatalogCourseId(
                      matchingCourse?.catalogCourseId ?? "",
                    );
                  }}
                  disabled={creatingClass || savingCustomCatalogCourse}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      id="custom-catalog-course-name"
                      label="Catalog Course Name"
                      placeholder="For example: CMSI 5998 - Generative AI and Algorithms"
                      fullWidth
                      required
                      inputProps={{
                        ...params.inputProps,
                        maxLength: CUSTOM_COURSE_NAME_MAX_LENGTH,
                      }}
                      error={
                        showCustomCourseValidation &&
                        !customCatalogCourseName.trim()
                      }
                      helperText={
                        showCustomCourseValidation &&
                        !customCatalogCourseName.trim()
                          ? "Catalog course name is required"
                          : "Enter the official course name or select one previously added for this department."
                      }
                    />
                  )}
                />
              )}

              <TextField
                id="class-name"
                label="Class Name"
                placeholder="Name your class: maybe Fall 2026 CMSI XXXX?"
                variant="outlined"
                value={newClassName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || CLASS_NAME_PATTERN.test(value)) {
                    setNewClassName(value);
                    setShowClassNameValidation(true);
                  }
                }}
                fullWidth
                autoFocus
                required
                disabled={creatingClass || savingCustomCatalogCourse}
                error={
                  showClassNameValidation &&
                  (newClassName.trim() === "" ||
                    !CLASS_NAME_PATTERN.test(newClassName))
                }
                helperText={
                  showClassNameValidation
                    ? newClassName.trim() === ""
                      ? "Class name is required"
                      : !CLASS_NAME_PATTERN.test(newClassName)
                        ? "Only letters, numbers, spaces, hyphens, underscores, ampersands, periods, and parentheses are allowed"
                        : ""
                    : ""
                }
              />

              <Stack spacing={1} sx={{ px: 2, pb: 2 }}>
                <Typography variant="subtitle2">Class Level</Typography>
                <Slider
                  value={classLevel}
                  onChange={(_, v) => setClassLevel(Number(v))}
                  step={1}
                  min={0}
                  max={3}
                  marks={LEVELS}
                  valueLabelDisplay="auto"
                  disabled={creatingClass || savingCustomCatalogCourse}
                  sx={{
                    mx: 2,
                    width: "calc(100% - 32px)",
                  }}
                />
              </Stack>
            </Stack>
          )}

          {onboardingStep === 1 && (
            <Stack spacing={3}>
              <RadioGroup
                value={startingPoint}
                onChange={(event) =>
                  setStartingPoint(event.target.value as StartingPoint)
                }
              >
                <Grid container spacing={2}>
                  {[
                    {
                      value: "syllabus",
                      title: "AI-Generated Graph",
                      description:
                        "Paste a syllabus or course outline and generate a starter graph.",
                    },
                    {
                      value: "copy",
                      title: "Use an existing course",
                      description:
                        "Copy a graph from another class tagged with this catalog course.",
                    },
                    {
                      value: "scratch",
                      title: "Start from scratch",
                      description:
                        "Create a blank starter graph and build it manually.",
                    },
                  ].map((option) => (
                    <Grid item xs={12} md={4} key={option.value}>
                      <Card
                        variant={
                          startingPoint === option.value
                            ? "elevation"
                            : "outlined"
                        }
                        elevation={startingPoint === option.value ? 4 : 0}
                        sx={{
                          height: "100%",
                          borderColor:
                            startingPoint === option.value
                              ? "primary.main"
                              : "divider",
                        }}
                      >
                        <CardActionArea
                          onClick={() =>
                            setStartingPoint(option.value as StartingPoint)
                          }
                          sx={{ height: "100%", alignItems: "stretch" }}
                        >
                          <CardContent>
                            <FormControlLabel
                              value={option.value}
                              control={<Radio />}
                              label={
                                <Typography fontWeight="bold">
                                  {option.title}
                                </Typography>
                              }
                              sx={{ alignItems: "flex-start", m: 0 }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1 }}
                            >
                              {option.description}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>

              {startingPoint === "syllabus" && (
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="graph-granularity-label">
                      Graph Detail
                    </InputLabel>
                    <Select
                      labelId="graph-granularity-label"
                      label="Graph Detail"
                      value={graphGranularity}
                      onChange={(event) =>
                        setGraphGranularity(
                          event.target.value as GraphGranularity,
                        )
                      }
                    >
                      <MenuItem value="simple">Simple</MenuItem>
                      <MenuItem value="standard">Standard</MenuItem>
                      <MenuItem value="detailed">Detailed</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Syllabus or Course Outline"
                    value={courseMaterial}
                    onChange={(event) => setCourseMaterial(event.target.value)}
                    fullWidth
                    multiline
                    minRows={8}
                    placeholder="Paste the course syllabus, topics, units, or weekly outline."
                  />
                </Stack>
              )}

              {startingPoint === "copy" && (
                <Stack spacing={2}>
                  {graphSourcesLoading ? (
                    <LinearProgress />
                  ) : graphSources.length === 0 ? (
                    <Alert severity="info">
                      No readable existing graphs are tagged with this catalog
                      course yet.
                    </Alert>
                  ) : (
                    <FormControl fullWidth>
                      <InputLabel id="graph-source-label">
                        Existing Graph
                      </InputLabel>
                      <Select
                        labelId="graph-source-label"
                        label="Existing Graph"
                        value={selectedSourceClassId}
                        onChange={(event) =>
                          setSelectedSourceClassId(Number(event.target.value))
                        }
                      >
                        {graphSources.map((source) => (
                          <MenuItem key={source.classId} value={source.classId}>
                            {source.className} - {source.topicCount} topics,{" "}
                            {source.lessonCount} lessons
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {selectedSourceClassId && (
                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Typography variant="subtitle2">
                          Include Lessons
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            onClick={() =>
                              setSelectedLessonIds(
                                sourceLessons.map((lesson) => lesson.lessonId),
                              )
                            }
                          >
                            Select all
                          </Button>
                          <Button
                            size="small"
                            onClick={() => setSelectedLessonIds([])}
                          >
                            Deselect all
                          </Button>
                        </Stack>
                      </Stack>

                      {sourceLessonsLoading ? (
                        <LinearProgress />
                      ) : sourceLessons.length === 0 ? (
                        <Alert severity="info">
                          This graph has no lessons to copy.
                        </Alert>
                      ) : (
                        <Stack spacing={1}>
                          {sourceLessons.map((lesson) => (
                            <Box
                              key={lesson.lessonId}
                              sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 1,
                                p: 1.5,
                              }}
                            >
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={selectedLessonIds.includes(
                                      lesson.lessonId,
                                    )}
                                    onChange={() =>
                                      handleToggleLesson(lesson.lessonId)
                                    }
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography fontWeight="medium">
                                      {lesson.name}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {lesson.topics.length} topics,{" "}
                                      {lesson.questionCount} questions
                                    </Typography>
                                  </Box>
                                }
                              />
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  )}
                </Stack>
              )}
            </Stack>
          )}

          {onboardingStep === 2 && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Catalog Course
                </Typography>
                <Typography>
                  {selectedCatalogCourse
                    ? formatCatalogCourseLabel(selectedCatalogCourse)
                    : "None selected"}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Class
                </Typography>
                <Typography>{newClassName.trim()}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Starting Point
                </Typography>
                {startingPoint === "copy" ? (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label="Copy graph" />
                    <Chip
                      label={`${selectedLessonIds.length} lessons selected`}
                      color={selectedLessonIds.length ? "primary" : "default"}
                    />
                    {selectedGraphSource && (
                      <Chip label={selectedGraphSource.className} />
                    )}
                  </Stack>
                ) : startingPoint === "syllabus" ? (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label="Generate graph" />
                    <Chip label={`${graphGranularity} detail`} />
                  </Stack>
                ) : (
                  <Chip label="Start from scratch" sx={{ mt: 1 }} />
                )}
              </Box>
              <Alert severity="info">
                After creation, you will review the graph before adding or
                publishing course content.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCancelAddClass}
            variant="text"
            disabled={creatingClass || savingCustomCatalogCourse}
          >
            Cancel
          </Button>
          {onboardingStep > 0 && (
            <Button
              onClick={handleBackStep}
              disabled={creatingClass || savingCustomCatalogCourse}
            >
              Back
            </Button>
          )}
          {onboardingStep < 2 ? (
            <Button
              onClick={handleNextStep}
              variant="contained"
              disabled={savingCustomCatalogCourse}
            >
              {savingCustomCatalogCourse ? "Adding course..." : "Continue"}
            </Button>
          ) : (
            <Button
              onClick={handleCreateClass}
              variant="contained"
              disabled={creatingClass}
            >
              {creatingClass ? "Creating..." : "Create Course"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.show}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
      >
        <Alert severity={notification.type} onClose={handleCloseNotification}>
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Classes;
