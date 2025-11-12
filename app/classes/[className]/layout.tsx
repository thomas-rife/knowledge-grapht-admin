import { Box } from '@mui/material'
import { ReactNode } from 'react'
import NavbarWithSideMenu from '@/components/nav-and-sidemenu/navbar-with-sidemenu'

const ClassPageLayout = ({
  children,
  params,
}: {
  children: ReactNode
  params: { className: string }
}) => {
  return (
    <>
      <NavbarWithSideMenu className={params.className} displaySideMenu />
      <Box
        sx={{
          marginTop: '64px', // to compensate for the navbar/sidemenu
          marginLeft: '65px', // to compensate for the navbar/sidemenu
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 64px)',
          width: 'calc(100vw - 65px)',
        }}
      >
        {children}
      </Box>
    </>
  )
}

export default ClassPageLayout
