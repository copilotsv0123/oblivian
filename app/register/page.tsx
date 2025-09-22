'use client'

import { Suspense, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthButton } from '@/components/auth/AuthButton'
import { useAuth } from '@/components/auth/AuthProvider'

function RegisterContent() {
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

  useEffect(() => {
    if (!loading && user) {
      router.replace(returnUrl)
    }
  }, [loading, user, router, returnUrl])

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-md w-full space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-primary mb-2">Join Oblivian</h1>
          <p className="text-gray-600">Create your account in seconds with Google.</p>
        </div>
        <AuthButton loginLabel="Sign up with Google" logoutLabel="Sign out" />
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="card max-w-md w-full">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
