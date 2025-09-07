import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { createToken, setAuthCookie } from '@/lib/auth/jwt'
import { eq } from 'drizzle-orm'
import { withApiHandler } from '@/lib/middleware/api-handler'
import { ValidationError, UnauthorizedError } from '@/lib/errors/api-error'

export const POST = withApiHandler(async (request: NextRequest) => {
  const { email, password } = await request.json()

  if (!email || !password) {
    throw new ValidationError('Email and password are required')
  }

  const user = await db.select().from(users).where(eq(users.email, email)).get()

  // Always verify password to prevent timing attacks
  const dummyHash = '$2a$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890'
  const passwordToCheck = user ? user.passwordHash : dummyHash
  const isValidPassword = await verifyPassword(password, passwordToCheck)

  if (!user || !isValidPassword) {
    throw new UnauthorizedError('Invalid credentials')
  }

  const token = await createToken(user)
  await setAuthCookie(token)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
  })
})