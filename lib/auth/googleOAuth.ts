import crypto from 'crypto'
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'
import { getAuthConfig, OAUTH_SCOPES } from './config'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'

const GOOGLE_JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL))

export interface GoogleAuthUrl {
  url: string
  state: string
  codeVerifier: string
}

export interface GoogleTokens {
  accessToken: string
  refreshToken?: string
  idToken: string
  scope?: string
  tokenType: string
  expiresIn: number
}

export interface GoogleUserProfile {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
}

export async function generateGoogleAuthUrl(): Promise<GoogleAuthUrl> {
  const config = getAuthConfig()
  if (!config.enabled) {
    throw new Error('Google authentication is not enabled')
  }

  const state = base64UrlEncode(crypto.randomBytes(16))
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32))
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.googleClientId!,
    redirect_uri: config.googleRedirectUri!,
    scope: OAUTH_SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })

  return {
    url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    state,
    codeVerifier,
  }
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<GoogleTokens> {
  const config = getAuthConfig()
  if (!config.enabled) {
    throw new Error('Google authentication is not enabled')
  }

  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId!,
    client_secret: config.googleClientSecret!,
    redirect_uri: config.googleRedirectUri!,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Failed to exchange code for tokens: ${data.error_description || data.error || 'Unknown error'}`)
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    scope: data.scope,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
  }
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Google user info: ${response.statusText}`)
  }

  const profile = await response.json()
  return profile as GoogleUserProfile
}

export async function verifyIdToken(idToken: string): Promise<JWTPayload & GoogleUserProfile> {
  const config = getAuthConfig()
  if (!config.enabled) {
    throw new Error('Google authentication is not enabled')
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: config.googleClientId!,
  })

  return payload as JWTPayload & GoogleUserProfile
}

export async function revokeGoogleTokens(token: string): Promise<void> {
  const response = await fetch(GOOGLE_REVOKE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ token }),
  })

  if (!response.ok && response.status !== 400) {
    const error = await response.text()
    throw new Error(`Failed to revoke Google token: ${error}`)
  }
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sha256(message: string): Promise<Buffer> {
  return crypto.createHash('sha256').update(message).digest()
}
