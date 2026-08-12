"use client";

import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useMemo, useState } from "react";
import { GraphTopic } from "@/types/content.types";

const MAX_VISIBLE_CHIPS = 8;

const TopicPicker = ({
  topics,
  value,
  onChange,
  label = "Topics",
  loading = false,
  disabled = false,
  columns = 2,
  preferredTopicNodeIds = [],
}: {
  topics: GraphTopic[];
  value: string[];
  onChange: (topicNodeIds: string[]) => void;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  columns?: 2 | 3;
  preferredTopicNodeIds?: string[];
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const hasPreferredScope = preferredTopicNodeIds.length > 0;

  const filteredTopics = useMemo(
    () =>
      topics.filter(
        (topic) =>
          (showAllTopics ||
            !hasPreferredScope ||
            preferredTopicNodeIds.includes(topic.id)) &&
          topic.label.toLowerCase().includes(normalizedSearch),
      ),
    [
      hasPreferredScope,
      normalizedSearch,
      preferredTopicNodeIds,
      showAllTopics,
      topics,
    ],
  );
  const selectedTopics = value
    .map((nodeId) => topics.find((topic) => topic.id === nodeId))
    .filter((topic): topic is GraphTopic => Boolean(topic));

  const toggleTopic = (nodeId: string) => {
    onChange(
      value.includes(nodeId)
        ? value.filter((selectedId) => selectedId !== nodeId)
        : [...value, nodeId],
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 1,
        }}
      >
        <Typography variant="subtitle2">{label}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {value.length} selected
          </Typography>
          {value.length > 0 && (
            <Button
              size="small"
              color="inherit"
              onClick={() => onChange([])}
              disabled={disabled}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>

      {hasPreferredScope && (
        <ToggleButtonGroup
          value={showAllTopics ? "all" : "lesson"}
          exclusive
          size="small"
          onChange={(_, scope) => {
            if (scope) setShowAllTopics(scope === "all");
          }}
          disabled={disabled}
          sx={{ mb: 1 }}
        >
          <ToggleButton value="lesson">Lesson topics</ToggleButton>
          <ToggleButton value="all">All course topics</ToggleButton>
        </ToggleButtonGroup>
      )}

      <TextField
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search topics"
        size="small"
        fullWidth
        disabled={disabled}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 1 }}
      />

      <Box
        sx={{
          minHeight: 150,
          maxHeight: 260,
          overflowY: "auto",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          p: 1,
          backgroundColor: "background.default",
        }}
      >
        {loading ? (
          <Box
            sx={{
              minHeight: 130,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={26} />
          </Box>
        ) : filteredTopics.length ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: 0.5,
            }}
          >
            {filteredTopics.map((topic) => (
              <Box
                component="label"
                key={topic.id}
                sx={{
                  minWidth: 0,
                  minHeight: 40,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 0.75,
                  borderRadius: 1,
                  cursor: disabled ? "default" : "pointer",
                  "&:hover": {
                    backgroundColor: disabled ? undefined : "action.hover",
                  },
                }}
              >
                <Checkbox
                  size="small"
                  checked={value.includes(topic.id)}
                  onChange={() => toggleTopic(topic.id)}
                  disabled={disabled}
                />
                <Typography
                  variant="body2"
                  sx={{ minWidth: 0, overflowWrap: "anywhere" }}
                >
                  {topic.label}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              minHeight: 130,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {topics.length ? "No matching topics" : "No topics available"}
            </Typography>
          </Box>
        )}
      </Box>

      {selectedTopics.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
          {selectedTopics.slice(0, MAX_VISIBLE_CHIPS).map((topic) => (
            <Chip
              key={topic.id}
              label={topic.label}
              size="small"
              onDelete={disabled ? undefined : () => toggleTopic(topic.id)}
            />
          ))}
          {selectedTopics.length > MAX_VISIBLE_CHIPS && (
            <Chip
              label={`+${selectedTopics.length - MAX_VISIBLE_CHIPS} more`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default TopicPicker;
