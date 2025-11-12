'use client'

import {
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Checkbox,
} from '@mui/material'
import {
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
  type GridValidRowModel,
} from '@mui/x-data-grid'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { getAllLessons, importLessonToClass } from '@/app/classes/[className]/lessons/actions'
import { Lesson } from '@/types/content.types'

const CustomToolbar = ({
  page,
  className,
  setRows,
}: {
  page: string
  className: string
  setRows: Dispatch<SetStateAction<readonly GridValidRowModel[]>>
}) => {
  const [open, setOpen] = useState(false)
  const [userLessons, setUserLessons] = useState<Lesson[] | undefined>(undefined)
  const [lessonsToImport, setLessonsToImport] = useState<{ [key: string]: boolean }>()

  const handleDialogOpen = async () => {
    setOpen(true)

    if (userLessons) return

    const response = await getAllLessons()

    if (!response.success) {
      alert(`Error fetching lessons: , ${response.error}`)
      return
    }

    setUserLessons(response.lessons)

    const checkbox = response.lessons?.reduce((acc: { [key: string]: boolean }, { name }) => {
      acc[name] = false
      return acc
    }, {} as { [key: string]: boolean })

    setLessonsToImport(checkbox)
  }

  const handleDialogClose = () => {
    setOpen(false)
  }

  const handleAddLessonToImportList = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLessonsToImport(prev => ({
      ...prev,
      [e.target.name]: e.target.checked,
    }))
  }

  const handleImportLessons = async () => {
    const chosenLessons = userLessons?.filter(lesson => lessonsToImport?.[lesson.name])

    if (!chosenLessons || chosenLessons.length === 0) {
      alert('No lessons selected')
      return
    }

    const response = await importLessonToClass(
      className,
      chosenLessons.map(({ lesson_id }) => lesson_id).filter((id): id is number => id !== undefined)
    )

    if (!response?.success) {
      alert(`Error importing lessons: ${response.error}`)
      return
    }

    setRows(prev => [
      ...prev,
      ...chosenLessons.map(({ lesson_id, name, topics }) => ({
        id: lesson_id,
        lessonName: name,
        unitsCovered: topics.join(', '),
      })),
    ])
  }

  return (
    <>
      <GridToolbarContainer>
        <GridToolbarDensitySelector />
        <Tooltip title="Import a Lesson">
          <Button onClick={handleDialogOpen}>Import</Button>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <GridToolbarExport slotProps={{ button: { variant: 'outlined' } }} />
      </GridToolbarContainer>

      <Dialog open={open}>
        <DialogTitle>Import Lesson?</DialogTitle>
        <DialogContent>
          {userLessons
            ? userLessons.map(({ name }, index) => (
                <Box key={index}>
                  <Checkbox
                    checked={lessonsToImport?.name}
                    onChange={handleAddLessonToImportList}
                    name={name}
                  />
                  {name}
                </Box>
              ))
            : 'Loading...'}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleImportLessons}>Import</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default CustomToolbar
