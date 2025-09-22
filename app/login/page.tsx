'use client'

import { Suspense, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthButton } from '@/components/auth/AuthButton'
import { useAuth } from '@/components/auth/AuthProvider'

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()

  const returnUrl = useMemo(() => {
    const url = searchParams.get('returnUrl')
    if (!url || !url.startsWith('/')) {
      return '/dashboard'
    }
    return url
  }, [searchParams])

  const errorMessage = searchParams.get('error')

  useEffect(() => {
    if (!loading && user) {
      router.replace(returnUrl)
    }
  }, [loading, user, router, returnUrl])

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-md w-full space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-primary mb-2">Welcome Back</h1>
          <p className="text-gray-600">Use your Google account to continue.</p>
        </div>
        {errorMessage && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {decodeURIComponent(errorMessage)}
          </div>
        )}
        <AuthButton loginLabel="Continue with Google" logoutLabel="Sign out" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="card max-w-md w-full">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
