'use client'

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
  Skeleton,
  CircularProgress,
  useTheme,
} from '@mui/material'
import { AddCircleOutline, School } from '@mui/icons-material'
import { getClassData, createNewClass } from '@/app/classes/actions'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavbarWithSideMenu from '@/components/nav-and-sidemenu/navbar-with-sidemenu'
import { Slider, Stack } from '@mui/material'

/**
 * TODO: need to create a theme provider to handle dark mode and light mode
 * instead of doing what we are doing here with the colors
 */

// array of header colors for classes - light mode colors
const LIGHT_MODE_COLORS = [
  '#1976d2', // blue (primary)
  '#2e7d32', // green
  '#d32f2f', // red
  '#7b1fa2', // purple
  '#ed6c02', // orange
  '#0288d1', // light blue
  '#5d4037', // brown
  '#6a1b9a', // deep purple
  '#00695c', // teal
  '#c2185b', // pink
]

// array of header colors for classes - dark mode colors (slightly deeper versions)
const DARK_MODE_COLORS = [
  '#0d47a1', // darker blue
  '#1b5e20', // darker green
  '#b71c1c', // darker red
  '#4a148c', // darker purple
  '#e65100', // darker orange
  '#01579b', // darker light blue
  '#3e2723', // darker brown
  '#4a148c', // darker deep purple
  '#004d40', // darker teal
  '#880e4f', // darker pink
]

// Number of skeleton cards to show during loading
const SKELETON_COUNT = 8

