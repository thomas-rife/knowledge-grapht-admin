"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AccountTreeOutlined,
  InsightsOutlined,
  MenuBookOutlined,
} from "@mui/icons-material";
import { Box, Button, Container, Divider, Typography } from "@mui/material";
import logoImage from "@/assets/logo_without_app_name.png";
import Navbar from "@/components/nav-and-sidemenu/navbar";

const principles = [
  {
    icon: <AccountTreeOutlined />,
    title: "Map course knowledge",
    description:
      "Instructors organize course topics as a graph of concepts and prerequisite relationships.",
  },
  {
    icon: <MenuBookOutlined />,
    title: "Connect instruction",
    description:
      "Lessons and quiz questions are tagged with graph topics so students can see which topics they need to work on.",
  },
  {
    icon: <InsightsOutlined />,
    title: "Study learning activity",
    description:
      "Recorded student activity can be reviewed at the aggregate, topic, and individual-student level.",
  },
];

export default function AboutPage() {
  const router = useRouter();

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
          <Container
            maxWidth="lg"
            sx={{
              minHeight: 360,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 180px",
              gap: 6,
              alignItems: "center",
              py: 6,
            }}
          >
            <Box>
              <Typography variant="h2" component="h1" fontWeight={750}>
                Knowledge Grapht
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  mt: 1.5,
                  maxWidth: 760,
                  fontWeight: 400,
                  lineHeight: 1.45,
                }}
              >
                An instructor interface for structuring course concepts,
                creating course lessons, and analyzing student learning activity
                through a knowledge graph.
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push("/help")}
                sx={{ mt: 3 }}
              >
                Open Instructor Guide
              </Button>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Image
                src={logoImage}
                alt="Knowledge Grapht"
                width={160}
                height={160}
                priority
                style={{ objectFit: "contain" }}
              />
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Box
            component="section"
            aria-labelledby="purpose-title"
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.75fr) minmax(0, 1.25fr)",
              gap: 7,
              pb: 6,
            }}
          >
            <Typography
              id="purpose-title"
              variant="h4"
              component="h2"
              fontWeight={700}
            >
              Purpose
            </Typography>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.55 }}>
                Knowledge Grapht supports research into how structured course
                knowledge and targeted review can help students retain the
                information they learn.
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 2, lineHeight: 1.7 }}
              >
                Instructors create a graph for their courses, tag lessons and
                questions with specific topics from that graph, publish
                lessons/quizzes, and examine student activity. The current
                system is an active research platform, so features and analysis
                methods may continue to change as they are tested.
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Box component="section" aria-labelledby="model-title" sx={{ py: 6 }}>
            <Typography
              id="model-title"
              variant="h4"
              component="h2"
              fontWeight={700}
            >
              Organization
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                mt: 4,
              }}
            >
              {principles.map((principle, index) => (
                <Box
                  key={principle.title}
                  sx={{
                    minWidth: 0,
                    px: 3,
                    borderLeft: index ? 1 : 0,
                    borderColor: "divider",
                    "&:first-of-type": { pl: 0 },
                    "&:last-of-type": { pr: 0 },
                  }}
                >
                  <Box sx={{ color: "primary.main", mb: 2 }}>
                    {principle.icon}
                  </Box>
                  <Typography variant="h6" component="h3" fontWeight={700}>
                    {principle.title}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 1, lineHeight: 1.65 }}
                  >
                    {principle.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Divider />

          <Box
            component="section"
            aria-labelledby="scope-title"
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.75fr) minmax(0, 1.25fr)",
              gap: 7,
              pt: 6,
              pb: 2,
            }}
          >
            <Typography
              id="scope-title"
              variant="h4"
              component="h2"
              fontWeight={700}
            >
              Current Scope
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
              The instructor web application currently focuses on course
              creation, knowledge-graph editing, lesson and quiz question
              authoring, student enrollment, and activity review. The
              "Instructor Guide" page documents the workflows available in this
              version of the platform.
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
