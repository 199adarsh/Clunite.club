"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useRouter } from 'next/navigation'
import { getAvatarUrlByGender } from './avatar-utils'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, college: string, branch?: string, gender?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const initializedRef = useRef(false)

  // Ensure user exists in database without blocking UI
  const ensureUserInDatabase = useCallback(async (authUser: User, additionalData?: { college?: string, branch?: string, gender?: string }) => {
    try {
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle()

      // User exists, no need to create
      if (existingUser) {
        return { success: true }
      }

      // If other DB error than PGRST116 (no rows)
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking user:', checkError)
        return { success: false, error: checkError }
      }

      // User doesn't exist, create record
      const userGender = additionalData?.gender || authUser.user_metadata?.gender || null
      const avatarUrl = authUser.user_metadata?.avatar_url || getAvatarUrlByGender(userGender)

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email || 'unknown@example.com',
          full_name: authUser.user_metadata?.full_name || 
                     authUser.user_metadata?.name ||
                     authUser.email?.split('@')[0] || 
                     'User',
          role: 'student',
          college: additionalData?.college || 
                   authUser.user_metadata?.college || 
                   'Not specified',
          branch: additionalData?.branch || 
                  authUser.user_metadata?.branch || 
                  null,
          gender: userGender,
          avatar_url: avatarUrl,
          bio: null
        })

      if (insertError) {
        console.error('Failed to create user in database:', insertError)
        return { success: false, error: insertError }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in ensureUserInDatabase:', error)
      return { success: false, error }
    }
  }, [])

  // Sign up new user
  const signUp = async (email: string, password: string, fullName: string, college: string, branch?: string, gender?: string) => {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            college: college,
            branch: branch || null,
            gender: gender || null
          }
        }
      })

      if (signUpError) {
        return { error: signUpError }
      }

      if (data.user) {
        // Create user in database
        const result = await ensureUserInDatabase(data.user, { college, branch, gender })
        if (!result.success) {
          return { error: result.error }
        }
      }

      return { error: null }
    } catch (error: any) {
      console.error('Signup error:', error)
      return { error }
    }
  }

  // Sign in existing user
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        return { error: signInError }
      }

      if (data.user) {
        // Run database syncing in background
        setTimeout(async () => {
          try {
            const { data: dbUser } = await supabase
              .from('users')
              .select('gender, avatar_url')
              .eq('id', data.user.id)
              .maybeSingle()

            if (dbUser?.gender && !dbUser.avatar_url) {
              const genderBasedAvatar = getAvatarUrlByGender(dbUser.gender)
              if (genderBasedAvatar) {
                await supabase
                  .from('users')
                  .update({ avatar_url: genderBasedAvatar })
                  .eq('id', data.user.id)
              }
            }
            await ensureUserInDatabase(data.user)
          } catch (err) {
            console.error('Background user sync failed:', err)
          }
        }, 0)
      }

      return { error: null }
    } catch (error: any) {
      console.error('Sign in error:', error)
      return { error }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Listen to auth state changes and initial session
  useEffect(() => {
    let isMounted = true

    // Safety timeout: Ensure loading is ALWAYS set to false after at most 2.5s
    const timeoutId = setTimeout(() => {
      if (isMounted && !initializedRef.current) {
        console.warn('Auth check timeout reached, unlocking loading state')
        initializedRef.current = true
        setLoading(false)
      }
    }, 2500)

    // Initial session retrieval
    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!isMounted) return
        initializedRef.current = true
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        setLoading(false)

        if (initialSession?.user) {
          ensureUserInDatabase(initialSession.user)
        }
      })
      .catch((err) => {
        console.error('Initial getSession error:', err)
        if (isMounted) {
          initializedRef.current = true
          setLoading(false)
        }
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, currentSession: Session | null) => {
        if (!isMounted) return
        console.log('Auth state changed:', event)
        initializedRef.current = true
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && currentSession?.user) {
          ensureUserInDatabase(currentSession.user)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [ensureUserInDatabase])

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

