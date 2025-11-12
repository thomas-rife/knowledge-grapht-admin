'use client'

import LessonsIcon from '@mui/icons-material/MenuBook'
import KnowledgeGraphIcon from '@mui/icons-material/Workspaces'
import RosterIcon from '@mui/icons-material/Groups'
import ClassPerformanceIcon from '@mui/icons-material/Insights'
import SettingsIcon from '@mui/icons-material/Settings'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import MuiDrawer from '@mui/material/Drawer'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Box,
  Tooltip,
} from '@mui/material'
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles'
import { useRouter, usePathname } from 'next/navigation'

const drawerWidth = 240

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
  borderRight: `1px solid ${
    theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200]
  }`,
})

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
  borderRight: `1px solid ${
    theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200]
  }`,
})

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}))

const Drawer = styled(MuiDrawer, { shouldForwardProp: prop => prop !== 'open' })(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  variants: [
    {
      props: ({ open }) => open,
      style: {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
      },
    },
    {
      props: ({ open }) => !open,
      style: {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
      },
    },
  ],
}))

const SideMenu = ({
  displaySideMenu,
  isSideMenuOpen,
  className,
  handleMenuClose,
}: {
  displaySideMenu: boolean
  isSideMenuOpen: boolean
  className: string
  handleMenuClose: () => void
}) => {
  const theme = useTheme()
  const router = useRouter()
  const pathname = usePathname()

  const sideMenuItems = [
    { text: 'Lessons', icon: <LessonsIcon />, slug: `/classes/${className}/lessons` },
    {
      text: 'Knowledge Graph',
      icon: <KnowledgeGraphIcon />,
      slug: `/classes/${className}/knowledge-graph`,
    },
    { text: 'Roster', icon: <RosterIcon />, slug: `/classes/${className}/roster` },
    {
      text: 'Class Performance',
      icon: <ClassPerformanceIcon />,
      slug: `/classes/${className}/class-performance`,
    },
    {
      text: 'Class Settings',
      icon: <SettingsIcon />,
      slug: `/classes/${className}/class-settings`,
    },
  ]

  // Check if current path matches a menu item
  const isActive = (path: string) => pathname?.startsWith(path)

  if (!displaySideMenu) return null

  return (
    <Drawer variant="permanent" open={isSideMenuOpen}>
      <DrawerHeader
        sx={{
          backgroundColor:
            theme.palette.mode === 'dark' ? 'rgba(41, 98, 255, 0.08)' : 'rgba(25, 118, 210, 0.08)',
        }}
      >
        <IconButton
          onClick={handleMenuClose}
          sx={{
            '&:hover': {
              backgroundColor:
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          {theme.direction === 'ltr' ? <ChevronLeft /> : null}
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List sx={{ pt: 1 }}>
        {sideMenuItems.map(({ text, icon, slug }, index) => {
          const isItemActive = isActive(slug)

          return (
            <ListItem key={index} disablePadding sx={{ display: 'block', mb: 0.5 }}>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: 'initial',
                  px: 2.5,
                  borderRadius: '0 24px 24px 0',
                  marginRight: 1,
                  backgroundColor: isItemActive
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(41, 98, 255, 0.15)'
                      : 'rgba(25, 118, 210, 0.08)'
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: isItemActive
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(41, 98, 255, 0.25)'
                        : 'rgba(25, 118, 210, 0.15)'
                      : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)',
                  },
                  transition: 'all 0.2s ease',
                }}
                onClick={() => router.push(slug)}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 3,
                    justifyContent: 'center',
                    color: isItemActive ? theme.palette.primary.main : 'inherit',
                  }}
                >
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={text}
                  sx={{
                    opacity: 1,
                    '& .MuiTypography-root': {
                      fontWeight: isItemActive ? 600 : 400,
                      color: isItemActive ? theme.palette.primary.main : 'inherit',
                    },
                  }}
                />
                {isItemActive && (
                  <Box
                    sx={{
                      width: 3,
                      height: 20,
                      borderRadius: 1,
                      backgroundColor: theme.palette.primary.main,
                      position: 'absolute',
                      left: 0,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Drawer>
  )
}

export default SideMenu
