import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error logging out:', error)
  }

  return NextResponse.redirect(new URL('/', request.nextUrl.origin))
}
