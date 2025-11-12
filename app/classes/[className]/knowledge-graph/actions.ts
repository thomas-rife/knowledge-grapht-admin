'use server'

import { Json } from '@/supabase'
import { createClient } from '@/utils/supabase/server'
import { type Node, type Edge } from '@xyflow/react'

export const getKnowledgeGraphData = async (className: string) => {
  const supabase = createClient()

  const userResponse = await supabase.auth.getUser()
  const user = userResponse.data.user

  if (!user) {
    console.error('User not found')
    return { success: false, error: 'User not found', graphData: null }
  }

  // TODO: probably should make a class_slug column in the classes table and filter by that
  const cleanedClassName = decodeURIComponent(className).replace(/-/g, ' ').trim() // console.log('cleanedClassName: ', cleanedClassName)

  const { data: classID, error } = await supabase
    .from('classes')
    .select('class_id')
    .ilike('name', cleanedClassName)
    .single()

  if (error) {
    console.error('Error fetching class ID: ', error)
    return { success: false, error, graphData: null }
  }

  const { data: graphData, error: graphError } = await supabase
    .from('class_knowledge_graph')
    .select('nodes, edges, react_flow_data')
    .eq('class_id', classID.class_id)
    .single()

  // console.log(classID)
  // console.log('---------> graphData: ', graphData)
  // console.log('---------> length: ', graphData?.length)

  if (graphError) {
    console.error('Error fetching graph data: ', graphError)
    return { success: false, error: graphError, graphData: [] }
  }

  return { success: true, graphData }
}

export const updateKnowledgeGraph = async (
  className: string,
  {
    reactFlowNodes,
    reactFlowEdges,
  }: {
    reactFlowNodes: Node[]
    reactFlowEdges: Edge[]
  }
) => {
  const supabase = createClient()

  const userResponse = await supabase.auth.getUser()
  const user = userResponse.data.user

  if (!user) {
    console.error('User not found')
    return { success: false, error: 'User not found' }
  }

  const cleanedClassName = decodeURIComponent(className).replace(/-/g, ' ').trim()
  // console.log('cleanedClassName: ', cleanedClassName)
  const { data: classID, error } = await supabase
    .from('classes')
    .select('class_id')
    .ilike('name', cleanedClassName)
    .single()

  if (error) {
    console.error('Error fetching class ID: ', error)
    return { success: false, error, graphData: null }
  }

  const updatedGraphData: Json[] = [
    {
      reactFlowNodes: reactFlowNodes as unknown as Json,
      reactFlowEdges: reactFlowEdges as unknown as Json,
    },
  ]
  // Derive simple arrays for nodes (labels) and edges (source->target) so they persist too
  const nodeLabels: string[] = (reactFlowNodes || []).map((n: any) => {
    const label = n?.data?.label
    return typeof label === 'string' ? label : `Topic ${n?.id ?? ''}`
  })

  const edgePairs: string[] = (reactFlowEdges || []).map((e: any) => `${e?.source}->${e?.target}`)

  const { error: updateError } = await supabase.from('class_knowledge_graph').upsert(
    {
      class_id: classID.class_id,
      react_flow_data: updatedGraphData,
      nodes: nodeLabels,
      edges: edgePairs,
    },
    { onConflict: 'class_id' }
  )

  if (updateError) {
    console.error('Error updating graph data: ', updateError)
    return { success: false, error }
  }

  return { success: true }
}

interface CycleResult {
  isValid: boolean
  cycleEdges?: Edge[]
}

export const detectCycle = async (edges: Edge[]): Promise<CycleResult> => {
  const graph = new Map<string, Set<string>>()
  const inDegree = new Map<string, number>()
  const edgeMap = new Map<string, Edge>()

  // initialize all nodes and create edge lookup map
  edges.forEach(edge => {
    const edgeKey = `${edge.source}->${edge.target}`
    edgeMap.set(edgeKey, edge)

    if (!graph.has(edge.source)) {
      graph.set(edge.source, new Set())
      inDegree.set(edge.source, 0)
    }

    if (!graph.has(edge.target)) {
      graph.set(edge.target, new Set())
      inDegree.set(edge.target, 0)
    }
  })

  // Build the graph and count in-degrees
  edges.forEach(edge => {
    graph.get(edge.source)!.add(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
  })

  const visited = new Set<string>()
  const inStack = new Set<string>()
  const cycleEdges: Edge[] = []

  // DFS function to find the actual cycle
  const findCycle = (node: string, path: Edge[] = []): boolean => {
    if (inStack.has(node)) {
      // cycle found
      const cycleStartIndex = path.findIndex(edge => edge.source === node)
      cycleEdges.push(...path.slice(cycleStartIndex))
      return true
    }

    if (visited.has(node)) {
      return false
    }

    visited.add(node)
    inStack.add(node)

    const neighbors = graph.get(node) || new Set()
    for (const neighbor of neighbors) {
      const edgeKey = `${node}->${neighbor}`
      const edge = edgeMap.get(edgeKey)
      if (edge) {
        if (findCycle(neighbor, [...path, edge])) {
          return true
        }
      }
    }

    inStack.delete(node)
    return false
  }

  for (const node of graph.keys()) {
    if (!visited.has(node) && findCycle(node)) {
      return {
        isValid: false,
        cycleEdges,
      }
    }
  }

  return {
    isValid: true,
  }
}
