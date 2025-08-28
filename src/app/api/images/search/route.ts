import { NextRequest, NextResponse } from 'next/server'
import { unsplashService } from '@/lib/api/unsplash'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(30).default(20),
  orientation: z.enum(['landscape', 'portrait', 'squarish']).optional(),
  color: z.string().optional(),
  orderBy: z.enum(['relevant', 'latest', 'oldest', 'popular']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const params = searchSchema.parse(searchParams)
    
    const results = await unsplashService.searchImages(params)
    
    return NextResponse.json(results)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Image search error:', error)
    return NextResponse.json(
      { error: 'Failed to search images' },
      { status: 500 }
    )
  }
}