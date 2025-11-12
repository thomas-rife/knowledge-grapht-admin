'use client'

import { useState } from 'react'
import {
  Box,
  TextField,
  Typography,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Button,
  Alert,
  useTheme,
  Snackbar,
} from '@mui/material'
import AccountCircle from '@mui/icons-material/AccountCircle'
import LockIcon from '@mui/icons-material/Lock'
import logoImage from '@/assets/logo.png'
import Image from 'next/image'
import Link from 'next/link'
import { login } from '@/app/auth/login/actions'

export default function Login() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const theme = useTheme()

  const handleDialogOpen = () => {
    setOpen(true)
    setResetEmail(email)
  }

  const handleDialogClose = () => {
    setOpen(false)
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError(false)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)

    const response = await login(formData)
    setIsLoading(false)

    if (response?.error) {
      setErrorMessage(response.error)
      setLoginError(true)
      return
    }
  }

  return (
    <Box
      className="login-container"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme.palette.mode === 'dark' ? 'background.default' : '#f5f5f7',
        p: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        <Image
          src={logoImage}
          alt="CodeLingo"
          width="150"
          height="150"
          style={{ marginBottom: '1.5rem' }}
        />

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            p: 4,
            borderRadius: 2,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 4px 24px rgba(255,255,255,0.15)'
                : '0 4px 20px rgba(0,0,0,0.1)',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(66, 66, 75, 0.95)' : 'white',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          }}
        >
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
            Sign In
          </Typography>

          <form onSubmit={handleLogin} style={{ width: '100%' }}>
            <Box
              id="form-container"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2.5,
                width: '100%',
              }}
            >
              <TextField
                required
                fullWidth
                id="email"
                name="email"
                type="email"
                label="Email"
                value={email}
                onChange={_event => setEmail(_event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                required
                fullWidth
                id="password"
                name="password"
                type="password"
                label="Password"
                value={password}
                onChange={_event => setPassword(_event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                variant="contained"
                type="submit"
                fullWidth
                disabled={isLoading}
                sx={{ mt: 1, py: 1.5 }}
              >
                {isLoading ? 'Signing In...' : 'Log In'}
              </Button>

              <Typography
                variant="caption"
                onClick={() => handleDialogOpen()}
                sx={{
                  color: 'primary.main',
                  fontWeight: '500',
                  ':hover': {
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  },
                  mt: 1,
                  alignSelf: 'flex-end',
                }}
              >
                Forgot Password?
              </Typography>
            </Box>
          </form>
        </Box>

        <Typography sx={{ mt: 3 }}>
          {`Don't have an account?`}{' '}
          <Link href="/register" style={{ fontWeight: 500, color: theme.palette.primary.main }}>
            Register Here
          </Link>
        </Typography>

        <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
            Reset Your Password
          </DialogTitle>
          <DialogContent>
            <Box sx={{ p: 2 }}>
              <DialogContentText sx={{ mb: 3 }}>
                Enter your email address below and we will send you a link to reset your password.
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="reset-email"
                type="email"
                fullWidth
                label="Email Address"
                variant="outlined"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button onClick={handleDialogClose} color="error">
                  Cancel
                </Button>
                <Button onClick={() => alert('COMING SOON...SORRY...')} variant="contained">
                  Send Reset Link
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
      <Snackbar
        open={loginError}
        autoHideDuration={4000}
        onClose={() => {
          setLoginError(false)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          variant="filled"
          severity="error"
          onClose={() => {
            setLoginError(false)
          }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
