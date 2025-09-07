import { NextRequest, NextResponse } from 'next/server'
import { getTopRankedDecks, updateDeckRankings } from '@/lib/rankings/service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const window = (searchParams.get('window') || 'd7') as 'd7' | 'd30'
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    
    // Get top ranked decks
    const rankings = await getTopRankedDecks(window, limit)
    
    return NextResponse.json({
      window,
      rankings,
      count: rankings.length,
    })
  } catch (error) {
    console.error('Error fetching rankings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint could be called by a cron job to update rankings
    // For now, we'll allow manual triggering (in production, add auth)
    
    await updateDeckRankings()
    
    return NextResponse.json({
      success: true,
      message: 'Rankings updated successfully',
    })
  } catch (error) {
    console.error('Error updating rankings:', error)
    return NextResponse.json(
      { error: 'Failed to update rankings' },
      { status: 500 }
    )
  }
}