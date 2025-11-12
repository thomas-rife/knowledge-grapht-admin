'use client'

import { AddCircleOutline } from '@mui/icons-material'
import { Box, IconButton, Skeleton, Typography } from '@mui/material'

const ClassConentHeaderSkeleton = () => {
  return (
    <>
      <Box id="class-name" sx={{ paddingLeft: 3, width: '20%' }}>
        <h1>
          <Skeleton />
        </h1>
      </Box>
      <Box
        sx={{
          paddingLeft: 5,
          paddingBottom: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '10%',
        }}
      >
        <Typography variant="h5" sx={{ width: '100%' }}>
          <Skeleton />
        </Typography>
        <Skeleton variant="circular">
          <IconButton>
            <AddCircleOutline />
          </IconButton>
        </Skeleton>
      </Box>
    </>
  )
}

export default ClassConentHeaderSkeleton
