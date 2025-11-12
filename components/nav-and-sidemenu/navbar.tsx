'use client'

import { styled } from '@mui/material/styles'

import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
import { Box, Toolbar, Typography, IconButton, Tooltip, Avatar } from '@mui/material'
import { Info, Logout, Menu, AccountTree } from '@mui/icons-material'

import { useRouter } from 'next/navigation'

interface AppBarProps extends MuiAppBarProps {
  open?: boolean
}

const drawerWidth = 240

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: prop => prop !== 'open',
})<AppBarProps>(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(90deg, #1e1e2f 0%, #2d3748 100%)'
      : 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
  boxShadow: '0 3px 5px 2px rgba(0, 0, 0, 0.1)',
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}))

const Navbar = ({
  displaySideMenu,
  isSideMenuOpen,
  handleMenuOpen,
}: {
  displaySideMenu: boolean
  isSideMenuOpen: boolean
  handleMenuOpen: () => void
}) => {
  const router = useRouter()

  return (
    <AppBar position="fixed" open={isSideMenuOpen}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {displaySideMenu ? (
            <IconButton
              onClick={handleMenuOpen}
              sx={{
                color: 'white',
                marginRight: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                },
              }}
            >
              <Menu fontSize="medium" />
            </IconButton>
          ) : null}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Avatar
              sx={{
                backgroundColor: 'primary.dark',
                width: 36,
                height: 36,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <AccountTree fontSize="small" />
            </Avatar>

            <Typography
              variant="h6"
              onClick={() => router.push('/classes')}
              sx={{
                fontWeight: 700,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                },
              }}
            >
              Knowledge Grapht
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="About" arrow>
            <IconButton
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                },
              }}
              onClick={() => router.push('/about')}
            >
              <Info />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sign Out" arrow>
            <IconButton
              onClick={() => router.push('/auth/logout')}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                },
              }}
            >
              <Logout />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
