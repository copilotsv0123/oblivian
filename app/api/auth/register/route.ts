import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { createToken, setAuthCookie } from '@/lib/auth/jwt'
import { eq } from 'drizzle-orm'
import { withApiHandler } from '@/lib/middleware/api-handler'
import { ValidationError, ConflictError } from '@/lib/errors/api-error'

export const POST = withApiHandler(async (request: NextRequest) => {
  const { email, password } = await request.json()

  if (!email || !password) {
    throw new ValidationError('Email and password are required')
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters')
  }

  const existingUser = await db.select().from(users).where(eq(users.email, email)).get()
  
  if (existingUser) {
    throw new ConflictError('User already exists')
  }

  const passwordHash = await hashPassword(password)
  
  const [newUser] = await db.insert(users).values({
    email,
    passwordHash,
  }).returning()

  const token = await createToken(newUser)
  await setAuthCookie(token)

  return NextResponse.json({
    user: {
      id: newUser.id,
      email: newUser.email,
    },
  })
})