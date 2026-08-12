'use client'

import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { useContext } from 'react'
import { ViewModeContext } from '@/contexts/viewmode-context'

const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useContext(ViewModeContext)

  const theme = createTheme({
    palette: {
      mode: settings.viewMode,
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            letterSpacing: 0,
            textTransform: 'none',
          },
        },
      },
    },
  })

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

export default ThemeWrapper