const ClassesSkeleton = ({ isDarkMode }: { isDarkMode: boolean }) => {
  return (
    <Grid container spacing={3}>
      {Array.from(new Array(SKELETON_COUNT)).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <Box
              sx={{
                height: '90px',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <Skeleton
                variant="rectangular"
                height={90}
                width="100%"
                animation="wave"
                sx={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
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
              <Skeleton variant="text" height={20} width="90%" animation="wave" />
              <Skeleton variant="text" height={20} width="70%" animation="wave" />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
const Classes = () => {
  const theme = useTheme()
  const isDarkMode = theme.palette.mode === 'dark'
  const [navigatingToClass, setNavigatingToClass] = useState<string | null>(null)

  // Select the appropriate color array based on the theme mode
  const CLASS_HEADER_COLORS = isDarkMode ? DARK_MODE_COLORS : LIGHT_MODE_COLORS

  const [classes, setClasses] = useState<(string | null)[]>([])
  const [addClassDialogOpen, setAddClassDialogOpen] = useState<boolean>(false)
  const [newClassName, setNewClassName] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error'
  }>({
    show: false,
    message: '',
    type: 'success',
  })

  const [classLevel, setClassLevel] = useState<number>(0)
  const LEVELS = [
    { value: 0, label: 'Intro' },
    { value: 1, label: 'Foundational' },
    { value: 2, label: 'Intermediate' },
    { value: 3, label: 'Advanced' },
  ]

  const router = useRouter()

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
      className?.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc)
      }, 0) || 0

    const colorByHash = CLASS_HEADER_COLORS[Math.abs(hashCode) % CLASS_HEADER_COLORS.length]
    return colorByHash
  }

  /**
   *  handlers
   */
  const handleOpenAddClassDialog = () => setAddClassDialogOpen(true)
  const handleCloseAddClassDialog = () => setAddClassDialogOpen(false)

  const handleCancelAddClass = () => {
    setNewClassName('')
    setAddClassDialogOpen(false)
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({
      show: true,
      message,
      type,
    })
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, show: false })
  }

  const handleCreateClass = async () => {
    const trimmedName = newClassName.trim()

    if (!trimmedName) {
      showNotification('Class name cannot be empty', 'error')
      return
    }

    // Only allow letters, numbers, spaces, and basic punctuation (no colons, slashes, etc.)
    const validNameRegex = /^[a-zA-Z0-9\s\-_&().]+$/
    if (!validNameRegex.test(trimmedName)) {
      showNotification(
        'Class name contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, and parentheses are allowed.',
        'error'
      )
      return
    }

    if (classes.includes(trimmedName)) {
      showNotification('Class already exists', 'error')
      return
    }

    try {
      const response = await createNewClass(trimmedName, classLevel)

      if (!response.success) {
        showNotification('Error creating class', 'error')
        return
      }

      setClasses([...classes, trimmedName])
      setNewClassName('')
      setAddClassDialogOpen(false)
      showNotification('Class created successfully!', 'success')
    } catch (error) {
      showNotification('Error creating class', 'error')
    }
  }

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true)
      try {
        const data = await getClassData()
        setClasses(data)
      } catch (error) {
        showNotification('Error loading classes', 'error')
      } finally {
        setIsLoading(false)
      }
    }
    fetchClasses()
  }, [])

  const handleClassNavigation = (className: string) => {
    setNavigatingToClass(className)
    router.push(`/classes/${className}/lessons`)
  }

  return (
    <>
      <NavbarWithSideMenu className="" displaySideMenu={false} />
      {navigatingToClass && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            zIndex: theme.zIndex.drawer + 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="h6" color={isDarkMode ? 'white' : 'inherit'}>
            Loading {navigatingToClass}...
          </Typography>
        </Box>
      )}
      <Container maxWidth="lg" sx={{ marginTop: 10, marginBottom: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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
                  onMouseEnter={() => router.prefetch(`/classes/${className}/lessons`)}
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: isDarkMode
                        ? '0 10px 20px rgba(0,0,0,0.4)'
                        : '0 10px 20px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => handleClassNavigation(className || '')}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: getClassColor(className || '', index),
                        color: 'white',
                        width: '100%',
                        py: 3,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <School fontSize="large" />
                    </Box>
                    <CardContent sx={{ flexGrow: 1, textAlign: 'center', width: '100%' }}>
                      <Typography variant="h6" component="h2" fontWeight="bold" gutterBottom>
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50vh',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              borderRadius: 2,
              p: 3,
            }}
          >
            <School fontSize="large" color="disabled" sx={{ marginBottom: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No classes yet
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" marginBottom={3}>
              Create your first class to get started with Knowledge Grapht
            </Typography>
          </Box>
        )}
      </Container>

      <Dialog open={addClassDialogOpen} onClose={handleCloseAddClassDialog} fullWidth maxWidth="sm">
        <DialogTitle>Create New Class</DialogTitle>
        <DialogContent>
          <TextField
            id="class-name"
            label="Class Name"
            placeholder="e.g., CMSI 3300"
            variant="outlined"
            value={newClassName}
            onChange={e => {
              const value = e.target.value
              // Block special characters as user types
              if (value === '' || /^[a-zA-Z0-9\s\-_&().]*$/.test(value)) {
                setNewClassName(value)
              }
            }}
            fullWidth
            margin="normal"
            autoFocus
            required
            error={
              newClassName.trim() === '' ||
              (newClassName.length > 0 && !/^[a-zA-Z0-9\s\-_&().]+$/.test(newClassName))
            }
            helperText={
              newClassName.trim() === ''
                ? 'Class name is required'
                : newClassName.length > 0 && !/^[a-zA-Z0-9\s\-_&().]+$/.test(newClassName)
                ? 'Only letters, numbers, spaces, hyphens, underscores, and parentheses allowed'
                : ''
            }
          />
        </DialogContent>
        <Stack
          spacing={1}
          sx={{
            mt: 2,
            mb: 6,
            px: 5,
          }}
        >
          <Typography variant="subtitle2">Class Level</Typography>
          <Slider
            value={classLevel}
            onChange={(_, v) => setClassLevel(Number(v))}
            step={1}
            min={0}
            max={3}
            marks={LEVELS}
            valueLabelDisplay="auto"
          />
        </Stack>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelAddClass} variant="text">
            Cancel
          </Button>
          <Button
            onClick={handleCreateClass}
            variant="contained"
            disabled={newClassName.trim() === ''}
          >
            Create Class
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notification.show} autoHideDuration={5000} onClose={handleCloseNotification}>
        <Alert severity={notification.type} onClose={handleCloseNotification}>
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default Classes
