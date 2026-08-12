"use client";

import {
  Box,
  Button,
  IconButton,
  Radio,
  TextField,
  Typography,
} from "@mui/material";
import { Add, DeleteOutline } from "@mui/icons-material";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { python } from "@codemirror/lang-python";
import { useEffect, useMemo, useState } from "react";
import TopicPicker from "@/components/questions/topic-picker";
import { GraphTopic } from "@/types/content.types";

export const createDefaultAnswerOptions = () => ["", "", "", ""];

export const normalizeAnswerOptionKey = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();

export const getDuplicateAnswerOptionIndexes = (options: string[]) => {
  const indexesByValue = new Map<string, number[]>();

  options.forEach((option, index) => {
    const key = normalizeAnswerOptionKey(option);
    if (!key) return;
    indexesByValue.set(key, [...(indexesByValue.get(key) ?? []), index]);
  });

  return new Set(
    Array.from(indexesByValue.values())
      .filter((indexes) => indexes.length > 1)
      .flat(),
  );
};

const QuestionEditor = ({
  prompt,
  onPromptChange,
  snippet,
  onSnippetChange,
  options,
  onOptionsChange,
  correctAnswer,
  onCorrectAnswerChange,
  topics,
  selectedTopicNodeIds,
  onSelectedTopicNodeIdsChange,
  imageUrl,
  onImageUrlChange,
  topicsLoading = false,
  preferredTopicNodeIds = [],
  disabled = false,
  autoFocus = false,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  snippet: string;
  onSnippetChange: (value: string) => void;
  options: string[];
  onOptionsChange: (values: string[]) => void;
  correctAnswer: string;
  onCorrectAnswerChange: (value: string) => void;
  topics: GraphTopic[];
  selectedTopicNodeIds: string[];
  onSelectedTopicNodeIdsChange: (nodeIds: string[]) => void;
  imageUrl: string;
  onImageUrlChange: (value: string) => void;
  topicsLoading?: boolean;
  preferredTopicNodeIds?: string[];
  disabled?: boolean;
  autoFocus?: boolean;
}) => {
  const [snippetVisible, setSnippetVisible] = useState(Boolean(snippet));

  useEffect(() => {
    if (snippet) setSnippetVisible(true);
  }, [snippet]);

  const duplicateOptionIndexes = useMemo(
    () => getDuplicateAnswerOptionIndexes(options),
    [options],
  );

  const updateOption = (index: number, value: string) => {
    const previousValue = options[index] ?? "";
    const nextOptions = [...options];
    nextOptions[index] = value;
    onOptionsChange(nextOptions);

    if (correctAnswer === previousValue) {
      onCorrectAnswerChange(value);
    }
  };

  const removeOption = (index: number) => {
    const removedValue = options[index] ?? "";
    const nextOptions = options.filter((_, optionIndex) => optionIndex !== index);
    onOptionsChange(nextOptions);
    if (correctAnswer === removedValue) onCorrectAnswerChange("");
  };

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
      <TextField
        autoFocus={autoFocus}
        required
        multiline
        minRows={3}
        label="Question prompt"
        placeholder="Enter the question students will answer"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        disabled={disabled}
        fullWidth
      />

      <TopicPicker
        topics={topics}
        value={selectedTopicNodeIds}
        onChange={onSelectedTopicNodeIdsChange}
        label="Topics covered"
        loading={topicsLoading}
        disabled={disabled}
        columns={2}
        preferredTopicNodeIds={preferredTopicNodeIds}
      />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Answer options
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1.5,
          }}
        >
          {options.map((option, index) => (
            <Box
              key={index}
              sx={{
                minWidth: 0,
                display: "grid",
                gridTemplateColumns: "40px minmax(0, 1fr) 36px",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <Radio
                required
                name="correct-answer"
                checked={Boolean(option.trim()) && correctAnswer === option}
                onChange={() => onCorrectAnswerChange(option)}
                disabled={disabled || !option.trim()}
                inputProps={{
                  "aria-label": `Mark option ${index + 1} as correct`,
                }}
              />
              <TextField
                required
                label={`Option ${index + 1}`}
                value={option}
                onChange={(event) => updateOption(index, event.target.value)}
                disabled={disabled}
                error={duplicateOptionIndexes.has(index)}
                helperText={
                  duplicateOptionIndexes.has(index)
                    ? "Answer options must be different"
                    : undefined
                }
                fullWidth
              />
              <IconButton
                aria-label={`Remove option ${index + 1}`}
                color="error"
                size="small"
                disabled={disabled || options.length <= 2}
                onClick={() => removeOption(index)}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
        <Button
          startIcon={<Add />}
          onClick={() => onOptionsChange([...options, ""])}
          disabled={disabled || options.length >= 10}
          sx={{ mt: 1 }}
        >
          Add option
        </Button>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Optional content
        </Typography>
        {snippetVisible ? (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <CodeMirror
                value={snippet}
                onChange={onSnippetChange}
                height="200px"
                width="100%"
                extensions={[python(), EditorView.editable.of(!disabled)]}
                theme={oneDark}
              />
            </Box>
            <Button
              color="error"
              onClick={() => {
                onSnippetChange("");
                setSnippetVisible(false);
              }}
              disabled={disabled}
            >
              Remove snippet
            </Button>
          </Box>
        ) : (
          <Button onClick={() => setSnippetVisible(true)} disabled={disabled}>
            Add code snippet
          </Button>
        )}

        <TextField
          label="Image URL"
          value={imageUrl}
          onChange={(event) => onImageUrlChange(event.target.value)}
          disabled={disabled}
          fullWidth
          sx={{ mt: 1.5 }}
        />
        {imageUrl.trim() && (
          <Box sx={{ mt: 1.5, display: "flex", justifyContent: "center" }}>
            <img
              key={imageUrl}
              src={imageUrl}
              alt="Question preview"
              style={{
                maxHeight: 180,
                maxWidth: "100%",
                objectFit: "contain",
                borderRadius: 12,
              }}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default QuestionEditor;
