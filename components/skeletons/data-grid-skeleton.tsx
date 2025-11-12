'use client'

import { Box } from '@mui/material'
import { GridColDef, DataGrid } from '@mui/x-data-grid'

const DataGridSkeleton = ({ columns }: { columns: GridColDef[] }) => {
  return (
    <Box
      id="test-skeleton"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)', // to compensate for the navbar from the parent component
        width: 'calc(100vw - 65px)', // to compensate for the side menu from the parent component
      }}
    >
      <DataGrid
        columns={columns}
        loading
        slotProps={{
          loadingOverlay: {
            variant: 'skeleton',
            noRowsVariant: 'skeleton',
          },
        }}
      />
    </Box>
  )
}

export default DataGridSkeleton
