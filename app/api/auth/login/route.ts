import { NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth/password'
import { createToken, setAuthCookie } from '@/lib/auth/jwt'
import { withApiHandler, getJsonBody, ApiContextOptionalAuth } from '@/lib/middleware/api-wrapper'
import { userRepository } from '@/lib/repositories'

export const POST = withApiHandler(async ({ request }: ApiContextOptionalAuth) => {
  const { email, password } = await getJsonBody(request)

  if (!email || !password) {
    throw new Error('bad request: Email and password are required')
  }

  const user = await userRepository.findByEmail(email)

  // Always verify password to prevent timing attacks
  const dummyHash = '$2a$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890'
  if (!user?.passwordHash) {
    throw new Error('unauthorized: Invalid credentials')
  }

  const passwordToCheck = user.passwordHash || dummyHash
  const isValidPassword = await verifyPassword(password, passwordToCheck)

  if (!user || !isValidPassword) {
    throw new Error('unauthorized: Invalid credentials')
  }

  const token = await createToken(user)
  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
  })
  
  await setAuthCookie(token)
  return response
}, { requireAuth: false })