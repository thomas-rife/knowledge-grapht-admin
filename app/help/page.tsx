"use client";

import {
  Alert,
  Box,
  Chip,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Radio,
  Stack,
  Typography,
} from "@mui/material";
import {
  AccountTreeOutlined,
  AnalyticsOutlined,
  ArrowForward,
  CheckCircleOutline,
  GroupOutlined,
  HelpOutline,
  MenuBookOutlined,
  QuizOutlined,
  SchoolOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import type { ReactNode } from "react";
import Navbar from "@/components/nav-and-sidemenu/navbar";

const sections = [
  { id: "getting-started", label: "Getting started" },
  { id: "course", label: "Create a course" },
  { id: "graph", label: "Knowledge graph" },
  { id: "lessons", label: "Lessons" },
  { id: "questions", label: "Questions" },
  { id: "students", label: "Students" },
  { id: "analytics", label: "Analytics" },
  { id: "troubleshooting", label: "Common issues" },
];

const GuideSection = ({
  id,
  icon,
  title,
  summary,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  summary: string;
  children: ReactNode;
}) => (
  <Box
    component="section"
    id={id}
    aria-labelledby={`${id}-title`}
    sx={{ py: 5, scrollMarginTop: 84 }}
  >
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 3 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          color: "primary.main",
          bgcolor: "action.hover",
          borderRadius: 1,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          id={`${id}-title`}
          variant="h5"
          component="h2"
          fontWeight={700}
        >
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          {summary}
        </Typography>
      </Box>
    </Box>
    {children}
  </Box>
);

const GuideStep = ({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "32px minmax(0, 1fr)",
      gap: 1.5,
      alignItems: "start",
    }}
  >
    <Box
      aria-hidden="true"
      sx={{
        width: 28,
        height: 28,
        display: "grid",
        placeItems: "center",
        borderRadius: "50%",
        bgcolor: "primary.main",
        color: "primary.contrastText",
        fontSize: 14,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {number}
    </Box>
    <Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.25 }}>
        {children}
      </Typography>
    </Box>
  </Box>
);

