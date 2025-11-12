'use client'

import {
  type SelectChangeEvent,
  Box,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Checkbox,
} from '@mui/material'
import { RemoveCircleOutline as RemoveIcon } from '@mui/icons-material'
import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { python } from '@codemirror/lang-python'
import { useQuestionContext } from '@/contexts/question-context'
import { getLessonTopics } from '@/app/classes/[className]/lessons/actions'
import { useParams } from 'next/navigation'

// const mockTopics = ['topic 1', 'topic 2', 'topic 3', 'topic 4', 'topic 5', 'topic 6', 'topic 7']

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

const getOptionValues = (opts: Array<Record<string, string>>) =>
  opts.map(o => String(Object.values(o)[0] ?? ''))

// Top of component body, once

const convertToObject = (values: string[]) => {
  return values.reduce((acc: Record<string, string>, option, index) => {
    acc[`option${index + 1}`] = option
    return acc
  }, {})
}

const MultipleChoiceQuestion = () => {
  const editorRef = useRef<EditorView | null>(null)

  const [snippetIncluded, setSnippetIncluded] = useState(false)
  const [questionTopics, setQuestionTopics] = useState<string[]>([])
  const {
    questionPrompt,
    setQuestionPrompt,
    questionType,
    setQuestionType,
    questionSnippet,
    setQuestionSnippet,
    questionOptions,
    setQuestionOptions,
    correctAnswer,
    setCorrectAnswer,
    topicsCovered,
    setTopicsCovered,
  } = useQuestionContext()
  const params = useParams() as { className?: string; lessonName?: string }

  const handleEditorLoad = (view: EditorView) => {
    editorRef.current = view
  }

  const handleQuestionPromptInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestionPrompt(e.target.value)
  }

  const handleSnippetInput = (value: string) => {
    setQuestionSnippet(value)
  }

  const showSnippet = () => {
    setSnippetIncluded(true)
  }

  const hideSnippet = () => {
    setQuestionSnippet('')
    setSnippetIncluded(false)
  }

  const handleOptionInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // TODO: convert this to be a list of objects and update it accordingly
    // setQuestionOptions({ ...questionOptions, [name]: value })

    const inputToUpdate = questionOptions.find(option => Object.keys(option)[0] === name)
    const index = questionOptions.indexOf(inputToUpdate)
    const updatedOptions = [...questionOptions]
    updatedOptions[index] = { [name]: value }
    setQuestionOptions(updatedOptions)
  }

  const handleAddNewOption = () => {
    setQuestionOptions(prev => {
      return [...prev, { [`option${prev.length + 1}`]: '' }]
    })
  }

  const deleteQuestionOption = (key: string) => {
    const isKeyCorrectAnswer = questionOptions.some(option => Object.keys(option)[0] === key)

    const remappedOptions = questionOptions
      .filter(option => Object.keys(option)[0] !== key)
      .map((option, index) => ({ [`option${index + 1}`]: String(Object.values(option)[0] ?? '') }))

    const remappedValues = remappedOptions.map(o => String(Object.values(o)[0] ?? ''))
    const nextCorrect = isKeyCorrectAnswer
      ? ''
      : remappedValues.includes(correctAnswer)
      ? correctAnswer
      : ''

    setQuestionOptions(remappedOptions)
    setCorrectAnswer(nextCorrect)
  }

  const handleCorrectAnswerSelect = (e: SelectChangeEvent<string>) => {
    setCorrectAnswer(e.target.value)
  }

  const handleTopicsCovered = (e: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = e
    setTopicsCovered(typeof value === 'string' ? value.split(',') : value)
  }

  useEffect(() => {
    if (Array.isArray(questionOptions) && questionOptions.length > 0) {
      const looksLikeObject = typeof questionOptions[0] === 'object' && questionOptions[0] !== null
      const looksLikeString = typeof (questionOptions as any)[0] === 'string'

      if (looksLikeString) {
        // Convert ['A','B'] -> [{option1:'A'},{option2:'B'}]
        const asObjects = (questionOptions as unknown as string[]).map((val, idx) => ({
          [`option${idx + 1}`]: String(val ?? ''),
        }))
        setQuestionOptions(asObjects)
      } else if (looksLikeObject) {
        // Already objects; normalize keys to option1..N and ensure values are strings
        const asObjects = (questionOptions as any[]).map((opt, idx) => ({
          [`option${idx + 1}`]: String(Object.values(opt)[0] ?? ''),
        }))
        setQuestionOptions(asObjects)
      }
    } else {
      // Initialize with two empty options
      setQuestionOptions([{ option1: '' }, { option2: '' }])
    }
  }, [])

  useEffect(() => {
    const values = getOptionValues(questionOptions)
    if (!values.includes(correctAnswer)) {
      // Prefer first non-empty option, otherwise keep blank until user fixes
      const firstNonEmpty = values.find(v => v.trim().length > 0) || ''
      setCorrectAnswer(firstNonEmpty || '')
    }
  }, [questionOptions, correctAnswer])

  // after initializing options, pick first non-empty as default answer if none
  useEffect(() => {
    if (correctAnswer) return
    const initVals = getOptionValues(questionOptions)
    const firstNonEmpty = initVals.find(v => v.trim().length > 0)
    if (firstNonEmpty) setCorrectAnswer(firstNonEmpty)
  }, [questionOptions, correctAnswer])

  useEffect(() => {
    const fetchLessonTopics = async () => {
      try {
        const classParam = params?.className as string | undefined
        const cleanedClassName = classParam
          ? decodeURIComponent(classParam).replace(/-/g, ' ').trim()
          : undefined

        const response = await getLessonTopics(cleanedClassName ?? '')
        if (response?.success) {
          setQuestionTopics(response.topics ?? [])
        } else if (response && 'error' in response) {
          console.warn('getLessonTopics error:', response.error)
          setQuestionTopics([])
        }
      } catch (e) {
        console.error('fetchLessonTopics failed:', e)
        setQuestionTopics([])
      }
    }
    fetchLessonTopics()
  }, [params?.className])

  useEffect(() => {
    const values = getOptionValues(questionOptions)
    if (!values.includes(correctAnswer)) {
      // Prefer first non-empty option, otherwise keep blank until user fixes
      const firstNonEmpty = values.find(v => v.trim().length > 0) || ''
      setCorrectAnswer(firstNonEmpty || '')
    }
  }, [questionOptions])

  const optionValues = getOptionValues(questionOptions)
  const nonEmptyOptionValues = optionValues.filter(v => v.trim().length > 0)

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
        sx={{ width: '100%' }}
      />
      {snippetIncluded || questionSnippet !== '' ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            width: '100%',
            maxWidth: '100%',
          }}
        >
          {' '}
          <CodeMirror
            value={questionSnippet}
            onChange={handleSnippetInput}
            height="220px"
            width="500px"
            extensions={[python()]}
            theme={oneDark}
            onUpdate={(viewUpdate: { view: EditorView }) => handleEditorLoad(viewUpdate.view)}
          />
          <IconButton color="error" onClick={hideSnippet}>
            <RemoveIcon />
          </IconButton>
        </Box>
      ) : (
        <Button onClick={showSnippet}>Add Snippet</Button>
      )}

      <Box
        id="options"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 3,
          flexWrap: 'wrap',
          width: '50%',
        }}
      >
        {questionOptions.map((option, index) => {
          const optionKey = `option${index + 1}`
          return (
            <Box key={index}>
              <TextField
                required
                label={`Option ${index + 1}`}
                name={optionKey}
                variant="standard"
                value={option[optionKey]}
                onChange={handleOptionInput}
              />
              <IconButton
                disabled={Object.values(questionOptions).length === 2}
                color="error"
                onClick={() => deleteQuestionOption(optionKey)}
              >
                <RemoveIcon />
              </IconButton>
            </Box>
          )
        })}
      </Box>
      <Box id="add-new-option-button">
        <Button
          variant="contained"
          disabled={questionOptions.length === 10}
          onClick={handleAddNewOption}
        >
          Add Option
        </Button>
      </Box>
      <FormControl>
        <InputLabel id="correct-answer">Correct Answer</InputLabel>
        <Select
          required
          labelId="correct-answer"
          label="Correct Answer"
          variant="standard"
          value={optionValues.includes(correctAnswer) ? correctAnswer : ''}
          onChange={handleCorrectAnswerSelect}
          sx={{ width: '15em' }}
          disabled={nonEmptyOptionValues.length === 0}
        >
          {questionOptions.map((option, index) => {
            const val = String(option[`option${index + 1}`] ?? '')
            return (
              <MenuItem key={index} value={val} disabled={!val.trim()}>
                {val || '(empty)'}
              </MenuItem>
            )
          })}
        </Select>
      </FormControl>
      <FormControl>
        <InputLabel id="topics-covered">Topics Covered</InputLabel>
        <Select
          required
          label="topics-covered"
          variant="standard"
          multiple
          value={topicsCovered}
          onChange={handleTopicsCovered}
          renderValue={(selected: string[]) => selected.join(', ')}
          sx={{ width: '15em' }}
          MenuProps={MenuProps}
        >
          {questionTopics.map((topic, index) => (
            <MenuItem key={index} value={topic}>
              <Checkbox checked={topicsCovered.includes(topic)} />
              {topic}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  )
}

export default MultipleChoiceQuestion
