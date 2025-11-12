'use client'

import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { python } from '@codemirror/lang-python'
import {
  Box,
  Menu,
  MenuItem,
  Button,
  IconButton,
  TextField,
  FormControl,
  Checkbox,
  InputLabel,
  Select,
  type SelectChangeEvent,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Typography,
} from '@mui/material'
import { useState, useEffect, useRef } from 'react'
import { Lock, LockOpen as Unlock, Delete, Add } from '@mui/icons-material'
import { useQuestionContext } from '@/contexts/question-context'

const mockTopics = ['topic 1', 'topic 2', 'topic 3', 'topic 4', 'topic 5', 'topic 6', 'topic 7']
const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
}

const RearrangeQuestion = () => {
  const editorRef = useRef<EditorView | null>(null)
  const [editorLocked, setEditorLocked] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null)
  const [distractorTokenDialogue, setDistractorTokenDialogue] = useState(false)
  const [distractorToken, setDistractorToken] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const {
    questionID,
    questionPrompt,
    setQuestionPrompt,
    questionSnippet,
    setQuestionSnippet,
    questionOptions,
    setQuestionOptions,
    correctAnswer,
    setCorrectAnswer,
    topicsCovered,
    setTopicsCovered,
  } = useQuestionContext()

  const handleQuestionPromptInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestionPrompt(e.target.value)
  }

  const handleEditorLoad = (view: EditorView) => {
    editorRef.current = view
  }

  const handleSnippetInput = (value: string) => {
    setQuestionSnippet(value)
    setCorrectAnswer(value)
  }

  const handleTokenCreation = () => {
    if (!editorRef.current) return

    const view = editorRef.current
    const state = view.state

    const { from: startIndex, to: endIndex } = state.selection.main
    const selectedText = state.sliceDoc(startIndex, endIndex)

    if (selectedText.trim().length === 0) {
      setValidationError('No text selected. Please select a range of text to create a token')
      return
    }

    const range = [...Array(endIndex - startIndex)].map((_, i) => startIndex + i)

    if (handleTokenOverlapDetection(range)) {
      setValidationError('Token overlap detected. Please select a different range of text')
      return
    }

    setQuestionOptions([
      ...questionOptions,
      { text: selectedText, position: [startIndex, endIndex], range: range },
    ])

    setValidationError(null)
    setContextMenu(null)
  }

  const handleAddDistractorToken = () => {
    if (!distractorToken.trim()) {
      setValidationError('Distractor token cannot be empty')
      return
    }

    setQuestionOptions([
      ...questionOptions,
      { text: distractorToken, position: [-1, -1], range: [], isDistractor: true },
    ])

    setDistractorToken('')
    setDistractorTokenDialogue(false)
    setValidationError(null)
  }

  const handleTokenOverlapDetection = (tokenCandidatePosition: number[]) => {
    return questionOptions.some(({ range }) => {
      if (!range) return false
      return range.some((index: number) => tokenCandidatePosition.includes(index))
    })
  }

  const handleRemoveToken = (tokenIndex: number) => {
    setQuestionOptions(questionOptions.filter((_, index) => index !== tokenIndex))
  }

  const handleTokenReset = () => {
    setQuestionOptions([])
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editorLocked) return

    e.preventDefault()

    setContextMenu(
      contextMenu === null
        ? {
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6,
          }
        : null
    )
  }

  const handleContextMenuClose = () => {
    setContextMenu(null)
  }

  const handleTopicsCovered = (e: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = e
    setTopicsCovered(typeof value === 'string' ? value.split(',') : value)
  }

  const handleDistractorTokenInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDistractorToken(e.target.value)
  }

  useEffect(() => {
    if (questionID && Array.isArray(questionOptions) && questionOptions.length > 0) {
      if (typeof questionOptions[0] === 'object' && questionOptions[0].text) {
      } else if (typeof questionOptions[0] === 'string') {
        const tokenObjects = questionOptions.map(token => ({
          text: token,
          position: [-1, -1], // We don't know the original positions
          range: [],
          isDistractor: true, // Assume these are distractor tokens when loading from edit
        }))
        setQuestionOptions(tokenObjects)
      }
    }
  }, [questionID, questionOptions, setQuestionOptions])

  return (
    <>
      <TextField
        autoFocus
        required
        multiline
        rows={4}
        placeholder="Enter your question prompt"
        label="Question Prompt"
        variant="standard"
        value={questionPrompt}
        onChange={handleQuestionPromptInput}
        sx={{ width: '30rem', mb: 3 }}
      />

      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Code Snippet - {editorLocked ? 'Locked (Ready for token creation)' : 'Editable'}
        </Typography>
        <Box
          onContextMenu={handleContextMenu}
          sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
        >
          <CodeMirror
            value={questionSnippet}
            onChange={handleSnippetInput}
            height="300px"
            width="700px"
            extensions={[python(), EditorView.editable.of(!editorLocked)]}
            theme={oneDark}
            onUpdate={(viewUpdate: { view: EditorView }) => handleEditorLoad(viewUpdate.view)}
            onContextMenu={handleContextMenu}
          />

          <Tooltip title={editorLocked ? 'Unlock Editor' : 'Lock Editor for Token Creation'}>
            <IconButton onClick={() => setEditorLocked(!editorLocked)}>
              {editorLocked ? <Lock /> : <Unlock />}
            </IconButton>
          </Tooltip>

          {editorLocked && (
            <Menu
              open={contextMenu !== null}
              onClose={handleContextMenuClose}
              anchorReference="anchorPosition"
              anchorPosition={
                contextMenu !== null
                  ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                  : undefined
              }
            >
              <MenuItem onClick={handleTokenCreation}>Create Token</MenuItem>
            </Menu>
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Created Tokens
          </Typography>
          <Button
            startIcon={<Add />}
            onClick={() => setDistractorTokenDialogue(true)}
            variant="outlined"
            size="small"
            sx={{ mr: 1 }}
          >
            Add Distractor Token
          </Button>
          {questionOptions.length > 0 && (
            <Button color="error" onClick={handleTokenReset} variant="outlined" size="small">
              Clear All
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {questionOptions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No tokens created yet. Lock the editor and highlight text to create tokens.
            </Typography>
          ) : (
            questionOptions.map(({ text, isDistractor }, index) => (
              <Chip
                key={index}
                label={text}
                color={isDistractor ? 'secondary' : 'primary'}
                onDelete={() => handleRemoveToken(index)}
                deleteIcon={<Delete />}
                sx={{
                  py: 1,
                  height: 'auto',
                  '& .MuiChip-label': { display: 'block', whiteSpace: 'normal' },
                }}
              />
            ))
          )}
        </Box>
      </Box>

      <FormControl sx={{ width: '15em', mb: 3 }}>
        <InputLabel id="topics-covered">Topics Covered</InputLabel>
        <Select
          required
          labelId="topics-covered"
          label="Topics Covered"
          variant="outlined"
          multiple
          value={topicsCovered}
          onChange={handleTopicsCovered}
          renderValue={(selected: string[]) => selected.join(', ')}
          MenuProps={MenuProps}
        >
          {mockTopics.map((topic, index) => (
            <MenuItem key={index} value={topic}>
              <Checkbox checked={topicsCovered.includes(topic)} />
              {topic}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Dialog open={distractorTokenDialogue} onClose={() => setDistractorTokenDialogue(false)}>
        <DialogTitle>Add Distractor Token</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These tokens should serve as misdirection for the student. They should be similar to the
            correct answer, but not quite. The purpose of these tokens is to make the question more
            challenging for the student and to test their understanding of the material.
          </Typography>
          <TextField
            autoFocus
            required
            multiline
            rows={2}
            placeholder="Enter your distractor token"
            label="Distractor Token"
            variant="outlined"
            fullWidth
            value={distractorToken}
            onChange={handleDistractorTokenInput}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDistractorTokenDialogue(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddDistractorToken}
            disabled={!distractorToken.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default RearrangeQuestion
