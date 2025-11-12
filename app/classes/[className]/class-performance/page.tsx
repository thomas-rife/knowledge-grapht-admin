'use client'

import { useState, useEffect } from 'react'
import { Paper, Typography, Box, styled, Chip, Grid } from '@mui/material'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { createClient } from '@/utils/supabase/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const StatsCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
}))

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}))

const formatPercentage = (decimal: number): string => {
  return `${(decimal * 100).toFixed(1)}%`
}

const ClassPerformance = () => {
  type TopicStats = { topic: string; attempts: number; correct: number; accuracy: number }
  type LessonStats = {
    lesson_id: number | null
    attempts: number
    correct: number
    accuracy: number
  }
  type DailyPoint = { date: string; attempts: number; correct: number; accuracy: number }

  const [topicStats, setTopicStats] = useState<TopicStats[]>([])
  const [lessonStats, setLessonStats] = useState<LessonStats[]>([])
  const [dailySeries, setDailySeries] = useState<DailyPoint[]>([])
  const [overallAttempts, setOverallAttempts] = useState(0)
  const [overallAccuracy, setOverallAccuracy] = useState(0)
  const [studentsCount, setStudentsCount] = useState(0)
  const [topReviewTopics, setTopReviewTopics] = useState<string[]>([])

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()

      // Resolve class_id from URL
      const params = window.location.pathname.split('/').filter(Boolean)
      const classNameSlug = decodeURIComponent(params[1] || '')
        .replace(/-/g, ' ')
        .trim()

      const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .select('class_id')
        .ilike('name', classNameSlug)
        .maybeSingle()

      if (clsErr || !cls?.class_id) {
        console.error('Class lookup failed:', clsErr)
        setTopicStats([])
        setLessonStats([])
        setDailySeries([])
        setTopReviewTopics([])
        setOverallAttempts(0)
        setOverallAccuracy(0)
        setStudentsCount(0)
        return
      }

      const classId = cls.class_id as number

      // Get all answer rows for attempts, students, accuracy fallback
      const {
        data: answers,
        error: aErr,
        count: answersCount,
      } = await supabase
        .from('student_question_answers')
        .select('student_id, lesson_id, question_id, is_correct, answered_at', { count: 'exact' })
        .eq('class_id', classId)

      if (aErr) console.error('Answers fetch failed:', aErr)
      const ansRows = (answers ?? []) as Array<{
        student_id: string | null
        lesson_id: number | null
        question_id: number
        is_correct: boolean | null
        answered_at: string | null
      }>

      // Attempts: prefer server count (handles RLS/pagination), fallback to returned length
      const attempts = typeof answersCount === 'number' ? answersCount : ansRows?.length ?? 0
      setOverallAttempts(attempts)

      // Unique students
      let studentSet = new Set(
        ansRows.map(r => r.student_id).filter((v): v is string => Boolean(v))
      )
      if (
        (typeof answersCount === 'number' && answersCount > ansRows.length) ||
        studentSet.size === 0
      ) {
        const { data: allIds } = await supabase
          .from('student_question_answers')
          .select('student_id')
          .eq('class_id', classId)
          .limit(10000)
        const set2 = new Set(
          (allIds ?? []).map(r => (r as any).student_id).filter((v): v is string => Boolean(v))
        )
        if (set2.size > studentSet.size) studentSet = set2
      }
      setStudentsCount(studentSet.size)

      // Topics from lessons → questions
      const qidToTopics = new Map<number, string[]>()
      let topicsSet = new Set<string>()
      try {
        const { data: clb } = await supabase
          .from('class_lesson_bank')
          .select('lesson_id')
          .eq('class_id', classId)
        const lessonIds = (clb ?? []).map(l => l.lesson_id)

        if (lessonIds.length) {
          const { data: lqb } = await supabase
            .from('lesson_question_bank')
            .select('question_id')
            .in('lesson_id', lessonIds)
          const qids = (lqb ?? []).map(r => r.question_id)

          if (qids.length) {
            const { data: qs } = await supabase
              .from('questions')
              .select('question_id, topics')
              .in('question_id', qids)
            ;(qs ?? []).forEach(q => {
              const row = q as any
              const qid = Number(row.question_id)
              const t = Array.isArray(row.topics) ? row.topics : []
              const cleaned = t
                .map((tt: any) => String(tt ?? '').trim())
                .filter((s: string) => s.length > 0)
              if (qid && cleaned.length) qidToTopics.set(qid, cleaned)
              cleaned.forEach((s: string) => topicsSet.add(s))
            })
          }
        }
      } catch (e) {
        console.error('Topics aggregation failed:', e)
      }

      const topicList = Array.from(topicsSet.values()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      )

      // Aggregate per-topic stats
      const perTopic = new Map<string, { attempts: number; correct: number }>()
      for (const ans of ansRows) {
        const qTopics = qidToTopics.get(Number(ans.question_id)) || []
        if (!qTopics.length) continue
        for (const t of qTopics) {
          const cur = perTopic.get(t) || { attempts: 0, correct: 0 }
          cur.attempts += 1
          if (ans.is_correct) cur.correct += 1
          perTopic.set(t, cur)
        }
      }

      const topicArr: TopicStats[] = topicList.map(topic => {
        const agg = perTopic.get(topic) || { attempts: 0, correct: 0 }
        const accuracy = agg.attempts ? agg.correct / agg.attempts : 0
        return { topic, attempts: agg.attempts, correct: agg.correct, accuracy }
      })
      setTopicStats(topicArr)

      // Find worst five topics
      const worstFive = topicArr
        .filter(t => t.attempts >= 3)
        .sort((a, b) => {
          if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy
          return b.attempts - a.attempts
        })
        .slice(0, 5)
        .map(t => t.topic)

      const fallbackWorst = topicArr
        .filter(t => t.attempts > 0)
        .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
        .slice(0, 5)
        .map(t => t.topic)

      setTopReviewTopics(worstFive.length ? worstFive : fallbackWorst)

      // Accuracy from leitner_schedule preferred (tolerant to column names)
      let totalAttemptsFromSchedule = 0
      let totalCorrectFromSchedule = 0
      try {
        const { data: sched, error: schedErr } = await supabase
          .from('leitner_schedule')
          .select('*')
          .eq('class_id', classId)
        if (schedErr) {
          console.error('[leitner_schedule] select error:', schedErr)
          throw schedErr
        }
        for (const row of sched ?? []) {
          const attemptsVal =
            Number(
              (row as any).total_attempts ??
                (row as any).attempts ??
                (row as any).totalAttempts ??
                (row as any).quiz_attempts ??
                0
            ) || 0
          const correctVal =
            Number(
              (row as any).total_correct ??
                (row as any).correct ??
                (row as any).totalCorrect ??
                (row as any).quiz_correct ??
                0
            ) || 0
          totalAttemptsFromSchedule += attemptsVal
          totalCorrectFromSchedule += correctVal
        }
      } catch (e) {
        console.error('Schedule aggregation failed (falling back to answers):', e)
      }

      if (totalAttemptsFromSchedule > 0 && totalCorrectFromSchedule >= 0) {
        setOverallAccuracy(totalCorrectFromSchedule / totalAttemptsFromSchedule)
      } else {
        const correctFromRows = ansRows.reduce((acc, r) => acc + (r.is_correct ? 1 : 0), 0)
        setOverallAccuracy(attempts ? correctFromRows / attempts : 0)
      }

      // Daily time series
      const dayAgg = new Map<string, { attempts: number; correct: number }>()
      ansRows.forEach(r => {
        const d = r.answered_at ? new Date(r.answered_at) : new Date(NaN)
        const key = isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
        if (!key) return
        if (!dayAgg.has(key)) dayAgg.set(key, { attempts: 0, correct: 0 })
        const curr = dayAgg.get(key)!
        curr.attempts += 1
        if (r.is_correct) curr.correct += 1
      })
      const days = Array.from(dayAgg.entries())
        .map(([date, v]) => ({
          date,
          attempts: v.attempts,
          correct: v.correct,
          accuracy: v.attempts ? v.correct / v.attempts : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
      setDailySeries(days.slice(-30))

      if (attempts === 0 || studentSet.size === 0) {
        console.warn('[ClassPerformance] No attempts or students found for class_id', classId, {
          attempts,
          students: studentSet.size,
          answersCount,
          ansRowsLen: ansRows.length,
        })
      }
    }

    run()
  }, [])

  const stats = {
    totalAttempts: overallAttempts,
    averageAccuracy: overallAccuracy,
    studentsParticipated: studentsCount,
    topicsCount: topicStats.length,
  }

  const performanceDistribution = {
    labels: ['Correct', 'Incorrect'],
    datasets: [
      {
        data: [
          Math.round(overallAttempts * overallAccuracy),
          Math.max(0, overallAttempts - Math.round(overallAttempts * overallAccuracy)),
        ],
        backgroundColor: ['#4caf50', '#f44336'],
      },
    ],
  }

  const topicPerformance = {
    labels: topicStats.map(t => t.topic),
    datasets: [
      {
        label: 'Topic Accuracy (%)',
        data: topicStats.map(t => Math.round(t.accuracy * 100)),
        backgroundColor: '#90caf9',
      },
    ],
  }

  const dailyAccuracyData = {
    labels: dailySeries.map(p => p.date),
    datasets: [
      {
        label: 'Daily Accuracy (%)',
        data: dailySeries.map(p => Math.round(p.accuracy * 100)),
        backgroundColor: '#1976d2',
        borderWidth: 2,
        tension: 0.25,
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Topic Accuracy Overview' },
    },
    scales: { y: { beginAtZero: true, max: 100 } },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
      title: { display: true, text: 'Overall Quiz Distribution' },
    },
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
      title: { display: true, text: 'Daily Accuracy (Last 30 Days)' },
    },
    scales: { y: { beginAtZero: true, max: 100 } },
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Class Performance Overview
      </Typography>

      {/* Key Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Average Accuracy
            </Typography>
            <Typography
              variant="h4"
              color={
                stats.averageAccuracy >= 0.7
                  ? 'success.main'
                  : stats.averageAccuracy >= 0.5
                  ? 'warning.main'
                  : 'error.main'
              }
            >
              {formatPercentage(stats.averageAccuracy)}
            </Typography>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Total Attempts
            </Typography>
            <Typography variant="h4">{stats.totalAttempts}</Typography>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Students Participated
            </Typography>
            <Typography variant="h4">{stats.studentsParticipated}</Typography>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Topics Tracked
            </Typography>
            <Typography variant="h4">{stats.topicsCount}</Typography>
          </StatsCard>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <ChartContainer>
            <Box sx={{ height: 300 }}>
              <Doughnut data={performanceDistribution} options={doughnutOptions} />
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

      {/* Review Topics */}
      {topReviewTopics.length > 0 && (
        <ChartContainer>
          <Typography variant="h6" gutterBottom>
            Suggested Topics for Review
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {topReviewTopics.map(topic => (
              <Chip
                key={topic}
                label={`${topic} (${formatPercentage(
                  topicStats.find(t => t.topic === topic)?.accuracy || 0
                )})`}
                color="warning"
                sx={{ fontWeight: 'bold' }}
              />
            ))}
          </Box>
        </ChartContainer>
      )}
    </Box>
  )
}

export default ClassPerformance
