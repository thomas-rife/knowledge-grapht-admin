'use client'

import { Button } from '@mui/material'
import { useRouter } from 'next/navigation'
const Unauthorized = () => {
  const router = useRouter()
  return (
    <div>
      <h1>Unauthorized</h1>
      <Button variant="contained" onClick={() => router.push('/classes')}>
        Return Home
      </Button>
    </div>
  )
}

export default Unauthorized
