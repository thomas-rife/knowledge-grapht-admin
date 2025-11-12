'use client'

import { Add, Save, ExitToApp, Edit } from '@mui/icons-material'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  SpeedDial,
  SpeedDialAction,
} from '@mui/material'
import { type Node, type Edge } from '@xyflow/react'
import React, {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react'
import {
  detectCycle,
  updateKnowledgeGraph,
} from '@/app/classes/[className]/knowledge-graph/actions'

const EditGraphActions = ({
  className,
  setInEditMode,
  setInteractionProps,
  currentReactFlowData,
  setReactFlowData,
}: {
  className: string
  setInEditMode: Dispatch<SetStateAction<boolean>>
  setInteractionProps: Dispatch<
    SetStateAction<{
      nodesDraggable: boolean
      nodesConnectable: boolean
      elementsSelectable: boolean
    }>
  >
  currentReactFlowData: {
    reactFlowNodes: Node[]
    reactFlowEdges: Edge[]
  } | null
  setReactFlowData: Dispatch<
    React.SetStateAction<{
      reactFlowNodes: Node[]
      reactFlowEdges: Edge[]
    } | null>
  >
}) => {
  const updatedReactFlowData = useRef(currentReactFlowData)
  const [oldReactFlowData, setOldReactFlowData] = useState(currentReactFlowData)

  useEffect(() => {
    updatedReactFlowData.current = currentReactFlowData
  }, [currentReactFlowData])

  /**
   * ----------------------------------------------
   * Input states and functions
   * ----------------------------------------------
   * */
  const [inputState, setInputState] = useState({ parentNodes: '', nodeTopic: '', targetNodes: '' })
  const handleInputChange = (_event: React.ChangeEvent<HTMLInputElement>) =>
    setInputState({
      ...inputState,
      [_event.target.name]: _event.target.value,
    })

  /**
   * ----------------------------------------------
   * Dialog state and functions
   * ----------------------------------------------
   * */
  const [open, setOpen] = useState(false)
  const [openConfirmationDialog, setOpenConfirmationDialog] = useState(false)

  const handleOpenDialog = () => setOpen(true)

  const handleCloseDialog = () => {
    setOpen(false)
    setInputState({ parentNodes: '', nodeTopic: '', targetNodes: '' })
  }
  const exitEditMode = () => {
    setOpenConfirmationDialog(true)
  }

  const handleExitWithoutSaving = () => {
    setReactFlowData(oldReactFlowData)
    setInEditMode(false)
    setInteractionProps({
      nodesDraggable: false,
      nodesConnectable: false,
      elementsSelectable: false,
    })
    setOpenConfirmationDialog(false)
  }

  const saveGraph = useCallback(async () => {
    // TODO: need to also update nodes and edges in the database
    const { reactFlowNodes, reactFlowEdges } = updatedReactFlowData.current || {
      reactFlowNodes: [],
      reactFlowEdges: [],
    }

    const graph = await detectCycle(reactFlowEdges)

    if (!graph.isValid) {
      alert('Graph contains a cycle. Please fix it before saving.')
      console.log('Cycle detected in edges: ', graph.cycleEdges)
      return
    }

    const response = await updateKnowledgeGraph(className, {
      reactFlowEdges: JSON.parse(JSON.stringify(reactFlowEdges)),
      reactFlowNodes: JSON.parse(JSON.stringify(reactFlowNodes)),
    })

    if (response.success) alert('Graph saved successfully')

    setOldReactFlowData(updatedReactFlowData.current)
  }, [className])

  const editActions = useMemo(
    () => [
      { icon: <Add />, name: 'Add Node', onClick: handleOpenDialog },
      { icon: <Save />, name: 'Save Changes', onClick: saveGraph },
      { icon: <ExitToApp />, name: 'Exit Edit Mode', onClick: exitEditMode },
    ],
    [saveGraph]
  )

  const addDataToGraph = (e: React.FormEvent<HTMLFormElement>) => {
    // TODO: rework this to use server side
    e.preventDefault()
    alert('will add node to graph later')
  }

  return (
    <>
      <SpeedDial ariaLabel="Graph Edit Actions" icon={<Edit />} direction="right">
        {editActions.map(({ icon, name, onClick }, index) => (
          <SpeedDialAction key={index} icon={icon} tooltipTitle={name} arrow onClick={onClick} />
        ))}
      </SpeedDial>
      <Dialog
        open={open}
        onClose={handleCloseDialog}
        PaperProps={{ component: 'form', onSubmit: addDataToGraph }}
      >
        <DialogTitle>Adding Node</DialogTitle>
        <DialogContent>
          <Box>THIS IS UNDER CONSTRUCTION</Box>
          <TextField
            required
            variant="standard"
            type="search"
            name={'nodeTopic'}
            label="Node Name"
            value={inputState.nodeTopic}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button type="submit">Add Node</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmationDialog} onClose={() => setOpenConfirmationDialog(false)}>
        <DialogTitle>Finished Editing?</DialogTitle>
        <DialogContent>{`Don't forget to save changes before exiting!`}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmationDialog(false)}>No</Button>
          <Button color="error" onClick={handleExitWithoutSaving}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default EditGraphActions
