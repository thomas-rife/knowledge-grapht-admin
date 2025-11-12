import { Box, Skeleton, IconButton, Typography, Paper } from '@mui/material'
import HelpIcon from '@mui/icons-material/Help'
import EditableNode from '../custom-graph-nodes/editable-node'

// import {
//   type Node,
//   type Edge,
//   ReactFlow,
//   Controls,
//   Background,
//   useReactFlow,
//   ReactFlowProvider,
// } from '@xyflow/react'
// const skeletonNodes = [
//   {
//     id: '1',
//     type: 'editableNode',
//     position: { x: 100, y: 100 },
//     data: { label: 'Node 1' },
//   },
//   {
//     id: '2',
//     type: 'editableNode',
//     position: { x: 200, y: 200 },
//     data: { label: 'Node 2' },
//   },
// ]

// const skeletonEdges = [
//   {
//     id: 'e1-2',
//     source: '1',
//     target: '2',
//   },
// ]

const paperStyle = {
  height: '9em',
  width: '15em',
}

const KnowledgeGraphSkeleton = () => {
  return (
    <>
      <Box
        sx={{
          // backgroundColor: 'pink',
          display: 'flex',
          flexDirection: 'column',
          // justifyContent: 'center',
          alignItems: 'center',
          // gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
        </Box>
        <Box
          sx={{
            width: 'calc(100vw - 80px)',
            display: 'flex',
            justifyContent: 'space-evenly',
            gap: 2,
            // backgroundColor: 'pink',
          }}
        >
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
          <Skeleton>
            <Paper elevation={8} sx={paperStyle} />
          </Skeleton>
        </Box>
      </Box>

      {/* </Box> */}
    </>
  )
}

export default KnowledgeGraphSkeleton
