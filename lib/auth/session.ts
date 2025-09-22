import crypto from 'crypto'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db, authSessions, users } from '@/lib/db'
import type { User } from '@/lib/db'
import { getAuthConfig, OAUTH_STATE_COOKIE_MAX_AGE } from './config'
import type { GoogleTokens } from './googleOAuth'

const SESSION_COOKIE_NAME = 'oblivian-session'
const OAUTH_STATE_COOKIE_NAME = 'google-oauth-state'

interface OAuthStatePayload {
  state: string
  codeVerifier: string
  returnUrl?: string
}

interface SessionRecord {
  sessionId: string
  sessionTokenHash: string
  user: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl'>
  expiresAt: Date
  googleAccessTokenEnc: string | null
  googleRefreshTokenEnc: string | null
  googleIdTokenEnc: string | null
  googleTokenExpiresAt: Date | null
}

export interface ActiveSession {
  sessionId: string
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
  }
  expiresAt: Date
  googleTokens: {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    tokenExpiresAt?: Date | null
  }
}

export async function createOAuthStateCookie(payload: OAuthStatePayload) {
  const config = getAuthConfig()
  const secret = new TextEncoder().encode(config.sessionSecret!)

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_STATE_COOKIE_MAX_AGE}s`)
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE,
  })
}

export async function readOAuthStateCookie(): Promise<OAuthStatePayload | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value
  if (!value) return null

  const config = getAuthConfig()
  const secret = new TextEncoder().encode(config.sessionSecret!)

  try {
    const { payload } = await jwtVerify(value, secret)
    return payload as OAuthStatePayload
  } catch (error) {
    console.error('Failed to verify OAuth state cookie', error)
    return null
  }
}

export async function clearOAuthStateCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME)
}

export async function establishUserSession(userId: string, tokens: GoogleTokens) {
  const { sessionToken, expiresAt } = await createSessionRecord(userId, tokens)
  await setSessionCookie(sessionToken, expiresAt)
  return { sessionToken, expiresAt }
}

export async function getCurrentSession(): Promise<ActiveSession | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!sessionToken) {
    return null
  }

  const tokenHash = hashToken(sessionToken)
  const record = await findSessionByHash(tokenHash)

  if (!record) {
    await clearSessionCookie()
    return null
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    await deleteSessionById(record.sessionId)
    await clearSessionCookie()
    return null
  }

  await touchSession(record.sessionId)

  return {
    sessionId: record.sessionId,
    user: {
      id: record.user.id,
      email: record.user.email,
      name: record.user.name ?? null,
      avatarUrl: record.user.avatarUrl ?? null,
    },
    expiresAt: record.expiresAt,
    googleTokens: {
      accessToken: decryptNullable(record.googleAccessTokenEnc),
      refreshToken: decryptNullable(record.googleRefreshTokenEnc),
      idToken: decryptNullable(record.googleIdTokenEnc),
      tokenExpiresAt: record.googleTokenExpiresAt,
    },
  }
}

export async function destroyCurrentSession(): Promise<ActiveSession | null> {
  const session = await getCurrentSession()
  if (!session) {
    return null
  }

  await deleteSessionById(session.sessionId)
  await clearSessionCookie()
  return session
}

async function createSessionRecord(userId: string, tokens: GoogleTokens) {
  const config = getAuthConfig()
  const sessionToken = generateSessionToken()
  const tokenHash = hashToken(sessionToken)
  const expiresAt = new Date(Date.now() + config.sessionDuration * 1000)
  const googleTokenExpiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000)
    : null

  await db.insert(authSessions).values({
    userId,
    sessionTokenHash: tokenHash,
    expiresAt,
    googleAccessTokenEnc: tokens.accessToken ? encrypt(tokens.accessToken) : null,
    googleRefreshTokenEnc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    googleIdTokenEnc: tokens.idToken ? encrypt(tokens.idToken) : null,
    googleTokenExpiresAt,
  })

  return { sessionToken, expiresAt }
}

async function findSessionByHash(tokenHash: string): Promise<SessionRecord | null> {
  const [record] = await db
    .select({
      sessionId: authSessions.id,
      sessionTokenHash: authSessions.sessionTokenHash,
      expiresAt: authSessions.expiresAt,
      googleAccessTokenEnc: authSessions.googleAccessTokenEnc,
      googleRefreshTokenEnc: authSessions.googleRefreshTokenEnc,
      googleIdTokenEnc: authSessions.googleIdTokenEnc,
      googleTokenExpiresAt: authSessions.googleTokenExpiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(eq(authSessions.sessionTokenHash, tokenHash))

  if (!record) {
    return null
  }

  return {
    sessionId: record.sessionId,
    sessionTokenHash: record.sessionTokenHash,
    expiresAt: record.expiresAt,
    googleAccessTokenEnc: record.googleAccessTokenEnc,
    googleRefreshTokenEnc: record.googleRefreshTokenEnc,
    googleIdTokenEnc: record.googleIdTokenEnc,
    googleTokenExpiresAt: record.googleTokenExpiresAt,
    user: {
      id: record.userId,
      email: record.email,
      name: record.name,
      avatarUrl: record.avatarUrl,
    },
  }
}

async function deleteSessionById(sessionId: string) {
  await db.delete(authSessions).where(eq(authSessions.id, sessionId))
}

async function touchSession(sessionId: string) {
  await db
    .update(authSessions)
    .set({ updatedAt: new Date() })
    .where(eq(authSessions.id, sessionId))
}

async function setSessionCookie(sessionToken: string, expiresAt: Date) {
  const cookieStore = await cookies()
  const config = getAuthConfig()

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionDuration,
    expires: expiresAt,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

function generateSessionToken() {
  return base64UrlEncode(crypto.randomBytes(32))
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function encrypt(value: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return base64UrlEncode(Buffer.concat([iv, tag, encrypted]))
}

function decryptNullable(value: string | null): string | undefined {
  if (!value) return undefined
  return decrypt(value)
}

function decrypt(value: string): string {
  const key = getEncryptionKey()
  const data = base64UrlDecode(value)
  const iv = data.subarray(0, 12)
  const tag = data.subarray(12, 28)
  const encrypted = data.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

function getEncryptionKey() {
  const config = getAuthConfig()
  const secret = config.sessionSecret!
  return crypto.createHash('sha256').update(secret).digest()
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(value: string): Buffer {
  let str = value.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) {
    str += '='
  }
  return Buffer.from(str, 'base64')
}
