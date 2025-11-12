import { useCallback } from 'react'
import { addEdge, applyNodeChanges, applyEdgeChanges, getOutgoers } from '@xyflow/react'

export const useOnNodesChange = ({ setNodes, setReactFlowData }) => {
  /* source: https://reactflow.dev/learn/concepts/core-concepts */
  // console.log('useOnNodesChange')
  const onNodesChange = useCallback(
    changes => {
      changes.forEach(change => {
        if (change.type === 'remove') {
          setNodes(prev => prev.filter(node => node !== change.id))
        }
      })
      setReactFlowData(prev => {
        return {
          ...prev,
          reactFlowNodes: applyNodeChanges(changes, prev.reactFlowNodes),
        }
      })
    },
    [setReactFlowData]
  )

  return onNodesChange
}

export const useOnEdgesChange = ({ setEdges, setReactFlowData }) => {
  /* source: https://reactflow.dev/learn/concepts/core-concepts */
  const onEdgesChange = useCallback(
    changes => {
      changes.forEach(change => {
        if (change.type !== 'remove') {
          return
        }
        const edgeToRemove = change.id.split('-')
        return setEdges(prev =>
          prev.filter(edge => edge[0] !== edgeToRemove[0] || edge[1] !== edgeToRemove[1])
        )
      })
      setReactFlowData(prev => {
        return {
          ...prev,
          reactFlowEdges: applyEdgeChanges(changes, prev.reactFlowEdges),
        }
      })
    },
    [setReactFlowData]
  )

  return onEdgesChange
}

export const useOnConnect = ({ setReactFlowData, setEdges }) => {
  /* source: https://reactflow.dev/learn/concepts/core-concepts */
  const onConnect = useCallback(
    connection => {
      setEdges(prev => [...prev, [connection.source, connection.target]])
      setReactFlowData(prev => {
        return {
          ...prev,
          reactFlowEdges: addEdge({ ...connection, animated: true }, prev.reactFlowEdges),
        }
      })
    },
    [setReactFlowData]
  )

  return onConnect
}

export const useOnConnectEnd = (screenToFlowPosition, setNodes, setEdges, setReactFlowData) => {
  /* https://reactflow.dev/examples/nodes/add-node-on-edge-drop */
  const onConnectEnd = useCallback(
    (event, connectionState) => {
      // when a connection is dropped on the pane it's not valid
      if (!connectionState.isValid) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event

        // TODO: update nodes and edges states in backend
        // setNodes(nds => [...nds, newNode.id])
        // setEdges(eds => [...eds, [connectionState.fromNode.id, id]])
        setReactFlowData(prev => {
          const id = `${Math.max(...prev.reactFlowNodes.map(node => parseInt(node.id))) + 1}`
          console.log('id:', id)
          return {
            ...prev,
            reactFlowNodes: [
              ...prev.reactFlowNodes,
              {
                id,
                type: 'editableNode',
                position: screenToFlowPosition({
                  x: clientX,
                  y: clientY,
                }),
                data: { label: `New Node`, setReactFlowData },
                origin: [0.5, 0.0],
              },
            ],
            reactFlowEdges: [
              ...prev.reactFlowEdges,
              {
                id,
                source: connectionState.fromNode.id,
                target: id,
                animated: true,
              },
            ],
          }
        })
      }
    },
    [screenToFlowPosition]
  )

  return onConnectEnd
}

export const useIsValidConnection = (getNodes, getEdges, setHasCycle) => {
  /* source: https://reactflow.dev/examples/interaction/prevent-cycles */
  // console.log('in useIsValidConnection')
  const isValidConnection = useCallback(
    connection => {
      // we are using getNodes and getEdges helpers here
      // to make sure we create isValidConnection function only once
      const nodes = getNodes()
      const edges = getEdges()
      const target = nodes.find(node => node.id === connection.target)
      const hasCycle = (node, visited = new Set()) => {
        if (visited.has(node.id)) {
          return false
        }
        visited.add(node.id)

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source) {
            // console.log('outgoer.id === connection.source')
            return true
          }
          if (hasCycle(outgoer, visited)) {
            return true
          }

          return updateNodeLabel
        }
      }

      if (target.id === connection.source) {
        return false
      }
      // setHasCycle(!hasCycle(target))
      return !hasCycle(target)
    },
    [getNodes, getEdges]
  )

  return isValidConnection
}

export const useNodeLabelUpdate = (setReactFlowData, ...nodeData) => {
  const updateNodeLabel = useCallback(() => {
    // updates the label of the node based on the given nodeID
    const [nodeID, newLabel] = nodeData
    setReactFlowData(prev => ({
      ...prev,
      reactFlowNodes: prev.reactFlowNodes.map(node => {
        if (node.id === nodeID) {
          return {
            ...node,
            data: {
              ...node.data,
              label: newLabel,
            },
          }
        }
        return node
      }),
    }))
  }, [setReactFlowData, nodeData])
  return updateNodeLabel
}
