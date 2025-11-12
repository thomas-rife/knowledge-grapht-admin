'use client'

import { Box, IconButton, Tooltip, Typography, Alert, Fade } from '@mui/material'
import { AddCircleOutline, Close } from '@mui/icons-material'
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

  const handleDialogOpen = () => {
    setOpen(true)
  }

  return (
    <>
      {dataLoading ? (
        <ClassConentHeaderSkeleton />
      ) : (
        <>
          <Box id="lesson-name" sx={{ paddingLeft: 3 }}>
            <h1>{params.lessonName.replace(/%20/g, ' ')}</h1>
          </Box>
          <Box
            sx={{
              paddingLeft: 5,
              paddingBottom: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="h5">Questions</Typography>
            <Tooltip title="Add Question">
              <IconButton onClick={handleDialogOpen}>
                <AddCircleOutline />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Fade in={alertOpen}>
          <Alert
            severity="success"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => {
                  setAlertOpen(false)
                }}
              >
                <Close fontSize="inherit" />
              </IconButton>
            }
          >
            Success!
          </Alert>
        </Fade>
      </Box>

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
