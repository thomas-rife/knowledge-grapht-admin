export const formatNodeData = nodeData => {
  return nodeData.map(node => {
    return {
      id: node,
      type: 'default',
      data: { label: node },
      position: { x: 250, y: 25 },
    }
  })
}

export const formatEdgeData = edgeData => {
  return edgeData.map(edge => {
    return {
      id: `${edge[0]} --> ${edge[1]}`,
      source: edge[0],
      target: edge[1],
      animated: true,
    }
  })
}
