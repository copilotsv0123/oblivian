import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { User } from '@/lib/db'
import { getConfig } from '@/lib/config/env'

function getJWTSecret() {
  const config = getConfig()
  return new TextEncoder().encode(config.JWT_SECRET)
}

export async function createToken(user: Pick<User, 'id' | 'email'>) {
  const secret = getJWTSecret()
  
  const token = await new SignJWT({ 
    id: user.id, 
    email: user.email 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  return token
}

export async function verifyToken(token: string) {
  try {
    const secret = getJWTSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload as { id: string; email: string }
  } catch (error) {
    return null
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  const config = getConfig()
  
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function getAuthToken() {
  const cookieStore = await cookies()
  return cookieStore.get('auth-token')?.value
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

export async function getCurrentUser() {
  const token = await getAuthToken()
  if (!token) return null
  
  return verifyToken(token)
}