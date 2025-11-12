'use client'

import { useState, useEffect } from 'react'
import { Box, useTheme, useMediaQuery } from '@mui/material'
import Navbar from '@/components/nav-and-sidemenu/navbar'
import SideMenu from '@/components/nav-and-sidemenu/side-menu'

const NavbarWithSideMenu = ({
  className,
  displaySideMenu,
}: {
  className: string
  displaySideMenu: boolean
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)

  // Update side menu state based on both mobile status and displaySideMenu prop
  useEffect(() => {
    // If side menu shouldn't display at all, keep it closed
    if (!displaySideMenu) {
      setIsSideMenuOpen(false)
      return
    }

    // On desktop, initialize as closed for better UX
    // On mobile, always keep it closed initially
    setIsSideMenuOpen(false)
  }, [displaySideMenu, isMobile])

  const handleMenuOpen = () => setIsSideMenuOpen(true)
  const handleMenuClose = () => setIsSideMenuOpen(false)

  return (
    <Box
      id="nav-and-sidemenu"
      sx={{
        display: 'flex',
        position: 'relative',
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Navbar
        displaySideMenu={displaySideMenu}
        isSideMenuOpen={isSideMenuOpen}
        handleMenuOpen={handleMenuOpen}
      />
      <SideMenu
        displaySideMenu={displaySideMenu}
        isSideMenuOpen={isSideMenuOpen}
        className={className}
        handleMenuClose={handleMenuClose}
      />
    </Box>
  )
}

export default NavbarWithSideMenu
