# Supabase Email Authentication in Next.js (App Router)

This comprehensive guide provides everything you need to set up, secure, and handle **Email Login/Signup** inside a Next.js 14+ application using the official `@supabase/ssr` package.

---

## 1. Prerequisites & Installation

Run the following command inside your Next.js project to install Supabase packages:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Add these values to your Next.js `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anonymous-key"
# Used for authentication callbacks redirections
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## 2. Supabase Client Configuration

To support Server Components, Client Components, and Middleware, we configure dedicated clients under `@/utils/supabase/`:

### A. Client Component Helper (`/utils/supabase/client.ts`)
Creates a client safe for use inside `'use client'` React components.

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

### B. Server Component Helper (`/utils/supabase/server.ts`)
Creates a client for React Server Components (RSC), Server Actions, and Route Handlers. It automatically handles cookie storage.

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
```

---

### C. Middleware Session Refresher (`/utils/supabase/middleware.ts`)
Refreshes expired cookies before they reach Server Components, ensuring correct session tracking.

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  // IMPORTANT: Do NOT skip calling getUser(). This refreshes the token.
  await supabase.auth.getUser()

  return supabaseResponse
}
```

---

### D. Next.js Middleware (`/middleware.ts`)
Apply updates to sessions on matches.

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except those starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, audio, static public media files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 3. Email Authentication Actions (`/app/login/actions.ts`)

These are **Next.js Server Actions** to securely handle login and registration server-side, protecting user credentials from client exposures.

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  return redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  return redirect('/login?message=Check your email to confirm registration!')
}

export async function signout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  return redirect('/')
}
```

---

## 4. Auth Callback Route Handler (`/app/auth/callback/route.ts`)

Handles exchange of email confirmation challenge codes for durable cookie authentication sessions.

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect to error screen if exchange codes are stale or modified
  return NextResponse.redirect(`${origin}/login?error=Invalid verification link`)
}
```

---

## 5. Protected UI Routing Examples

### Server-Side Protection Route (`/app/dashboard/page.tsx`)
Because this runs inside Next.js Server Components, token checks and layout locks are completed *before* rendering any bits to the client browser!

```typescript
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '../login/actions'

export default async function DashboardPage() {
  const supabase = createClient()
  
  // Read current validated user profile data
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return (
    <main className="max-w-4xl mx-auto py-12 px-6">
      <div className="bg-white rounded-2xl border p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          User Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome to your secure acoustic audio space.
        </p>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border font-mono text-xs">
          <div>Logged in email: {user.email}</div>
          <div className="mt-1">User UUID: {user.id}</div>
          <div className="mt-1">Last sign-in: {user.last_sign_in_at}</div>
        </div>

        <form action={signout} className="mt-6">
          <button className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
            Disconnect Session
          </button>
        </form>
      </div>
    </main>
  )
}
```

### Client-Side Dynamic Check Hook (`/hooks/useUserSession.ts`)
Provides current dynamic tracking for stateful React client widgets:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../utils/supabase/client'
import { User } from '@supabase/supabase-js'

export function useUserSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getSession()

    // Listen to real-time authentication events (login, state updates, signout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
```
