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
        height: '100%',
        minHeight: 400,
        width: '100%',
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
