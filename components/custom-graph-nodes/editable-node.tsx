"use client";

import {
  Paper,
  Menu,
  MenuItem,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Box,
} from "@mui/material";
import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { useNodeLabelUpdate } from "@/hooks/knowledgeGraphHooks";

interface ReactFlowData {
  reactFlowNodes: Array<{ id: string }>;
  reactFlowEdges: Array<{ source: string; target: string }>;
}

const EditableNode = ({
  id,
  data,
  isConnectable,
}: {
  id: string;
  data: {
    label: string;
    accuracy?: number | null;
    attempts?: number;
    readOnly?: boolean;
    setReactFlowData: (
      callback: (prev: ReactFlowData) => ReactFlowData,
    ) => void;
  };
  isConnectable: boolean;
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [openNodeDialog, setOpenNodeDialog] = useState(false);
  const [nodeName, setNodeName] = useState(data.label);
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const updateNodeLabel = useNodeLabelUpdate(
    data.setReactFlowData,
    id,
    nodeName,
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setIsMenuOpen(true);
    setAnchorElement(event.currentTarget);
  };

  const validateNodeName = (name: string) => {
    if (name.trim().length === 0) {
      setIsValid(false);
      setErrorMessage("Node name cannot be empty");
      return false;
    }
    if (name.length > 100) {
      setIsValid(false);
      setErrorMessage("Node name must be less than 100 characters");
      return false;
    }
    setIsValid(true);
    setErrorMessage("");
    return true;
  };

  const handleSave = () => {
    if (validateNodeName(nodeName)) {
      updateNodeLabel();
      handleMenuClose();
      handleCloseDialog();
    }
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
    setAnchorElement(null);
  };

  const handleEditNode = () => {
    setOpenNodeDialog(true);
  };

  const handleDeleteNode = () => {
    data.setReactFlowData((prev: ReactFlowData) => {
      const newNodes = prev.reactFlowNodes.filter(
        (node: { id: string }) => node.id !== id,
      );
      const newEdges = prev.reactFlowEdges.filter(
        (edge: { source: string; target: string }) =>
          edge.source !== id && edge.target !== id,
      );
      return { reactFlowNodes: newNodes, reactFlowEdges: newEdges };
    });
  };

  const handleCloseDialog = () => setOpenNodeDialog(false);

  const accuracyPercent =
    data.accuracy != null ? Math.round(data.accuracy * 100) : null;

  const getAccuracyColor = (percent: number) => {
    if (percent >= 70) return "success.main";
    if (percent >= 50) return "warning.main";
    return "error.main";
  };

  return (
    <div className="editable-node" style={{ position: "relative" }}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="node-handle top-handle"
        style={{
          width: "8px",
          height: "8px",
          background: "currentColor",
          border: "1.5px solid",
          borderColor: "background.paper",
          borderRadius: "50%",
          transition: "all 0.2s ease-out",
          opacity: 0.6,
          zIndex: 1,
          top: "-4px",
        }}
      />

      {accuracyPercent != null && data.attempts && data.attempts > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: -8,
            right: -8,
            backgroundColor: getAccuracyColor(accuracyPercent),
            color: "white",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            border: "0px solid",
            borderColor: "background.paper",
            zIndex: 10,
            boxShadow: 2,
          }}
        >
          {accuracyPercent}%
        </Box>
      )}

      <Tooltip
        title="Click to edit or delete"
        arrow
        placement="bottom"
        enterDelay={500}
      >
        <Paper
          elevation={8}
          onClick={(e) => !data.readOnly && handleClick(e)}
          sx={{
            padding: 1.5,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "3.5em",
            minWidth: "12em",
            borderRadius: "12px",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            border: "2px solid",
            borderColor: "divider",
            cursor: data.readOnly ? "default" : "pointer",
            animation: "nodeEntrance 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              transform: data.readOnly ? "none" : "scale(1.02)",
              borderColor: data.readOnly ? "divider" : "primary.main",
              borderWidth: "2px",
            },
            "&:active": {
              transform: data.readOnly ? "none" : "scale(0.98)",
            },
            "@keyframes nodeEntrance": {
              "0%": {
                opacity: 0,
                transform: "scale(0.8)",
              },
              "100%": {
                opacity: 1,
                transform: "scale(1)",
              },
            },
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              textAlign: "center",
              wordBreak: "break-word",
            }}
          >
            {data.label}
          </Typography>
        </Paper>
      </Tooltip>

      {!data.readOnly && (
        <Menu
          open={isMenuOpen}
          onClose={handleMenuClose}
          anchorEl={anchorElement}
          PaperProps={{
            elevation: 3,
            sx: {
              borderRadius: "8px",
              minWidth: "120px",
            },
          }}
        >
          <MenuItem onClick={handleEditNode}>Edit</MenuItem>
          <MenuItem onClick={handleDeleteNode} sx={{ color: "error.main" }}>
            Delete
          </MenuItem>
        </Menu>
      )}

      <Dialog
        open={openNodeDialog}
        onClose={handleCloseDialog}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            minWidth: "350px",
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
          Edit Node
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 2 }}>
          <TextField
            required
            fullWidth
            label="Node Name"
            value={nodeName}
            onChange={(e) => {
              setNodeName(e.target.value);
              validateNodeName(e.target.value);
            }}
            error={!isValid}
            helperText={errorMessage || `${nodeName.length}/100 characters`}
            variant="outlined"
            sx={{ mt: 1 }}
            inputProps={{ maxLength: 100 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions
          sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}
        >
          <Button
            onClick={handleCloseDialog}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!isValid}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        isConnectable={isConnectable}
        className="node-handle bottom-handle"
        style={{
          width: "8px",
          height: "8px",
          background: "currentColor",
          border: "1.5px solid",
          borderColor: "background.paper",
          borderRadius: "50%",
          transition: "all 0.2s ease-out",
          opacity: 0.6,
          bottom: "-4px",
        }}
      />

      <style jsx global>{`
        .node-handle {
          transform: translate(-50%, 0);
        }
        .node-handle:hover {
          opacity: 1 !important;
          transform: translate(-50%, 0) scale(1.2) !important;
        }
        .top-handle {
          top: -4px !important;
        }
        .bottom-handle {
          bottom: -4px !important;
        }
      `}</style>
    </div>
  );
};

export default EditableNode;
