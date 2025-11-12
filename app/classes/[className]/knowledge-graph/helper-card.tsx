'use client'

import { Card, CardContent, IconButton, Tooltip, Typography, Box } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import HelpIcon from '@mui/icons-material/Help'
import { keyframes } from '@mui/material'
import { useState } from 'react'

const slideIn = keyframes`
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  `

const slideOut = keyframes`
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-100%);
    }
      `

const HelperCard = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false)

  const handleCardToggle = () => {
    if (isHelpOpen) {
      setIsHelpOpen(false)
      setTimeout(() => setIsVisible(false), 300) // Delay unmounting by 300ms to allow slideOut animation
    } else {
      setIsVisible(true)
      setIsHelpOpen(true) // Slight delay to ensure visibility state is updated
    }
  }

  return (
    <>
      {isVisible ? (
        <Card
          id="helper-card"
          sx={{
            animation: `${isHelpOpen ? slideIn : slideOut} 0.3s ease-in-out`,
            width: '20rem',
            position: 'relative',
            outline: '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: 2,
              '& #close-button': {
                position: 'absolute',
                right: 8,
                top: 8,
                padding: '4px',
              },
              '& ul': {
                padding: 0,
                paddingLeft: 2,
                margin: 0,
                '& li': {
                  marginBottom: 1,
                  '&:last-child': {
                    marginBottom: 0,
                  },
                },
              },
            }}
          >
            <IconButton id="close-button" onClick={handleCardToggle} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>

            <Box sx={{ width: '100%', mt: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  marginBottom: 2,
                  fontSize: '1.1rem',
                  color: 'primary.main',
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  paddingBottom: 0.5,
                }}
              >
                Using the Knowledge Graph
              </Typography>

              <Typography component="div" sx={{ marginBottom: 2 }}>
                <ul>
                  <li>
                    Create nodes: Click + button or drag from a node handle to create a connected
                    node
                  </li>
                  <li>Edit nodes: Click a node and select edit</li>
                  <li>Move nodes: Click and drag to reposition</li>
                  <li>Delete nodes: Click node and press backspace</li>
                  <li>Delete edges: Click edge and press backspace</li>
                </ul>
              </Typography>

              <Typography
                sx={{
                  fontSize: '0.9rem',
                  color: 'text.secondary',
                  backgroundColor: 'action.hover',
                  padding: 1.5,
                  borderRadius: 1,
                  borderLeft: '4px solid',
                  borderColor: 'warning.main',
                }}
              >
                Note: Avoid creating duplicate nodes or cycles between nodes
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Tooltip title="Help" arrow placement="right">
          <IconButton
            onClick={handleCardToggle}
            sx={{
              '&:hover': {
                backgroundColor: 'background.paper',
                transform: 'scale(1.1)',
              },
              transition: 'transform 0.2s',
            }}
          >
            <HelpIcon id="help-button" color="info" fontSize="large" />
          </IconButton>
        </Tooltip>
      )}
    </>
  )
}

export default HelperCard
