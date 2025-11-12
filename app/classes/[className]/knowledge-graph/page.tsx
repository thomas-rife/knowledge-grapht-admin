'use client'

import { Box, Button, IconButton, Skeleton, Snackbar, Alert } from '@mui/material'
import { Help } from '@mui/icons-material'
import {
  type Node,
  type Edge,
  type NodeChange,
  ReactFlow,
  Background,
  useReactFlow,
  ReactFlowProvider,
  MiniMap,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import React, { useState, useEffect, useContext } from 'react'
import {
  useOnNodesChange,
  useOnEdgesChange,
  useOnConnect,
  useOnConnectEnd,
} from '@/hooks/knowledgeGraphHooks'
import {
  getKnowledgeGraphData,
  updateKnowledgeGraph,
} from '@/app/classes/[className]/knowledge-graph/actions'
import EditableNode from '@/components/custom-graph-nodes/editable-node'
import HelperCard from '@/app/classes/[className]/knowledge-graph/helper-card'
import EditGraphActions from '@/app/classes/[className]/knowledge-graph/edit-graph-actions'
import KnowledgeGraphSkeleton from '@/components/skeletons/knowledge-graph-skeleton'
import { ViewModeContext } from '@/contexts/viewmode-context'
import { Json } from '@/supabase'

interface GraphDataResponse {
  success: boolean
  graphData:
    | {
        nodes: string[]
        edges: string[]
        react_flow_data: Json[]
      }
    | null
    | never[]
  error?: string | any
}

interface FlowData {
  reactFlowNodes: FlowNode[]
  reactFlowEdges: Edge[]
}

interface FlowNode extends Node {
  id: string
  data: {
    label: string
    setReactFlowData: any
  }
}

const nodeTypes = { editableNode: EditableNode }

interface KnowledgeGraphInteractionProps {
  nodesDraggable: boolean
  nodesConnectable: boolean
  elementsSelectable: boolean
}

const intialInteractionProps: KnowledgeGraphInteractionProps = {
  nodesDraggable: false,
  nodesConnectable: false,
  elementsSelectable: false,
}

const KnowledgeGraph = ({ className }: { className: string }) => {
  const [nodes, setNodes] = useState<string[]>([])
  const [edges, setEdges] = useState<string[]>([])
  const { settings } = useContext(ViewModeContext)

  // I plan to use this state to show a warning message when a cycle is detected
  // const [hasCycle, setHasCycle] = useState<boolean>(false)
  const [reactFlowData, setReactFlowData] = useState<{
    reactFlowNodes: Node[]
    reactFlowEdges: Edge[]
  } | null>(null)
  const [inEditMode, setInEditMode] = useState<boolean>(false)
  const [interactionProps, setInteractionProps] =
    useState<KnowledgeGraphInteractionProps>(intialInteractionProps)
  const [dirty, setDirty] = useState<boolean>(false)

  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })
  const showToast = (message: string, severity: 'success' | 'error' = 'success') =>
    setToast({ open: true, message, severity })

  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow()

  const baseOnNodesChange = useOnNodesChange({ setNodes, setReactFlowData })
  const baseOnEdgesChange = useOnEdgesChange({ setEdges, setReactFlowData })
  const baseOnConnect = useOnConnect({ setReactFlowData, setEdges })
  const baseOnConnectEnd = useOnConnectEnd(
    screenToFlowPosition,
    setNodes,
    setEdges,
    setReactFlowData
  )

  const onEdgesChange = (changes: any) => {
    baseOnEdgesChange(changes)
    if (inEditMode) setDirty(true)
  }
  const onConnect = (connection: any) => {
    baseOnConnect(connection)
    if (inEditMode) setDirty(true)
  }
  const onConnectEnd = (...args: any[]) => {
    ;(baseOnConnectEnd as any)(...args)
    if (inEditMode) setDirty(true)
  }

  // Remove non-serializable fields before saving to Supabase
  const sanitizeForStorage = (nodesIn: Node[], edgesIn: Edge[]) => {
    const cleanNodes: Node[] = (nodesIn || []).map((n: any) => ({
      ...n,
      data: { label: n?.data?.label ?? `Topic ${n?.id ?? ''}` },
    }))
    const cleanEdges: Edge[] = (edgesIn || []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      markerEnd: e.markerEnd,
      markerStart: e.markerStart,
      animated: e.animated,
      selected: false,
    }))
    return { cleanNodes, cleanEdges }
  }

  const onNodesChange = (changes: NodeChange[]) => {
    if (inEditMode) setDirty(true)
    baseOnNodesChange(changes)
    const added = Array.isArray(changes) && changes.some(c => c.type === 'add')
    if (!added) return

    // Wait for state to settle, then read current graph and save
    requestAnimationFrame(async () => {
      const currentNodes = getNodes()
      const currentEdges = getEdges()
      const { cleanNodes, cleanEdges } = sanitizeForStorage(
        currentNodes as unknown as Node[],
        currentEdges as unknown as Edge[]
      )
      try {
        const result = await updateKnowledgeGraph(className, {
          reactFlowNodes: cleanNodes,
          reactFlowEdges: cleanEdges,
        })
        if (!result?.success) {
          console.error('Persisting added node failed:', result?.error)
          return
        }
        // Reattach setter so editing continues to work
        setReactFlowData({
          reactFlowNodes: cleanNodes.map((node: any) => ({
            ...node,
            data: { ...node.data, setReactFlowData },
          })),
          reactFlowEdges: cleanEdges,
        })
        setDirty(false) // added node persisted successfully
        console.log('Node creation persisted to Supabase')
      } catch (e) {
        console.error('Persisting added node failed', e)
      }
    })
  }

  const enterEditMode = () => {
    setInEditMode(true)
    setInteractionProps({
      nodesDraggable: true,
      nodesConnectable: true,
      elementsSelectable: true,
    })
  }

  const saveGraph = async () => {
    if (!reactFlowData) return
    try {
      // Strip non-serializable fields (like setReactFlowData) before saving
      const cleanNodes: Node[] = (reactFlowData.reactFlowNodes || []).map((n: any) => ({
        ...n,
        data: { label: n?.data?.label ?? `Topic ${n?.id ?? ''}` },
      }))
      const cleanEdges: Edge[] = (reactFlowData.reactFlowEdges || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        markerEnd: e.markerEnd,
        markerStart: e.markerStart,
        animated: e.animated,
        selected: false,
      }))

      const result = await updateKnowledgeGraph(className, {
        reactFlowNodes: cleanNodes,
        reactFlowEdges: cleanEdges,
      })
      if (!result?.success) {
        console.error('Save graph failed:', result?.error)
        return
      }

      // Reattach setter to in-memory nodes so further edits work
      setReactFlowData({
        reactFlowNodes: cleanNodes.map((node: any) => ({
          ...node,
          data: { ...node.data, setReactFlowData },
        })),
        reactFlowEdges: cleanEdges,
      })
      showToast('Saved')
      setDirty(false)

      console.log('Graph saved')
    } catch (e) {
      console.error('Save graph failed', e)
    }
  }

  const handleNodesDelete = async (deleted: Node[]) => {
    if (!reactFlowData || !Array.isArray(deleted)) return

    const deletedIds = new Set(deleted.map(n => String(n.id)))

    const nextNodesRaw = reactFlowData.reactFlowNodes.filter(n => !deletedIds.has(String(n.id)))
    const nextEdgesRaw = reactFlowData.reactFlowEdges.filter(
      e => !deletedIds.has(String(e.source)) && !deletedIds.has(String(e.target))
    )

    try {
      const cleanNodes: Node[] = (nextNodesRaw || []).map((n: any) => ({
        ...n,
        data: { label: n?.data?.label ?? `Topic ${n?.id ?? ''}` },
      }))
      const cleanEdges: Edge[] = (nextEdgesRaw || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        markerEnd: e.markerEnd,
        markerStart: e.markerStart,
        animated: e.animated,
        selected: false,
      }))

      const result = await updateKnowledgeGraph(className, {
        reactFlowNodes: cleanNodes,
        reactFlowEdges: cleanEdges,
      })
      if (!result?.success) {
        console.error('Persisting delete failed:', result?.error)
      }

      // Update local state with setter reattached so UI keeps working
      setReactFlowData({
        reactFlowNodes: cleanNodes.map((node: any) => ({
          ...node,
          data: { ...node.data, setReactFlowData },
        })),
        reactFlowEdges: cleanEdges,
      })
      showToast('Saved')
      setDirty(false)

      console.log('Graph updated after delete')
    } catch (e) {
      console.error('Persisting delete failed', e)
    }
  }

  useEffect(() => {
    const fetchClassGraphData = async () => {
      const response: GraphDataResponse = await getKnowledgeGraphData(className)

      if (response.success && response.graphData && 'nodes' in response.graphData) {
        const { nodes, edges, react_flow_data } = response.graphData
        setNodes(nodes)
        setEdges(edges)

        if (react_flow_data && Array.isArray(react_flow_data) && react_flow_data[0]) {
          try {
            const flowData = react_flow_data[0] as unknown as FlowData
            if ('reactFlowNodes' in flowData && 'reactFlowEdges' in flowData) {
              setReactFlowData({
                reactFlowNodes: flowData.reactFlowNodes.map((nodeData: FlowNode) => ({
                  ...nodeData,
                  id: nodeData.id,
                  data: { ...nodeData.data, setReactFlowData },
                })),
                reactFlowEdges: flowData.reactFlowEdges,
              })
            }
          } catch (error) {
            console.error('Error parsing react flow data:', error)
          }
        }
      }
    }

    fetchClassGraphData()
  }, [className])

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  return (
    <>
      {reactFlowData ? (
        <>
          {reactFlowData.reactFlowNodes.length === 0 ? (
            <Box
              sx={{
                height: '80vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <h1>No graph found</h1>
            </Box>
          ) : (
            <ReactFlow
              nodes={reactFlowData.reactFlowNodes}
              edges={reactFlowData.reactFlowEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd}
              nodeTypes={nodeTypes}
              onNodesDelete={handleNodesDelete}
              nodesDraggable={interactionProps.nodesDraggable}
              nodesConnectable={interactionProps.nodesConnectable}
              elementsSelectable={interactionProps.elementsSelectable}
              colorMode={settings.viewMode}
              nodeOrigin={[0.5, 0]}
              fitView
            >
              {inEditMode && <Background gap={20} />}
              <MiniMap />
            </ReactFlow>
          )}
        </>
      ) : (
        <KnowledgeGraphSkeleton />
      )}
      <Box
        id="helper-card"
        sx={{
          display: 'flex',
          position: 'fixed',
          top: 70,
          left: 65,
        }}
      >
        {reactFlowData ? (
          <HelperCard />
        ) : (
          <Box id="button" sx={{ paddingTop: 1, paddingLeft: 1 }}>
            <Skeleton variant="circular">
              <IconButton>
                <Help id="help-button" color="info" fontSize="large" />
              </IconButton>
            </Skeleton>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          position: 'fixed',
          bottom: 45,
          left: 80,
        }}
      >
        {inEditMode ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={async () => {
                await saveGraph()
                setInEditMode(false)
                setInteractionProps(intialInteractionProps)
              }}
              disabled={!reactFlowData || !reactFlowData.reactFlowNodes?.length}
            >
              Save your graph
            </Button>
          </Box>
        ) : reactFlowData ? (
          <Button variant="contained" color="success" onClick={enterEditMode}>
            Edit Graph
          </Button>
        ) : (
          <Skeleton>
            <Button variant="contained" color="success" onClick={enterEditMode}>
              Edit Graph
            </Button>
          </Skeleton>
        )}
      </Box>
      {inEditMode && dirty && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1500,
            minWidth: 360,
            maxWidth: '80vw',
          }}
        >
          <Alert severity="warning" variant="filled" sx={{ boxShadow: 2 }}>
            You have unsaved changes. Click <strong>Save your graph</strong> to persist.
          </Alert>
        </Box>
      )}
      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast(t => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default function KnowledgeGraphWrapper({ params }: { params: { className: string } }) {
  return (
    <ReactFlowProvider>
      <KnowledgeGraph className={params.className} />
    </ReactFlowProvider>
  )
}
