'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid2 as Grid,
  Avatar,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  Menu,
  Button,
  Skeleton,
  Paper,
} from '@mui/material'
import {
  PersonRemove,
  Search,
  ViewModule,
  ViewList,
  Sort as SortIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
  PeopleOutline,
} from '@mui/icons-material'
import RosterSkeleton from '@/components/skeletons/roster-skeleton'
import { enrolledStudents } from './actions'

const STUDENTS_PER_PAGE = 12
const LIST_VIEW_ITEMS_PER_PAGE = 20

interface Student {
  student_id: string
  student_name: string
}

interface SortConfig {
  field: 'student_name'
  direction: 'asc' | 'desc'
}

const ClassRoster = ({ params }: { params: { className: string } }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'student_name',
    direction: 'asc',
  })
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    const fetchStudents = async () => {
      const response = await enrolledStudents(params.className)

      if (response.success && response.students) {
        setStudents(response.students)
        setLoading(false)
      } else if (response.error) {
        console.error('Error fetching students:', response.error)
        setLoading(false)
      }
    }
    fetchStudents()
  }, [params.className])

  const handleRemoveStudent = (studentId: string) => {
    alert('Remove student functionality needs to be implemented')
  }

  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget)
  }

  const handleSortMenuClose = () => {
    setSortAnchorEl(null)
  }

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
    handleSortMenuClose()
  }

  const getSortedAndFilteredStudents = () => {
    return students
      .filter(student => student.student_name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const direction = sortConfig.direction === 'asc' ? 1 : -1
        return a.student_name.localeCompare(b.student_name) * direction
      })
  }

  const sortedAndFilteredStudents = getSortedAndFilteredStudents()
  const itemsPerPage = viewMode === 'grid' ? STUDENTS_PER_PAGE : LIST_VIEW_ITEMS_PER_PAGE
  const pageCount = Math.ceil(sortedAndFilteredStudents.length / itemsPerPage)
  const displayedStudents = sortedAndFilteredStudents.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Class Roster - {decodeURIComponent(params.className)}
          </Typography>
        </Box>
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={56} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Skeleton variant="rectangular" width={120} height={32} />
                <Skeleton variant="rectangular" width={100} height={32} />
              </Box>
            </Grid>
          </Grid>
        </Box>
        <RosterSkeleton viewMode={viewMode} itemsPerPage={itemsPerPage} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Class Roster - {decodeURIComponent(params.className)}
        </Typography>
      </Box>

      {/* 
      TODO: make this section stikcy when scrolling down
      Controls Section */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Search students..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Chip label={`Total Students: ${students.length}`} color="primary" variant="outlined" />
            <Button
              startIcon={<SortIcon />}
              endIcon={sortConfig.direction === 'asc' ? <AscIcon /> : <DescIcon />}
              onClick={handleSortMenuOpen}
              variant="outlined"
              size="small"
            >
              Sort by name
            </Button>
            <Menu
              anchorEl={sortAnchorEl}
              open={Boolean(sortAnchorEl)}
              onClose={handleSortMenuClose}
            >
              <MenuItem onClick={() => handleSort('student_name')}>Name</MenuItem>
            </Menu>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) {
                  setViewMode(newValue)
                  setPage(1)
                }
              }}
              size="small"
            >
              <ToggleButton value="grid" aria-label="grid view">
                <ViewModule />
              </ToggleButton>
              <ToggleButton value="list" aria-label="list view">
                <ViewList />
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Box>

      {/* Empty State */}
      {sortedAndFilteredStudents.length === 0 && (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: theme => (theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50'),
          }}
        >
          <PeopleOutline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          {searchTerm ? (
            <>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No students found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                No students match your search criteria. Try adjusting your search terms.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No students enrolled
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Students will appear here once they are enrolled in this class.
              </Typography>
            </>
          )}
        </Paper>
      )}

      {/* Students Display */}
      {sortedAndFilteredStudents.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <Grid container spacing={3}>
              {displayedStudents.map(student => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={student.student_id}>
                  <Card
                    elevation={1}
                    sx={{
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        transition: 'transform 0.2s ease-in-out',
                        boxShadow: 3,
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                          sx={{
                            width: 56,
                            height: 56,
                            bgcolor: theme =>
                              theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                          }}
                        >
                          {student.student_name
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="h2">
                            {student.student_name}
                          </Typography>
                        </Box>
                        <Tooltip title="Remove student">
                          <IconButton
                            onClick={() => handleRemoveStudent(student.student_id)}
                            sx={{
                              '&:hover': {
                                color: 'error.main',
                              },
                            }}
                          >
                            <PersonRemove />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card elevation={1}>
              {displayedStudents.map((student, index) => (
                <Box key={student.student_id}>
                  {index > 0 && <Box sx={{ mx: 2, borderTop: 1, borderColor: 'divider' }} />}
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: theme =>
                            theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                        }}
                      >
                        {student.student_name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">{student.student_name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Tooltip title="Remove student">
                          <IconButton
                            onClick={() => handleRemoveStudent(student.student_id)}
                            size="small"
                            sx={{
                              '&:hover': {
                                color: 'error.main',
                              },
                            }}
                          >
                            <PersonRemove />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Box>
              ))}
            </Card>
          )}
        </>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  )
}

export default ClassRoster
