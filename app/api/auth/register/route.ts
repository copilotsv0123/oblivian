import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth/password'
import { createToken, setAuthCookie } from '@/lib/auth/jwt'
import { withApiHandler, getJsonBody, ApiContextOptionalAuth } from '@/lib/middleware/api-wrapper'
import { userRepository } from '@/lib/repositories'

export const POST = withApiHandler(async ({ request }: ApiContextOptionalAuth) => {
  const { email, password } = await getJsonBody(request)

  if (!email || !password) {
    throw new Error('bad request: Email and password are required')
  }

  if (password.length < 8) {
    throw new Error('bad request: Password must be at least 8 characters')
  }

  const existingUser = await userRepository.findByEmail(email)
  
  if (existingUser) {
    throw new Error('bad request: User already exists')
  }

  const passwordHash = await hashPassword(password)
  
  const result = await userRepository.create({
    email,
    passwordHash,
  })

  const newUser = result.data

  const token = await createToken(newUser)
  const response = NextResponse.json({
    user: {
      id: newUser.id,
      email: newUser.email,
    },
  })
  
  await setAuthCookie(token)
  return response
}, { requireAuth: false })