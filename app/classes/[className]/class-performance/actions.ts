'use server'

import { createClient } from '@/utils/supabase/server'

export const determineReviewTopics = async () => {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Session is null')
  }

  const { access_token, refresh_token } = session

  const response = await fetch('http://127.0.0.1:5000/knowledge-graph/9', {
    headers: {
      Authorization: `Bearer ${access_token}`,
      'X-Refresh-Token': refresh_token,
    },
  })

  const data = await response.json()
  return data
}
