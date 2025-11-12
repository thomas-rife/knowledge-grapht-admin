import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/supabase'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // FOR API TESTING PURPOSES ONLY
  if (request.nextUrl.pathname === '/student_api/auth/login') {
    // console.log('API WAS CALLED FROM MOBILE APP\n')
    // console.log('url', request.nextUrl.pathname)
    return NextResponse.next()
  }

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const studentRoute = request.nextUrl.pathname === '/student'

  if (!user && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone()

    // no user and they wants to register
    const registerURL = request.nextUrl.pathname === '/register'
    if (registerURL) {
      return NextResponse.next()
    }

    // no user and they wants to login
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  // user signed in, but they want to go to login or register page
  else if (user && (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = studentRoute ? '/student' : '/classes'
    return NextResponse.redirect(url)
  } else if (user && studentRoute) {
    // user is a professor and they want to go to a student page
    const { data: studentData } = await supabase
      .from('students')
      .select('student_id')
      .eq('student_id', user.id)
      .single()

    if (!studentData) {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
