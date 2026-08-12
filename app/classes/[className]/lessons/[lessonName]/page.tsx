'use client'

import { Alert, Snackbar } from '@mui/material'
import { useState } from 'react'
import QuestionDataGrid from '@/app/classes/[className]/lessons/[lessonName]/question-data-grid'
import AddQuestionDialog from '@/app/classes/[className]/lessons/[lessonName]/add-question-dialog'
import ClassConentHeaderSkeleton from '@/components/skeletons/class-content-header-skeleton'

const Questions = ({
  params,
}: {
  params: {
    className: string
    lessonName: string
  }
}) => {
  const [open, setOpen] = useState<boolean>(false)
  const [refreshGrid, setRefreshGrid] = useState<number>(1)
  const [alertOpen, setAlertOpen] = useState<boolean>(false)
  const [dataLoading, setDataLoading] = useState<boolean>(true)

  return (
    <>
      {dataLoading && <ClassConentHeaderSkeleton />}

      <Snackbar
        open={alertOpen}
        autoHideDuration={4000}
        onClose={() => setAlertOpen(false)}
      >
        <Alert severity="success" onClose={() => setAlertOpen(false)}>
          Question saved
        </Alert>
      </Snackbar>

      <QuestionDataGrid
        params={{ className: params.className, lessonName: params.lessonName }}
        dataLoading={dataLoading}
        setDataLoading={setDataLoading}
        setOpen={setOpen}
        refreshGrid={refreshGrid}
      />
      <AddQuestionDialog
        lessonName={params.lessonName}
        open={open}
        setOpen={setOpen}
        setAlertOpen={setAlertOpen}
        setRefreshGrid={setRefreshGrid}
      />
    </>
  )
}

export default Questions
