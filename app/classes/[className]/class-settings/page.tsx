'use client'

import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  Paper,
  TextField,
  Grid2 as Grid,
  Card,
  CardContent,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  IconButton,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material'
import { deleteClass, createClassCode } from '@/app/classes/[className]/class-settings/actions'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ClassSettings = ({ params: { className } }: { params: { className: string } }) => {
  const router = useRouter()
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState<boolean>(false)
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false)
  const [snackbarMessage, setSnackbarMessage] = useState<string>('')
  const [decodedClassName, setDecodedClassName] = useState<string>('')
  const [classSettings, setClassSettings] = useState({
    notifications: true,
    autoGrading: false,
    shareableLink: `${
      typeof window !== 'undefined' ? window.location.origin : ''
    }/join-class?code=${encodeURIComponent(className)}`,
    classCode: null as string | null,
    expiresAt: null as string | null,
  })
  const [editingClassName, setEditingClassName] = useState<boolean>(false)
  const [currentClassName, setCurrentClassName] = useState<string>('')
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    // TODO: fix this
    const decoded = decodeURIComponent(className).replace(/%20/g, ' ')
    setDecodedClassName(decoded)
    setCurrentClassName(decoded)
  }, [className])

  useEffect(() => {
    if (classSettings.classCode && classSettings.expiresAt) {
      const updateTimeLeft = () => {
        const now = new Date()
        const expiresAt = new Date(classSettings.expiresAt!)
        const timeLeftMs = expiresAt.getTime() - now.getTime()

        if (timeLeftMs <= 0) {
          setTimeLeft(null)
          setClassSettings(prev => ({ ...prev, classCode: null, expiresAt: null }))
          return
        }

        // Convert to seconds and round up
        setTimeLeft(Math.ceil(timeLeftMs / 1000))
      }

      updateTimeLeft()
      const timer = setInterval(updateTimeLeft, 1000)
      return () => clearInterval(timer)
    }
  }, [classSettings.classCode, classSettings.expiresAt])

  const handleConfirmationDialogOpen = () => {
    setConfirmationDialogOpen(true)
  }

  const handleConfirmationDialogClose = () => {
    setConfirmationDialogOpen(false)
  }

  const handleDeleteClass = async () => {
    try {
      const response = await deleteClass(decodedClassName)

      if (response.success) {
        showSnackbar('Class deleted successfully')
        router.replace('/classes')
      } else {
        showSnackbar(`Error deleting class: ${response.error}`)
      }
    } catch (error) {
      showSnackbar(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setConfirmationDialogOpen(false)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(classSettings.shareableLink)
    showSnackbar('Class link copied to clipboard!')
  }

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message)
    setSnackbarOpen(true)
  }

  const handleSnackbarClose = () => {
    setSnackbarOpen(false)
  }

  const handleSettingChange = (setting: string, value: boolean) => {
    setClassSettings({
      ...classSettings,
      [setting]: value,
    })
    showSnackbar(`Setting updated: ${setting} is now ${value ? 'enabled' : 'disabled'}`)
  }

  const startEditingClassName = () => {
    setEditingClassName(true)
  }

  const saveClassName = () => {
    // TODO: implement the server action to update the class name
    setEditingClassName(false)
    // showSnackbar('Class name updated successfully')
    showSnackbar('Updated class name is not persistent yet. This is a placeholder message.') // Placeholder message until server action is implemented
    // This would require implementation of the updateClassName server action
    // Then redirect to the new URL or refresh the page
  }

  const handleClassCodeCreation = async () => {
    const response = await createClassCode(decodedClassName)
    if (response.success) {
      setClassSettings({
        ...classSettings,
        classCode: response.code ?? null,
        expiresAt: response.expiresAt ?? null,
      })
      setAlertSeverity('success')
      showSnackbar('Class code created successfully')
    } else {
      setAlertSeverity('error')
      showSnackbar(`Error creating class code`)
    }
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Paper elevation={2} sx={{ padding: 3, marginBottom: 4, height: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 3,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Class Settings
          </Typography>
          {!editingClassName ? (
            <Typography variant="h5" display="flex" alignItems="center">
              {/* {decodedClassName} */}
              {currentClassName}
              <IconButton
                color="primary"
                onClick={startEditingClassName}
                size="small"
                sx={{ marginLeft: 1 }}
              >
                <EditIcon />
              </IconButton>
            </Typography>
          ) : (
            <Box display="flex" alignItems="center">
              <TextField
                value={currentClassName}
                onChange={e => setCurrentClassName(e.target.value)}
                variant="outlined"
                size="small"
              />
              <IconButton color="primary" onClick={saveClassName} sx={{ marginLeft: 1 }}>
                <SaveIcon />
              </IconButton>
            </Box>
          )}
        </Box>

        <Divider sx={{ marginBottom: 3 }} />

        <Grid container spacing={4}>
          {/* Class Information Section */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={1} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                  <SettingsIcon sx={{ marginRight: 1 }} /> General Settings
                </Typography>

                <Box mt={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={classSettings.notifications}
                        onChange={e => handleSettingChange('notifications', e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Email Notifications"
                  />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ marginLeft: 4, marginBottom: 2 }}
                  >
                    Receive email notifications when students submit assignments
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={1} sx={{ height: '100%' }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', mb: 2 }}
                >
                  <Box component="span" sx={{ mr: 1 }}>
                    🔗
                  </Box>
                  Class Invitation
                </Typography>

                {classSettings.classCode ? (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Share this code with your students
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          background: theme =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.05)'
                              : theme.palette.grey[50],
                          border: theme =>
                            `1px solid ${
                              theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : theme.palette.grey[200]
                            }`,
                          borderRadius: '8px',
                          p: '8px 16px',
                          '&:hover': {
                            background: theme =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.08)'
                                : theme.palette.grey[100],
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '1.25rem',
                            fontFamily: 'monospace',
                            letterSpacing: '0.1em',
                            color: theme =>
                              theme.palette.mode === 'dark'
                                ? theme.palette.grey[100]
                                : theme.palette.grey[800],
                            userSelect: 'all',
                          }}
                        >
                          {classSettings.classCode}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(classSettings.classCode || '')
                            showSnackbar('Code copied to clipboard!')
                          }}
                          sx={{
                            ml: 1,
                            color: theme =>
                              theme.palette.mode === 'dark'
                                ? theme.palette.grey[400]
                                : theme.palette.grey[600],
                            '&:hover': {
                              color: theme => theme.palette.primary.main,
                              background: theme =>
                                theme.palette.mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.04)',
                            },
                          }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography
                        variant="body2"
                        color={timeLeft && timeLeft <= 300 ? 'error' : 'textSecondary'}
                        sx={{
                          animation: timeLeft && timeLeft <= 300 ? 'pulse 1s infinite' : 'none',
                          '@keyframes pulse': {
                            '0%': { opacity: 1 },
                            '50%': { opacity: 0.5 },
                            '100%': { opacity: 1 },
                          },
                        }}
                      >
                        {timeLeft === null
                          ? 'Code expired. Generate a new one.'
                          : timeLeft > 60
                          ? `Expires in ${Math.floor(timeLeft / 60)} minutes and ${
                              timeLeft % 60
                            } seconds`
                          : `Expires in ${timeLeft} seconds`}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Generate a code for students to join this class
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={handleClassCodeCreation}
                      sx={{
                        mt: 2,
                        borderRadius: '8px',
                        textTransform: 'none',
                        px: 3,
                      }}
                    >
                      Generate Join Code
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Danger Zone */}
        <Box sx={{ marginTop: 4 }}>
          <Paper elevation={0} sx={{ padding: 3, border: '1px solid #ffdddd', borderRadius: 1 }}>
            <Typography variant="h6" color="error" gutterBottom>
              Danger Zone
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle1">Delete this class</Typography>
                <Typography variant="body2" color="textSecondary">
                  Once you delete a class, there is no going back. Please be certain.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleConfirmationDialogOpen}
              >
                Delete Class
              </Button>
            </Box>
          </Paper>
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmationDialogOpen} onClose={handleConfirmationDialogClose}>
        <DialogTitle>Are you sure you want to delete this class?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete <strong>{currentClassName}</strong> and all associated
            data, including lessons, assignments, and student records. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmationDialogClose}>Cancel</Button>
          <Button onClick={handleDeleteClass} color="error" startIcon={<DeleteIcon />}>
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={alertSeverity} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ClassSettings
