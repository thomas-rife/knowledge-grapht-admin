"use client";

import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  Container,
  Snackbar,
  Alert,
} from "@mui/material";
import { useState } from "react";
import { Lesson } from "@/types/content.types";
import { AddCircleOutline } from "@mui/icons-material";
import AddLessonDialog from "@/app/classes/[className]/lessons/add-lesson-dialog";
import LessonDataGrid from "@/app/classes/[className]/lessons/lesson-data-grid";
import ClassConentHeaderSkeleton from "@/components/skeletons/class-content-header-skeleton";
import { createClient } from "@/utils/supabase/client";

const Lessons = ({ params }: { params: { className: string } }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [refreshGrid, setRefreshGrid] = useState<number>(1);
  const [prevLessonData, setPrevLessonData] = useState<Lesson | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  const [guardToast, setGuardToast] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: "",
  });

  const canCreateLesson = async (): Promise<boolean> => {
    try {
      const supabase = createClient();
      const cleanedClassName = decodeURIComponent(params.className ?? "")
        .replace(/-/g, " ")
        .trim();

      // Resolve class_id
      const { data: cls } = (await supabase
        .from("classes")
        .select("class_id")
        .ilike("name", cleanedClassName)
        .maybeSingle()) as { data: { class_id: number } | null; error: any };
      const classId = cls?.class_id;
      if (!classId) return true; // fail-open if not found

      // Read class graph
      const { data: kg } = (await supabase
        .from("class_knowledge_graph")
        .select("nodes, react_flow_data")
        .eq("class_id", classId)
        .maybeSingle()) as {
        data: {
          nodes: string[] | null;
          react_flow_data: any[] | null;
        } | null;
        error: any;
      };

      const PLACEHOLDER = "Edit me!";

      // Source A: simple nodes array
      const nodesArray: string[] = Array.isArray(kg?.nodes)
        ? (kg!.nodes as any[])
            .map((v) => String(v ?? "").trim())
            .filter(Boolean)
        : [];
      if (nodesArray.length === 1 && nodesArray[0] === PLACEHOLDER)
        return false;

      // Source B: react_flow_data[0].reactFlowNodes[*].data.label
      const flowArr = Array.isArray(kg?.react_flow_data)
        ? (kg!.react_flow_data as any[])
        : [];
      const flow = flowArr[0] ?? null;
      const flowNodes: any[] = flow?.reactFlowNodes ?? [];
      const labels: string[] = (Array.isArray(flowNodes) ? flowNodes : [])
        .map((n) => String(n?.data?.label ?? "").trim())
        .filter(Boolean);
      if (labels.length === 1 && labels[0] === PLACEHOLDER) return false;

      return true;
    } catch (e) {
      console.warn("[canCreateLesson] guard failed open:", e);
      return true;
    }
  };

  const handleLessonDialogOpen = async () => {
    const ok = await canCreateLesson();
    if (!ok) {
      setGuardToast({
        open: true,
        message:
          "Edit your class graph first — rename or add topics before creating a lesson.",
      });
      return;
    }
    setOpen(true);
  };

  return (
    <Container
      maxWidth="xl"
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: 2,
        paddingBottom: 2,
      }}
    >
      {dataLoading ? (
        <ClassConentHeaderSkeleton />
      ) : (
        <>
          <Box
            sx={{
              padding: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="h4">
              <strong>{params.className.replace(/%20/g, " ")}</strong>
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography variant="h5">Lessons</Typography>
              <Tooltip arrow title="Create New Lesson">
                <IconButton
                  onClick={async () => {
                    await handleLessonDialogOpen();
                  }}
                >
                  {" "}
                  <AddCircleOutline />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <AddLessonDialog
          className={params.className}
          open={open}
          setOpen={setOpen}
          setRefreshGrid={setRefreshGrid}
          prevLessonData={prevLessonData}
          resetPrevLessonData={setPrevLessonData}
        />
        <LessonDataGrid
          className={params.className}
          refreshGrid={refreshGrid}
          setPrevLessonData={setPrevLessonData}
          dataLoading={dataLoading}
          setDataLoading={setDataLoading}
          setOpen={setOpen}
        />
      </Box>
      <Snackbar
        open={guardToast.open}
        autoHideDuration={3000}
        onClose={() => setGuardToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setGuardToast((t) => ({ ...t, open: false }))}
          severity="warning"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {guardToast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Lessons;
