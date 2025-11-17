import { useCallback } from "react";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  getOutgoers,
} from "@xyflow/react";

export const useOnNodesChange = ({ setNodes, setReactFlowData }) => {
  /* source: https://reactflow.dev/learn/concepts/core-concepts */
  // console.log('useOnNodesChange')
  const onNodesChange = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === "remove") {
          setNodes((prev) => prev.filter((node) => node !== change.id));
        }
      });
      setReactFlowData((prev) => {
        return {
          ...prev,
          reactFlowNodes: applyNodeChanges(changes, prev.reactFlowNodes),
        };
      });
    },
    [setReactFlowData]
  );

  return onNodesChange;
};

export const useOnEdgesChange = ({ setEdges, setReactFlowData }) => {
  /* source: https://reactflow.dev/learn/concepts/core-concepts */
  const onEdgesChange = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type !== "remove") {
          return;
        }
        const edgeToRemove = change.id.split("-");
        return setEdges((prev) =>
          prev.filter(
            (edge) => edge[0] !== edgeToRemove[0] || edge[1] !== edgeToRemove[1]
          )
        );
      });
      setReactFlowData((prev) => {
        return {
          ...prev,
          reactFlowEdges: applyEdgeChanges(changes, prev.reactFlowEdges),
        };
      });
    },
    [setReactFlowData]
  );

  return onEdgesChange;
};

export const useOnConnect = ({ setReactFlowData, setEdges }) => {
  /* source: https://reactflow.dev/learn/concepts/core-concepts */
  const onConnect = useCallback(
    (connection) => {
      setEdges((prev) => [...prev, [connection.source, connection.target]]);
      setReactFlowData((prev) => {
        return {
          ...prev,
          reactFlowEdges: addEdge(
            { ...connection, animated: true },
            prev.reactFlowEdges
          ),
        };
      });
    },
    [setReactFlowData]
  );

  return onConnect;
};

export const useOnConnectEnd = (
  screenToFlowPosition,
  setNodes,
  setEdges,
  setReactFlowData
) => {
  /* https://reactflow.dev/examples/nodes/add-node-on-edge-drop */
  const onConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid) {
        const { clientX, clientY } =
          "changedTouches" in event ? event.changedTouches[0] : event;

        setReactFlowData((prev) => {
          const id = `${
            Math.max(...prev.reactFlowNodes.map((node) => parseInt(node.id))) +
            1
          }`;

          const funWords = [
            "Noodle",
            "Pickle",
            "Burrito",
            "Pancake",
            "Waffle",
            "Muffin",
            "Cookie",
            "Cupcake",
            "Brownie",
            "Pretzel",
            "Donut",
            "Bagel",
            "Taco",
            "Nacho",
            "Pizza",
            "Burger",
            "Fries",
            "Popcorn",
            "Popsicle",
            "Smoothie",
            "Sundae",
            "Milkshake",
            "Marshmallow",
            "Gumdrop",
            "Jellybean",
            "Caramel",
            "Cheesecake",
            "Croissant",
            "Granola",
            "Cereal",
            "Strawberry",
            "Blueberry",
            "Mango",
            "Pineapple",
            "Avocado",
            "Peach",
            "Apple Pie",
            "Dumpling",
            "Ramen",
            "Sushi",
          ];

          const existingLabels = prev.reactFlowNodes.map(
            (n) => n.data?.label || ""
          );

          let nodeName;
          let attempts = 0;
          do {
            const randomWord =
              funWords[Math.floor(Math.random() * funWords.length)];
            nodeName = randomWord;
            attempts++;
            // If word exists, add a number
            if (existingLabels.includes(nodeName)) {
              let counter = 1;
              while (existingLabels.includes(`${randomWord} ${counter}`)) {
                counter++;
              }
              nodeName = `${randomWord} ${counter}`;
            }
          } while (existingLabels.includes(nodeName) && attempts < 100);

          console.log("Creating node with name:", nodeName);

          return {
            ...prev,
            reactFlowNodes: [
              ...prev.reactFlowNodes,
              {
                id,
                type: "editableNode",
                position: screenToFlowPosition({
                  x: clientX,
                  y: clientY,
                }),
                data: { label: nodeName, setReactFlowData },
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
          };
        });
      }
    },
    [screenToFlowPosition]
  );

  return onConnectEnd;
};

export const useIsValidConnection = (getNodes, getEdges, setHasCycle) => {
  /* source: https://reactflow.dev/examples/interaction/prevent-cycles */
  // console.log('in useIsValidConnection')
  const isValidConnection = useCallback(
    (connection) => {
      // we are using getNodes and getEdges helpers here
      // to make sure we create isValidConnection function only once
      const nodes = getNodes();
      const edges = getEdges();
      const target = nodes.find((node) => node.id === connection.target);
      const hasCycle = (node, visited = new Set()) => {
        if (visited.has(node.id)) {
          return false;
        }
        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source) {
            // console.log('outgoer.id === connection.source')
            return true;
          }
          if (hasCycle(outgoer, visited)) {
            return true;
          }

          return updateNodeLabel;
        }
      };

      if (target.id === connection.source) {
        return false;
      }
      // setHasCycle(!hasCycle(target))
      return !hasCycle(target);
    },
    [getNodes, getEdges]
  );

  return isValidConnection;
};

export const useNodeLabelUpdate = (setReactFlowData, ...nodeData) => {
  const updateNodeLabel = useCallback(() => {
    // updates the label of the node based on the given nodeID
    const [nodeID, newLabel] = nodeData;
    setReactFlowData((prev) => ({
      ...prev,
      reactFlowNodes: prev.reactFlowNodes.map((node) => {
        if (node.id === nodeID) {
          return {
            ...node,
            data: {
              ...node.data,
              label: newLabel,
            },
          };
        }
        return node;
      }),
    }));
  }, [setReactFlowData, nodeData]);
  return updateNodeLabel;
};
