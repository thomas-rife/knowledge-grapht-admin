'use client'

import { Box, Card, CardContent, Grid, Skeleton } from '@mui/material'

interface RosterSkeletonProps {
  viewMode: 'grid' | 'list'
  itemsPerPage: number
}

const RosterSkeleton = ({ viewMode, itemsPerPage }: RosterSkeletonProps) => {
  if (viewMode === 'grid') {
    return (
      <Grid container spacing={3}>
        {Array.from(new Array(itemsPerPage)).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card elevation={1}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Skeleton variant="circular" width={56} height={56} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" sx={{ fontSize: '1.25rem', width: '80%' }} />
                    <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: '60%' }} />
                  </Box>
                  <Skeleton variant="circular" width={40} height={40} />
                </Box>
                <Skeleton variant="text" sx={{ fontSize: '0.75rem', width: '40%' }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  return (
    <Card elevation={1}>
      {Array.from(new Array(itemsPerPage)).map((_, index) => (
        <Box key={index}>
          {index > 0 && <Box sx={{ mx: 2, borderTop: 1, borderColor: 'divider' }} />}
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" sx={{ fontSize: '1rem', width: '30%' }} />
                <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: '20%' }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: 100 }} />
                <Skeleton variant="circular" width={32} height={32} />
              </Box>
            </Box>
          </CardContent>
        </Box>
      ))}
    </Card>
  )
}

export default RosterSkeleton