const WorkflowOverview = () => {
  const workflow = [
    { label: "Course", icon: <SchoolOutlined fontSize="small" /> },
    { label: "Graph", icon: <AccountTreeOutlined fontSize="small" /> },
    { label: "Lessons", icon: <MenuBookOutlined fontSize="small" /> },
    { label: "Questions", icon: <QuizOutlined fontSize="small" /> },
    { label: "Publish", icon: <CheckCircleOutline fontSize="small" /> },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Recommended setup order
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {workflow.map((item, index) => (
          <Box
            key={item.label}
            sx={{
              display: "contents",
            }}
          >
            <Box
              sx={{
                minWidth: 104,
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                px: 1.5,
                py: 1.25,
                bgcolor: "action.hover",
                borderRadius: 1,
                color: "text.primary",
              }}
            >
              {item.icon}
              <Typography variant="body2" fontWeight={700}>
                {item.label}
              </Typography>
            </Box>
            {index < workflow.length - 1 && (
              <ArrowForward color="disabled" fontSize="small" />
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

const GraphExample = () => (
  <Paper variant="outlined" sx={{ p: 2.5 }}>
    <Typography variant="subtitle2" sx={{ mb: 2 }}>
      Example prerequisite chain
    </Typography>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      {["Variables", "Conditions", "Loops"].map((label, index) => (
        <Box key={label} sx={{ display: "contents" }}>
          <Box
            sx={{
              minWidth: 120,
              px: 2,
              py: 1.5,
              textAlign: "center",
              border: 1,
              borderColor: "primary.main",
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" fontWeight={700}>
              {label}
            </Typography>
          </Box>
          {index < 2 && <ArrowForward color="primary" />}
        </Box>
      ))}
    </Box>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      An arrow points from a prerequisite toward the topic that builds on it.
    </Typography>
  </Paper>
);

const QuestionExample = () => (
  <Paper variant="outlined" sx={{ p: 2.5 }}>
    <Typography variant="subtitle2">Correct-answer control</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
      Select the radio button beside the answer students should receive credit
      for.
    </Typography>
    <Stack spacing={0.5}>
      {["A possible answer", "The correct answer", "Another answer"].map(
        (answer, index) => (
          <Box key={answer} sx={{ display: "flex", alignItems: "center" }}>
            <Radio checked={index === 1} size="small" readOnly />
            <Typography
              variant="body2"
              fontWeight={index === 1 ? 700 : 400}
              color={index === 1 ? "success.main" : "text.primary"}
            >
              {answer}
            </Typography>
          </Box>
        ),
      )}
    </Stack>
  </Paper>
);

export default function HelpPage() {
  return (
    <>
      <Navbar />
      <Box component="main" sx={{ pt: "64px", minHeight: "100vh" }}>
        <Box
          component="header"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Container maxWidth="lg" sx={{ py: 5 }}>
            <Typography variant="h3" component="h1" fontWeight={750}>
              Instructor guide
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 760, fontWeight: 400 }}
            >
              Set up a course, organize its knowledge graph, create review
              lessons, and prepare questions for students.
            </Typography>
          </Container>
        </Box>

        <Container
          maxWidth="lg"
          sx={{
            display: "grid",
            gridTemplateColumns: "220px minmax(0, 1fr)",
            gap: 5,
            py: 3,
          }}
        >
          <Box
            component="aside"
            sx={{
              position: "sticky",
              top: 88,
              alignSelf: "start",
              borderRight: 1,
              borderColor: "divider",
              pr: 2,
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ px: 1.5, fontWeight: 700 }}
            >
              On this page
            </Typography>
            <List dense component="nav" aria-label="Help topics">
              {sections.map((section) => (
                <ListItemButton
                  key={section.id}
                  component="a"
                  href={`#${section.id}`}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText primary={section.label} />
                </ListItemButton>
              ))}
            </List>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <GuideSection
              id="getting-started"
              icon={<HelpOutline />}
              title="Getting started"
              summary="Complete the course setup in this order so lessons and questions stay connected to the correct graph topics."
            >
              <WorkflowOverview />
              <Alert severity="info" sx={{ mt: 2 }}>
                Create or review the knowledge graph before building lessons.
                Lessons and questions use its topics for organization and
                analytics.
              </Alert>
            </GuideSection>
            <Divider />

            <GuideSection
              id="course"
              icon={<SchoolOutlined />}
              title="Create a course"
              summary="Start from your institution's catalog course, then choose how much existing material to reuse."
            >
              <Stack spacing={2.5}>
                <GuideStep number={1} title="Open course setup">
                  From My Classes, select Create New Class. Choose the
                  department first, then the catalog course, class name, and
                  level.
                </GuideStep>
                <GuideStep number={2} title="Choose a starting point">
                  Use AI-Generated Graph to paste a syllabus or outline, Use an
                  existing course to copy a graph associated with the same
                  catalog course, or Start from scratch for an empty graph.
                </GuideStep>
                <GuideStep number={3} title="Choose reusable lessons">
                  When copying an existing course, select only the lessons you
                  want. Their questions are copied with them and remain
                  independent of the source course.
                </GuideStep>
                <GuideStep number={4} title="Review and create">
                  Confirm the summary, create the course, and review the graph
                  before publishing content.
                </GuideStep>
              </Stack>
            </GuideSection>
            <Divider />

            <GuideSection
              id="graph"
              icon={<AccountTreeOutlined />}
              title="Work with the knowledge graph"
              summary="The graph records course topics and the prerequisite relationships between them."
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.8fr)",
                  gap: 3,
                }}
              >
                <Stack spacing={2.5}>
                  <GuideStep number={1} title="Enter edit mode">
                    Select Edit Graph before changing topics or connections.
                  </GuideStep>
                  <GuideStep number={2} title="Edit topics and relationships">
                    Select a node to edit its label, drag nodes to reposition
                    them, and drag from a node handle to create a connection.
                  </GuideStep>
                  <GuideStep number={3} title="Delete carefully">
                    Select a node or edge and press Backspace. A topic cannot be
                    deleted while a lesson or question still references it.
                  </GuideStep>
                  <GuideStep number={4} title="Save the graph">
                    Select Save your graph before leaving. Cancel restores the
                    last saved version.
                  </GuideStep>
                </Stack>
                <GraphExample />
              </Box>
            </GuideSection>
            <Divider />

            <GuideSection
              id="lessons"
              icon={<MenuBookOutlined />}
              title="Create and publish lessons"
              summary="A lesson groups questions around one or more topics from the course graph."
            >
              <Stack spacing={2.5}>
                <GuideStep number={1} title="Create or import a lesson">
                  Open Lessons and select Create lesson. Import lessons can copy
                  lessons you already own into the current course.
                </GuideStep>
                <GuideStep number={2} title="Select lesson topics">
                  Search or browse the topic list and select every graph topic
                  covered by the lesson.
                </GuideStep>
                <GuideStep number={3} title="Choose its status">
                  Enable Publish now when the lesson is ready for students.
                  Leave it disabled to save a draft.
                </GuideStep>
                <GuideStep number={4} title="Open the lesson">
                  Select the lesson card to review, add, edit, or remove its
                  questions. Use the three-dot menu to edit lesson details.
                </GuideStep>
              </Stack>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 3 }}>
                <Chip label="Draft" color="error" size="small" />
                <Typography variant="body2" color="text.secondary">
                  Not yet available to students
                </Typography>
                <Chip label="Published" color="success" size="small" sx={{ ml: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Available for student review
                </Typography>
              </Box>
            </GuideSection>
            <Divider />

            <GuideSection
              id="questions"
              icon={<QuizOutlined />}
              title="Add and review questions"
              summary="Create questions manually, import a CSV, or generate a draft with AI and review it before saving."
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.8fr)",
                  gap: 3,
                }}
              >
                <Stack spacing={2.5}>
                  <GuideStep number={1} title="Choose a creation method">
                    Add question opens the manual editor. Generate with AI uses
                    your prompt and selected graph topics. Import questions
                    accepts the CSV format shown in the import dialog.
                  </GuideStep>
                  <GuideStep number={2} title="Complete the required fields">
                    Enter the question prompt, select at least one topic, and
                    provide distinct answer options.
                  </GuideStep>
                  <GuideStep number={3} title="Mark the correct answer">
                    Select the radio button beside exactly one answer option.
                    Duplicate options are blocked.
                  </GuideStep>
                  <GuideStep number={4} title="Review saved questions">
                    Search or filter the question list. Expand a question to
                    inspect its options, snippet, or image, and use the action
                    buttons to edit or delete it.
                  </GuideStep>
                </Stack>
                <QuestionExample />
              </Box>
            </GuideSection>
            <Divider />

            <GuideSection
              id="students"
              icon={<GroupOutlined />}
              title="Invite and review students"
              summary="Generate a temporary join code in Settings, then use Roster to confirm enrollment."
            >
              <Stack spacing={2.5}>
                <GuideStep number={1} title="Generate a join code">
                  Open Settings and find Class Invitation. Select Generate Join
                  Code, then share the displayed code with students before it
                  expires.
                </GuideStep>
                <GuideStep number={2} title="Check the roster">
                  Open Roster to search enrolled students, sort the list, and
                  switch between the available roster views.
                </GuideStep>
                <GuideStep number={3} title="Inspect a student">
                  Select a student to open the individual performance view when
                  activity data is available.
                </GuideStep>
              </Stack>
            </GuideSection>
            <Divider />

            <GuideSection
              id="analytics"
              icon={<AnalyticsOutlined />}
              title="Review analytics"
              summary="Analytics become useful after students have answered published lesson questions."
            >
              <Stack spacing={2.5}>
                <GuideStep number={1} title="Open Analytics">
                  Use the class navigation to view course-level activity and
                  topic performance.
                </GuideStep>
                <GuideStep number={2} title="Interpret topic results">
                  Read topic-level results in the context of the course graph.
                  Sparse or early activity should be treated as preliminary.
                </GuideStep>
                <GuideStep number={3} title="Use the roster for detail">
                  Open an individual student from Roster when you need a closer
                  view of that student's recorded activity.
                </GuideStep>
              </Stack>
            </GuideSection>
            <Divider />

            <GuideSection
              id="troubleshooting"
              icon={<SettingsOutlined />}
              title="Common issues"
              summary="Most setup problems come from missing graph topics, draft status, or unavailable source material."
            >
              <Stack divider={<Divider flexItem />} spacing={2.5}>
                <Box>
                  <Typography fontWeight={700}>
                    An existing graph is not listed
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Only readable classes tagged with the selected catalog
                    course appear as sources. Confirm both courses use the same
                    catalog course.
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight={700}>
                    A graph topic cannot be deleted
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Remove the topic from every linked lesson and question
                    first. The deletion guard protects existing content from
                    losing its topic reference.
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight={700}>
                    Students cannot see a lesson
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Open the lesson menu and confirm it is Published rather
                    than Draft.
                  </Typography>
                </Box>
                <Box>
                  <Typography fontWeight={700}>
                    A question will not save
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Confirm that the prompt and topic selection are complete,
                    every answer option is non-empty and distinct, and one
                    option is selected as correct.
                  </Typography>
                </Box>
              </Stack>
            </GuideSection>
          </Box>
        </Container>
      </Box>
    </>
  );
}
