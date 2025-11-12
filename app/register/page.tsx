'use client'

import {
  Box,
  TextField,
  Typography,
  Button,
  Alert,
  InputAdornment,
  useTheme,
  Snackbar,
} from '@mui/material'
import { useState } from 'react'
import { signup } from '@/app/auth/login/actions'
import Link from 'next/link'
import Image from 'next/image'
import logoImage from '@/assets/logo.png'
import AccountCircle from '@mui/icons-material/AccountCircle'
import LockIcon from '@mui/icons-material/Lock'
import BadgeIcon from '@mui/icons-material/Badge'

const Register = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [registrationError, setRegistrationError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('Invalid email. Please use your LMU email.')
  const [isLoading, setIsLoading] = useState(false)
  const theme = useTheme()

  const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('displayName', displayName)

    // checking if user signed up with LMU email
    const response = await signup(formData)
    setIsLoading(false)
    if (response?.error) {
      console.error(response.error)
      setErrorMessage(response.error)
      setRegistrationError(true)
    }
  }

  return (
    <Box
      id="register-container"
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
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
            Create Your Account
          </Typography>

          <form onSubmit={handleRegistration} style={{ width: '100%' }}>
            <Box
              id="registration-form"
              sx={{
                display: 'flex',
                gap: 2.5,
                width: '100%',
                flexDirection: 'column',
              }}
            >
              <TextField
                required
                fullWidth
                id="displayName"
                label="Full Name"
                name="displayName"
                variant="outlined"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                required
                fullWidth
                id="email"
                name="email"
                label="Email"
                variant="outlined"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                error={registrationError}
                // helperText={registrationError ? 'Please use your LMU email (@lmu.edu)' : ''}
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
                label="Password"
                variant="outlined"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
                {isLoading ? 'Creating Account...' : 'Register'}
              </Button>
            </Box>
          </form>
        </Box>

        <Typography sx={{ marginTop: 3 }}>
          {`Already have an account?`}{' '}
          <Link href="/" style={{ fontWeight: 500, color: theme.palette.primary.main }}>
            Login Here
          </Link>
        </Typography>
      </Box>

      <Snackbar
        open={registrationError}
        autoHideDuration={4000}
        onClose={() => {
          setRegistrationError(false)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          variant="filled"
          severity="error"
          onClose={() => {
            setRegistrationError(false)
          }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Register
