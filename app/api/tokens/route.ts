import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { apiTokens } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

// GET /api/tokens - List user's tokens
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tokens = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        createdAt: apiTokens.createdAt,
        lastUsedAt: apiTokens.lastUsedAt,
        expiresAt: apiTokens.expiresAt,
        // Don't return the actual token for security
        tokenPreview: apiTokens.token,
      })
      .from(apiTokens)
      .where(eq(apiTokens.userId, user.id))
      .all()

    // Show only first 8 and last 4 characters of token
    const tokensWithPreview = tokens.map(token => ({
      ...token,
      tokenPreview: token.tokenPreview ? 
        `${token.tokenPreview.slice(0, 8)}...${token.tokenPreview.slice(-4)}` : 
        null
    }))

    return NextResponse.json({ tokens: tokensWithPreview })
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
  }
}

// POST /api/tokens - Create a new token
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, expiresInDays } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Token name is required' }, { status: 400 })
    }

    // Generate a secure random token
    const tokenValue = `obl_${crypto.randomBytes(32).toString('base64url')}`
    
    // Calculate expiration date if provided
    let expiresAt = null
    if (expiresInDays && typeof expiresInDays === 'number') {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    const [newToken] = await db
      .insert(apiTokens)
      .values({
        userId: user.id,
        name,
        token: tokenValue,
        expiresAt,
      })
      .returning()

    // Return the full token only on creation
    return NextResponse.json({
      token: {
        id: newToken.id,
        name: newToken.name,
        token: newToken.token, // Full token shown only once
        createdAt: newToken.createdAt,
        expiresAt: newToken.expiresAt,
      },
      message: 'Save this token securely. You won\'t be able to see it again.',
    })
  } catch (error) {
    console.error('Error creating token:', error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}

// DELETE /api/tokens - Delete a token
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('id')

    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 })
    }

    // Delete only if it belongs to the user
    await db
      .delete(apiTokens)
      .where(
        and(
          eq(apiTokens.id, tokenId),
          eq(apiTokens.userId, user.id)
        )
      )

    return NextResponse.json({ message: 'Token deleted successfully' })
  } catch (error) {
    console.error('Error deleting token:', error)
    return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 })
  }
}