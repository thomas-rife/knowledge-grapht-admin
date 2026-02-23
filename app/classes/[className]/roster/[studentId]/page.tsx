"use client";

import React, { useEffect, useMemo, useState, useContext } from "react";
import { useParams } from "next/navigation";
import { Paper, Typography, Box, styled, Grid, Chip } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { createClient } from "@/utils/supabase/client";
import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  Background,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";

import { getKnowledgeGraphData } from "@/app/classes/[className]/knowledge-graph/actions";
import EditableNode from "@/components/custom-graph-nodes/editable-node";
import { ViewModeContext } from "@/contexts/viewmode-context";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

const StatsCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
}));

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const nodeTypes = { editableNode: EditableNode };

const formatPercentage = (decimal: number): string =>
  `${(decimal * 100).toFixed(1)}%`;

type TopicStats = {
  topic: string;
  attempts: number;
  correct: number;
  accuracy: number;
};

type DailyPoint = {
  date: string;
  attempts: number;
  correct: number;
  accuracy: number;
};

export default function StudentPerformancePage() {
  const params = useParams() as { className?: string; studentId?: string };
  const classNameSlug = useMemo(
    () =>
      decodeURIComponent(params.className ?? "")
        .replace(/-/g, " ")
        .trim(),
    [params.className],
  );
  const studentId = params.studentId ?? "";

  const { settings } = useContext(ViewModeContext);

  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [dailySeries, setDailySeries] = useState<DailyPoint[]>([]);
  const [overallAttempts, setOverallAttempts] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [topReviewTopics, setTopReviewTopics] = useState<string[]>([]);

  const [graphNodes, setGraphNodes] = useState<Node[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
  const [graphLoaded, setGraphLoaded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setGraphLoaded(false);

      if (!classNameSlug || !studentId) {
        setStudentName("");
        setTopicStats([]);
        setDailySeries([]);
        setTopReviewTopics([]);
        setOverallAttempts(0);
        setOverallAccuracy(0);
        setGraphNodes([]);
        setGraphEdges([]);
        setGraphLoaded(true);
        setLoading(false);
        return;
      }

      const supabase = createClient();

      // Resolve class_id from class name
      const { data: cls, error: clsErr } = (await supabase
        .from("classes")
        .select("class_id")
        .ilike("name", classNameSlug)
        .maybeSingle()) as { data: { class_id: number } | null; error: any };

      if (clsErr || !cls?.class_id) {
        console.error("Class lookup failed:", clsErr);
        setStudentName("");
        setTopicStats([]);
        setDailySeries([]);
        setTopReviewTopics([]);
        setOverallAttempts(0);
        setOverallAccuracy(0);
        setGraphNodes([]);
        setGraphEdges([]);
        setGraphLoaded(true);
        setLoading(false);
        return;
      }

      const classId = cls.class_id as number;

      try {
        const { data: enrRow, error: enrErr } = await supabase
          .from("enrollments")
          .select("student_id, students(display_name)")
          .eq("class_id", classId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (enrErr) {
          console.error("Enrollment/student lookup failed:", enrErr);
          setStudentName("");
        } else {
          const studentsVal = (enrRow as any)?.students;
          const displayName = Array.isArray(studentsVal)
            ? studentsVal?.[0]?.display_name
            : studentsVal?.display_name;
          setStudentName(String(displayName ?? ""));
        }
      } catch (e) {
        console.error("Enrollment/student lookup threw:", e);
        setStudentName("");
      }

      // Per-student answer rows
      const {
        data: answers,
        error: aErr,
        count: answersCount,
      } = await supabase
        .from("student_question_answers")
        .select("lesson_id, question_id, is_correct, answered_at", {
          count: "exact",
        })
        .eq("class_id", classId)
        .eq("student_id", studentId);

      if (aErr) console.error("Answers fetch failed:", aErr);

      const ansRows = (answers ?? []) as Array<{
        lesson_id: number | null;
        question_id: number;
        is_correct: boolean | null;
        answered_at: string | null;
      }>;

      const attempts =
        typeof answersCount === "number"
          ? answersCount
          : (ansRows?.length ?? 0);
      setOverallAttempts(attempts);

      // Build question_id -> topics lookup for this class
      const qidToTopics = new Map<number, string[]>();
      const topicsSet = new Set<string>();

      try {
        const { data: clb } = (await supabase
          .from("class_lesson_bank")
          .select("lesson_id")
          .eq("class_id", classId)) as {
          data: { lesson_id: number }[] | null;
          error: any;
        };

        const lessonIds = (clb ?? []).map((l) => l.lesson_id);

        if (lessonIds.length) {
          const { data: lqb } = (await supabase
            .from("lesson_question_bank")
            .select("question_id")
            .in("lesson_id", lessonIds)) as {
            data: { question_id: number }[] | null;
            error: any;
          };

          const qids = (lqb ?? []).map((r) => r.question_id);

          if (qids.length) {
            const { data: qs, error: qsErr } = await supabase
              .from("questions")
              .select("question_id, topics")
              .in("question_id", qids);

            if (qsErr) console.error("Questions fetch failed:", qsErr);

            (qs ?? []).forEach((q) => {
              const row = q as any;
              const qid = Number(row.question_id);
              const t = Array.isArray(row.topics) ? row.topics : [];
              const cleaned = t
                .map((tt: any) => String(tt ?? "").trim())
                .filter((s: string) => s.length > 0);
              if (qid && cleaned.length) qidToTopics.set(qid, cleaned);
              cleaned.forEach((s: string) => topicsSet.add(s));
            });
          }
        }
      } catch (e) {
        console.error("Topics aggregation failed:", e);
      }

      // Per-topic aggregation (for this student only)
      const perTopic = new Map<string, { attempts: number; correct: number }>();
      for (const ans of ansRows) {
        const qTopics = qidToTopics.get(Number(ans.question_id)) || [];
        for (const t of qTopics) {
          const cur = perTopic.get(t) || { attempts: 0, correct: 0 };
          cur.attempts += 1;
          if (ans.is_correct) cur.correct += 1;
          perTopic.set(t, cur);
        }
      }

      const topicList = Array.from(topicsSet.values()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      );

      const topicArr: TopicStats[] = topicList.map((topic) => {
        const agg = perTopic.get(topic) || { attempts: 0, correct: 0 };
        const accuracy = agg.attempts ? agg.correct / agg.attempts : 0;
        return {
          topic,
          attempts: agg.attempts,
          correct: agg.correct,
          accuracy,
        };
      });

      setTopicStats(topicArr);

      // Suggested review topics (per student)
      const worstFive = topicArr
        .filter((t) => t.attempts >= 3)
        .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
        .slice(0, 5)
        .map((t) => t.topic);

      const fallbackWorst = topicArr
        .filter((t) => t.attempts > 0)
        .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
        .slice(0, 5)
        .map((t) => t.topic);

      setTopReviewTopics(worstFive.length ? worstFive : fallbackWorst);

      // Overall accuracy from leitner_schedule (per student)
      let totalAttemptsFromSchedule = 0;
      let totalCorrectFromSchedule = 0;

      try {
        const { data: sched, error: schedErr } = await supabase
          .from("leitner_schedule")
          .select("total_attempts, total_correct")
          .eq("class_id", classId)
          .eq("student_id", studentId);

        if (schedErr) throw schedErr;

        for (const row of sched ?? []) {
          totalAttemptsFromSchedule +=
            Number((row as any).total_attempts ?? 0) || 0;
          totalCorrectFromSchedule +=
            Number((row as any).total_correct ?? 0) || 0;
        }
      } catch (e) {
        console.error("Schedule aggregation failed (fallback to answers):", e);
      }

      if (totalAttemptsFromSchedule > 0) {
        setOverallAccuracy(
          totalCorrectFromSchedule / totalAttemptsFromSchedule,
        );
      } else {
        const correctFromRows = ansRows.reduce(
          (acc, r) => acc + (r.is_correct ? 1 : 0),
          0,
        );
        setOverallAccuracy(attempts ? correctFromRows / attempts : 0);
      }

      // Daily time series (per student)
      const dayAgg = new Map<string, { attempts: number; correct: number }>();
      ansRows.forEach((r) => {
        const d = r.answered_at ? new Date(r.answered_at) : new Date(NaN);
        const key = isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
        if (!key) return;
        if (!dayAgg.has(key)) dayAgg.set(key, { attempts: 0, correct: 0 });
        const curr = dayAgg.get(key)!;
        curr.attempts += 1;
        if (r.is_correct) curr.correct += 1;
      });

      const days = Array.from(dayAgg.entries())
        .map(([date, v]) => ({
          date,
          attempts: v.attempts,
          correct: v.correct,
          accuracy: v.attempts ? v.correct / v.attempts : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailySeries(days.slice(-30));

      // Graph merge: map topic accuracy to node labels
      try {
        const graphResp = (await getKnowledgeGraphData(classNameSlug)) as any;

        if (graphResp?.success && graphResp?.graphData?.react_flow_data?.[0]) {
          const flowData = graphResp.graphData.react_flow_data[0] as any;
          const rfNodes = Array.isArray(flowData?.reactFlowNodes)
            ? flowData.reactFlowNodes
            : [];
          const rfEdges = Array.isArray(flowData?.reactFlowEdges)
            ? flowData.reactFlowEdges
            : [];

          const accMap = new Map(
            topicArr.map((t) => [t.topic, t.accuracy] as const),
          );
          const attemptsMap = new Map(
            topicArr.map((t) => [t.topic, t.attempts] as const),
          );

          const mergedNodes: Node[] = rfNodes.map((n: any) => {
            const label = String(n?.data?.label ?? "");
            const accuracy = accMap.has(label) ? accMap.get(label) : null;
            const attemptsForLabel = attemptsMap.get(label) ?? 0;

            return {
              ...n,
              type: "editableNode",
              data: {
                ...(n?.data ?? {}),
                label,
                accuracy,
                readOnly: true,
                attempts: attemptsForLabel,
              },
            };
          });

          setGraphNodes(mergedNodes);
          setGraphEdges(rfEdges);
        } else {
          setGraphNodes([]);
          setGraphEdges([]);
        }
      } catch (e) {
        console.error("Graph fetch failed:", e);
        setGraphNodes([]);
        setGraphEdges([]);
      } finally {
        setGraphLoaded(true);
      }

      setLoading(false);
    };

    run();
  }, [classNameSlug, studentId]);

  const stats = {
    totalAttempts: overallAttempts,
    averageAccuracy: overallAccuracy,
    topicsTracked: topicStats.length,
  };

  const performanceDistribution = {
    labels: ["Correct", "Incorrect"],
    datasets: [
      {
        data: [
          Math.round(overallAttempts * overallAccuracy),
          Math.max(
            0,
            overallAttempts - Math.round(overallAttempts * overallAccuracy),
          ),
        ],
        backgroundColor: ["#4caf50", "#f44336"],
      },
    ],
  };

  const topicPerformance = {
    labels: topicStats.map((t) => t.topic),
    datasets: [
      {
        label: "Topic Accuracy (%)",
        data: topicStats.map((t) => Math.round(t.accuracy * 100)),
        backgroundColor: "#90caf9",
      },
    ],
  };

  const dailyAccuracyData = {
    labels: dailySeries.map((p) => p.date),
    datasets: [
      {
        label: "Daily Accuracy (%)",
        data: dailySeries.map((p) => Math.round(p.accuracy * 100)),
        backgroundColor: "#1976d2",
        borderWidth: 2,
        tension: 0.25,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Topic Accuracy Overview" },
    },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const },
      title: { display: true, text: "Overall Quiz Distribution" },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const },
      title: { display: true, text: "Daily Accuracy (Last 30 Days)" },
    },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Student Performance
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Class: {classNameSlug || "(unknown)"} | Student:{" "}
        {studentName || studentId || "(unknown)"}
      </Typography>

      {loading ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            Loading student analytics...
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <StatsCard>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Average Accuracy
                </Typography>
                <Typography
                  variant="h4"
                  color={
                    stats.averageAccuracy >= 0.7
                      ? "success.main"
                      : stats.averageAccuracy >= 0.5
                        ? "warning.main"
                        : "error.main"
                  }
                >
                  {formatPercentage(stats.averageAccuracy)}
                </Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatsCard>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Total Attempts
                </Typography>
                <Typography variant="h4">{stats.totalAttempts}</Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatsCard>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Topics Tracked
                </Typography>
                <Typography variant="h4">{stats.topicsTracked}</Typography>
              </StatsCard>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <ChartContainer>
                <Box sx={{ height: 300 }}>
                  <Doughnut
                    data={performanceDistribution}
                    options={doughnutOptions}
                  />
                </Box>
              </ChartContainer>
            </Grid>
            <Grid item xs={12} md={8}>
              <ChartContainer>
                <Box sx={{ height: 300 }}>
                  <Bar data={topicPerformance} options={barOptions} />
                </Box>
              </ChartContainer>
            </Grid>
            <Grid item xs={12}>
              <ChartContainer>
                <Box sx={{ height: 280 }}>
                  <Bar data={dailyAccuracyData} options={lineOptions} />
                </Box>
              </ChartContainer>
            </Grid>
          </Grid>

          {topReviewTopics.length > 0 && (
            <ChartContainer>
              <Typography variant="h6" gutterBottom>
                Suggested Topics for Review
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {topReviewTopics.map((topic) => (
                  <Chip
                    key={topic}
                    label={`${topic} (${formatPercentage(
                      topicStats.find((t) => t.topic === topic)?.accuracy || 0,
                    )})`}
                    color="warning"
                    sx={{ fontWeight: "bold" }}
                  />
                ))}
              </Box>
            </ChartContainer>
          )}

          <ChartContainer>
            <Typography variant="h6" gutterBottom>
              Student Knowledge Graph Performance
            </Typography>

            <Box sx={{ height: 800, width: "100%" }}>
              {graphLoaded ? (
                graphNodes.length ? (
                  <ReactFlow
                    nodes={graphNodes}
                    edges={graphEdges}
                    nodeTypes={nodeTypes as any}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnDrag
                    zoomOnScroll
                    colorMode={settings.viewMode}
                    nodeOrigin={[0.5, 0]}
                    fitView
                  >
                    <Background gap={20} />
                    <MiniMap />
                  </ReactFlow>
                ) : (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography color="text.primary">
                      No graph found for this class.
                    </Typography>
                  </Box>
                )
              ) : (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography color="text.secondary">
                    Loading graph...
                  </Typography>
                </Box>
              )}
            </Box>
          </ChartContainer>
        </>
      )}
    </Box>
  );
}
